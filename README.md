# monosashi

実測に基づく kintone レコードの型・変換関数・型ガード。

> **物差し**。自分のコードを当てて確かめるための基準、という意味で名付けた。
> このパッケージはサイボウズ株式会社の公式なものではない。
> kintone はサイボウズ株式会社の登録商標。

`@kintone/dts-gen` の `kintone.d.ts` は `kintone.app.record.get()` も
`kintone.events.on()` のハンドラ引数も `any` で、レコード周りの型を提供していない。
`@kintone/rest-api-client` は REST API の型しか持たない。
そのため実務では JS API・`event.record`・REST API の3経路が混ざり、
境界のたびに `as` が必要になる。

このリポジトリはその3経路の実際の値を**測定した上で**型を書き、
境界の変換を関数として提供することを目的とする。

## 型の裏づけ

型は推測ではなく**実測**に基づく。
`fixtures/measured.json` に **82 サンプル / 67 文脈**あり、
e2e が実 kintone を操作して採り直せる。

- **フィールド種別 28 種**すべてに裏づけがある
  （`GROUP` と `REFERENCE_TABLE` は「レコードには現れない」ことを確かめた上で除外）
- **レコード系イベント 30 種すべて**に裏づけがある。
  作成 / 詳細 / 編集 / 一覧 / 印刷 / モバイル、
  `submit` / `change` / プロセス管理 / インライン編集 / 削除
- 2 回続けて採ると**バイト単位で同じ結果**になる。
  だから差分が出たら「kintone が変わった」と言える。週次で自動的に確かめている

### なぜ実測が要るのか

「PC と同形だろう」で書いていた型は、実際に測ると 5 つ外れた。

| 書いてあったこと | 実測 |
| --- | --- |
| モバイルの編集画面も `Saved` | **`Editing`**。値の無いフィールドが `undefined` |
| 一覧のインライン編集は編集画面と同形 | `recordId` が**文字列**。`submit` と `change` は `appId` まで文字列 |
| `process.proceed` は `appId` / `recordId` を持つ | **持たない**。`action` / `status` / `nextStatus` は `{ value: string }` |
| 削除は `record` を持たない | **持つ**（37 フィールドの `Saved` レコード） |
| `change` は画面によらず同形 | `create` は `recordId` 無し / `edit` は number / `index.edit` は string |

一方で、印刷画面が詳細画面と一致することや、
モバイルの `submit` / `change` / `process` が PC と同形であることも実測で確かめた。
**同形だと思えることも、違うはずだということも、根拠にならない。**

## 使う

```sh
pnpm add monosashi
```

> [!NOTE]
> **0.x のあいだは破壊的変更があり得る。** API を実プロジェクトで検証している最中で
> （[#5](../../issues/5)）、そこで判明したことは 0.2.0 以降に反映する。

公開物には [provenance](https://docs.npmjs.com/generating-provenance-statements)
が付いている。どのリポジトリのどのワークフローがこの tarball を作ったかを
npm のページから辿れる。

```ts
// kintone グローバルの型はこの副作用 import で有効になる。プロジェクトに 1 回だけ書く
import "monosashi/kintone";

import { field, guard, setValue, toUpdateParams } from "monosashi";

kintone.events.on("app.record.detail.show", (event) => {
  event.recordId;  // number
  event.record;    // SavedRecord
  return event;
});

// JS API で取得したレコードを REST API に渡す
const got = kintone.app.record.get();
if (got !== null) {
  setValue(got.record, "数値", "42");
  await client.record.updateRecord(toUpdateParams(app, got.record));
}
```

### グローバル型を明示的に取り込む理由

`monosashi` を import しても `kintone` グローバルは型付けされない。
有効にするには `monosashi/kintone` を明示的に import する。

ライブラリが利用者のグローバルスコープを勝手に書き換えないため。
`toRestWrite` や `field.*` は `@kintone/rest-api-client` と組み合わせて
サーバサイドでも使えるが、そこで `kintone` グローバルが生えていると

```ts
kintone.events.on(...)   // 型は通る。実行時は kintone is not defined
```

が**コンパイルを通ってしまう**。存在しないものを型が保証する状態になり、
このライブラリの目的と正反対になる。

### 自前の `kintone.d.ts` を持っているなら、`monosashi/kintone` は使わない

`monosashi/kintone` は `declare global { namespace kintone { ... } }` を出す。
**同じ名前空間を宣言しているものが他にあると、マージされる。**
同名の関数はオーバーロードとして併存し、**先に宣言された側が採用される**。

TypeScript は `Duplicate identifier` を出さない。
どちらが勝ったかを教える診断は**一つも出ない**。
自前の `get(): any` が勝てば、型が付いていないことに誰も気づけない。

どちらが先になるかは、プログラムにファイルが入る順で決まる
（`tsconfig` の `files` / `include` の並び、import の並び）。
**これは安定した条件ではない。** 順序を入れ替えただけで勝敗が入れ替わることを
`pack:check` の「併用」シナリオ 2 つで固定してある。

そこで、自前の宣言を持っているなら**向きを逆にする**。
`monosashi/kintone` を import せず、自分の `declare global` の中で monosashi の型を使う。

```ts
import type {
  EditingRecord,
  EventOf,
  KintoneEventName,
  SetRecord,
} from "monosashi";

declare global {
  namespace kintone {
    namespace app {
      namespace record {
        function get(): { record: EditingRecord } | null;   // any を置き換える
        function set(record: { record: SetRecord }): void;
      }
      // 自前の宣言はそのまま残る
      function getFormFields(): Promise<{ [code: string]: { type: string } }>;
    }
    namespace events {
      function on<Name extends KintoneEventName>(
        event: Name | Name[],
        handler: (event: EventOf<Name>) => unknown,
      ): void;
    }
  }
}
```

マージが起きないので順序に依存しない。
`@kintone/dts-gen` に無い宣言（`getFormFields` / `getView` / ダイアログ系）を
自前で持っているプロジェクトは、**それを捨てずにレコードの値の型だけ差し替えられる**。
この形も `pack:check` で検査している。

**エントリを分けても解決しない。** ぶつかるのは
`kintone.app.record.get` という宣言箇所そのものなので、
`monosashi/kintone-record` のようなものを作っても同じことが起きる。

`@kintone/dts-gen` の `kintone.d.ts` との併用は、
`kintone.events.on` と `kintone.app.record.get` の両方で確認済み。
ただし上のとおり**順序に依存する**ので、
`get()` が `any` のままの宣言と混ぜるなら、この節の形にするほうが安全。

### API

| | 用途 |
|---|---|
| `SavedRecord` / `EditingRecord` | レコード型。取得元で `value` の型が違う |
| `SetRecord` | `kintone.app.record.set()` に渡す型。`disabled` / `error` を持てる |
| `Saved` / `Editing` | フィールド型の名前空間 |
| `Rest` / `RestRecord` | REST API の型。本体から出る（下記） |
| `EventOf<"app.record.detail.show">` | イベント名から event の形を引く |
| `toUpdateParams` / `toAddParams` | REST に渡すパラメータを作る |
| `toRestWrite` / `toRest` | 変換の下位 API |
| `field.*` | フィールドの構築 |
| `setValue` / `canSetValue` | 型安全な代入 |
| `guard.*` | 型ガード |

### `guard.*` の一覧

**28 種別すべてにある。** 判定は `field.type === "その種別"` の一点で、
構造は見ない。例外は下の 2 つだけ。

```ts
import { guard } from "monosashi";

// シグネチャは全部これ。入力の型を保ったまま絞り込む
declare function isSubtable<T extends LooseField>(
  field: T | undefined | null,
): field is Narrow<T, "SUBTABLE">;
```

`undefined` と `null` を受ける。**前もって存在チェックを書かなくてよい。**

```ts
// これでよい
if (!guard.isSubtable(record[code])) return;

// kintone-typeguard で要っていた前置きは要らない
if (record[code] === undefined || !guard.isSubtable(record[code])) return;
```

| ガード | 見る `type` |
|---|---|
| `isRecordNumber` | `RECORD_NUMBER` |
| `isId` | `__ID__` |
| `isRevision` | `__REVISION__` |
| `isCreator` | `CREATOR` |
| `isModifier` | `MODIFIER` |
| `isCreatedTime` | `CREATED_TIME` |
| `isUpdatedTime` | `UPDATED_TIME` |
| `isStatus` | `STATUS` |
| `isStatusAssignee` | `STATUS_ASSIGNEE` |
| `isCategory` | `CATEGORY` |
| `isSingleLineText` | `SINGLE_LINE_TEXT` |
| `isMultiLineText` | `MULTI_LINE_TEXT` |
| `isRichText` | `RICH_TEXT` |
| `isNumber` | `NUMBER` |
| `isCalc` | `CALC` |
| `isLink` | `LINK` |
| `isCheckBox` | `CHECK_BOX` |
| `isRadioButton` | `RADIO_BUTTON` |
| `isMultiSelect` | `MULTI_SELECT` |
| `isDropdown` | `DROP_DOWN` |
| `isDate` | `DATE` |
| `isTime` | `TIME` |
| `isDateTime` | `DATETIME` |
| `isFile` | `FILE` |
| `isUserSelect` | `USER_SELECT` |
| `isOrganizationSelect` | `ORGANIZATION_SELECT` |
| `isGroupSelect` | `GROUP_SELECT` |
| `isSubtable` | `SUBTABLE` |

#### `type` を見ない 2 つ

| ガード | 判定の根拠 |
|---|---|
| `isLookup` | **`confirmed` と `recordId` のキーの有無。** ルックアップのキーフィールドの `type` は元フィールドの型そのもの（`SINGLE_LINE_TEXT` など）で、`type` では区別できない。REST から取ったレコードでは常に `false`（これらのキーが無いため） |
| `hasValue` | **`value !== undefined`。** `Editing` では一度も値が設定されていないフィールドの `value` が `undefined` になる（実測）。`""` や `[]` や `null` は通す |

`isLookup` はコピー先のフィールドを判別できない。
キーフィールドだけが `confirmed` / `recordId` を持つため。

#### 何を根拠に検査しているか

一覧が実装とずれないことは、**実測フィクスチャに対して**縛っている。
`type` で集めた実測フィールドを全部通し、
**取りこぼしゼロ**と**他種別の混入ゼロ**の両方を見る。
フィールドコードは書かない（`src/guard/record.test.ts`）。

### REST の型も本体から出る

```ts
import type { Rest, RestRecord } from "monosashi";
```

**このパッケージは実行時の依存を持たない。** `pnpm add monosashi` で入るのは
これだけで、他には何も付いてこない（`pack:check` が毎回確かめている）。

以前は `Rest` を `@kintone/rest-api-client` の型に委ねていた。
新しい正規形を作らなければ型の同一性が壊れない、という判断だった。
**その代償が、検出できない `any` だった。**
利用者がそのパッケージを入れていないと、`skipLibCheck: true`
（TypeScript の既定）では型がエラーにならず `any` に落ちる。
`strict` も `noImplicitAny` も効かず、警告も出ない。

そこで自前で持つことにした。乖離しないことは、こちらのテストで縛る。

| テスト | 守るもの |
| --- | --- |
| `src/types/rest.test-d.ts` | `@kintone/rest-api-client` との等価性。利用者が `client.record.addRecord()` に渡せること |
| `test/coverage.test-d.ts` | 実測した全種別を覆っていること（`Saved` / `Editing` と同じ軸） |

`@kintone/rest-api-client` は devDependency としてこのリポジトリには常に在るので、
委譲をやめても突き合わせは続けられる。
その更新は Dependabot が拾い、上の等価性テストが可否を判定する。

## もっと詳しく

- [`fixtures/measured.json`](fixtures/measured.json) — 型の唯一の根拠。実測データそのもの
- [`fixtures/write-behavior.md`](fixtures/write-behavior.md) — REST 書き込みの受け入れ挙動（20 ケース）
- [設計判断の記録](docs/DECISIONS.md) — 何を決めたか、**何を捨てたか、なぜ捨てたか**。
  実測で判明した kintone / API の制約と、**測り方を間違えた記録**も入っている
- [開発する](CONTRIBUTING.md) — このリポジトリに手を入れるときの手順

## ライセンス

[MIT](LICENSE)
