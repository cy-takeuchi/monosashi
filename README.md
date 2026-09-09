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
- **レコード系イベント 30 種すべて**に裏づけがある
- 書き込みの受け入れ挙動も実測（REST 20 ケース / `set()` 22 ケース）
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

## 使い方

```sh
pnpm add monosashi
```

```ts
// kintone が用意しているグローバル変数 `kintone` に型を付けるための import。
// 値は何も入ってこない（型だけ）。プロジェクトのどこかに 1 回書けば全体に効く
import "monosashi/kintone";

import { guard, setValue, toUpdateParams } from "monosashi";

// 同じ「数値」フィールドでも、どの画面のイベントかで value の型が違う
kintone.events.on("app.record.detail.show", (event) => {
  event.recordId;  // number
  const num = event.record.数値;
  if (guard.isNumber(num)) num.value.length;  // value は string
  return event;
});

kintone.events.on("app.record.create.show", (event) => {
  // 作成画面には recordId が無い
  const num = event.record.数値;
  if (guard.isNumber(num)) num.value?.length;  // value は string | undefined。? が要る
  return event;
});

// JS API で取得したレコードを REST API に渡す
const got = kintone.app.record.get();
if (got !== null) {
  setValue(got.record, "数値", "42");
  await client.record.updateRecord(toUpdateParams(app, got.record));
}
```

**0.x のあいだは破壊的変更があり得る。** API を実プロジェクトで検証している最中で
（[#5](../../issues/5)）、そこで判明したことは以降のリリースに反映する。

### 動作条件

| | |
|---|---|
| **TypeScript** | **5.9 以上** |
| `moduleResolution` | `bundler` / `nodenext`（`node10` は TS 7 で削除されたため対象外） |
| 実行環境 | ブラウザと Node の両方 |
| 実行時依存 | **ゼロ** |

`monosashi/kintone` を import しなければ、`kintone` グローバルも DOM も要らない。
AWS Lambda などサーバサイドで本体だけを使える。

```ts
// lib に DOM を入れていなくても通る
import { field, toUpdateParams } from "monosashi";
```

`pnpm pack` した tarball がこの条件で使えることは `pack:check` が毎回検査している
（`skipLibCheck: false` や DOM 無しの構成も含む）。

公開物には [provenance](https://docs.npmjs.com/generating-provenance-statements)
が付いている。どのリポジトリのどのワークフローがこの tarball を作ったかを
npm のページから辿れる。

## API

| | 用途 |
|---|---|
| `SavedRecord` / `EditingRecord` | レコード型。取得元で `value` の型が違う |
| `SetRecord` | `kintone.app.record.set()` に渡す型。`disabled` / `error` を持てる |
| `Rest` / `RestRecord` | REST API の型 |
| `Saved` / `Editing` | フィールド型の名前空間 |
| `Api.*` | JS API が受け渡す値の型。**根拠は公式ドキュメント**（実測ではない） |
| `EventOf<"app.record.detail.show">` | イベント名から event の形を引く |
| `guard.*` | 型ガード |
| `field.*` | フィールドの構築 |
| `setValue` / `canSetValue` | 型安全な代入 |
| `toUpdateParams` / `toAddParams` | REST に渡すパラメータを作る |
| `toSetRecord` | `kintone.app.record.set()` に渡す形にする |
| `toRestWrite` / `toRest` | 変換の下位 API |

### `kintone` グローバル

`monosashi` を import しても `kintone` グローバルは型付けされない。
有効にするには `monosashi/kintone` を明示的に import する
（ライブラリが利用者のグローバルスコープを勝手に書き換えないため）。

[公式ドキュメントの JS API 一覧](https://cybozu.dev/ja/kintone/docs/js-api/)
に載っている **166 個すべて**を宣言する。`@kintone/dts-gen` は 51 個で、
それは公式一覧の真部分集合なので **dts-gen は要らない**。

根拠は 2 種類あり、混ぜていない。

| 根拠 | 対象 |
|---|---|
| **実測** | `events.on` の event、`record.get()` / `set()` のレコード |
| **公式ドキュメント** | それ以外すべて（`Api` 名前空間）。返る値の形は確かめていない |

**自前の `kintone.d.ts` を持っているなら、置き換えればよい。**
残したい場合は `monosashi/kintone` を import せず、自分の `declare global` の中で
`EditingRecord` / `SetRecord` / `EventOf` を参照する
（理由と手順は [DECISIONS](docs/DECISIONS.md)）。

### `guard.*`

**28 種別すべてにある。** 判定は `field.type === "その種別"` の一点で、構造は見ない。

```ts
import { guard } from "monosashi";

// undefined と null を受ける。前もって存在チェックを書かなくてよい
if (!guard.isSubtable(record[code])) return;
```

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

`type` を見ないものが 2 つある。

| ガード | 判定の根拠 |
|---|---|
| `isLookup` | **`confirmed` と `recordId` のキーの有無。** ルックアップのキーフィールドの `type` は元フィールドの型そのもので、`type` では区別できない。REST から取ったレコードでは常に `false` |
| `hasValue` | **`value !== undefined`。** `Editing` では一度も値が設定されていないフィールドの `value` が `undefined` になる。`""` や `[]` や `null` は通す |

絞り込み先は入力の型で決まる。`SavedRecord` から引けば `Saved` の型に、
`LooseRecord` から引けば 3 文脈の union になる。

```ts
const text = record[code];
if (guard.isSingleLineText(text) && guard.hasValue(text)) {
  text.value.trim();   // string
}
```

### REST で取ったレコードを画面に反映する

```ts
import { toSetRecord } from "monosashi";

const { record } = await client.record.getRecord({ app, id });
kintone.app.record.set({ record: toSetRecord(record) });
```

**`toRestWrite` と同じ実装は使えない。** どちらも「書き込み」だが、
落とすべきものが違う（`fixtures/set-behavior.md`・実測 22 ケース）。

| | REST `updateRecord` | `kintone.app.record.set()` |
|---|---|---|
| 読み取り専用 8 種別 | **全部拒否**（落とすのは必須） | **`CATEGORY` だけ拒否**。他は無視される |
| サブテーブルの行 `id` を落とす | **行が置き換わりデータが壊れる** | id が保たれる |
| `type` の省略 | REST は `{ value }` だけで通る | **拒否される** |

## `kintone-typeguard` からの移行

`kintone-typeguard` の後継として作っている。
**レコードの値**についてはガードが揃っているが、**フォーム定義は守備範囲外**。

### レコードの値のガード ── 移せる

**28 種別すべてに対応があり、抜けは無い**（機械的に突き合わせ済み）。
綴りが違うものが 3 つあるが、コンパイルエラーになるので黙って壊れることはない。

| `kintone-typeguard` | `monosashi` |
|---|---|
| `guardRecord.isDatetime` | `guard.isDateTime` |
| `guardRecord.isDropDown` | `guard.isDropdown` |
| `guardRecord.isID` | `guard.isId` |

`guard.isLookup` と `guard.hasValue` が増えている。
前置きの存在チェックも要らなくなる。

### レコードの型 ── **1 対 1 にならない**

ここが移行の見積りを決める。

| `kintone-typeguard` | `monosashi` |
|---|---|
| `kintoneRecordFieldGet.Record` | **`SavedRecord` / `EditingRecord` / `RestRecord` の 3 つに割れる** |
| `kintoneRecordFieldEvent.*` | `EventOf<"app.record.detail.show">` など |
| `kintoneRecordFieldSet.Record` | `SetRecord` |
| `kintoneRecordFieldUnified.*` | `Rest.*` / `RestRecord` |

`Get` の 1 型が 3 つに割れるので、**呼び出しごとに「どの文脈のレコードか」を
判断する必要がある**。3 つを 1 つに潰していたことが `kintone-typeguard` の
緩さの正体で、分かれていること自体が monosashi の存在理由でもある。

### フォーム定義 ── **守備範囲外。移行先は無い**

`guardFormField` / `guardFormLayout`（各 29 個）に相当するものは**無く、作る予定も無い**。
`getFormFields` / `getFormLayout` が返すフォームの設定を判別するもので、
レコードの値とは別物。フォーム定義には `value` が無いので、
monosashi のガードは引数の時点で受け取れない。

種別も食い違う。monosashi が「レコードには現れない」と実測で除外した
`GROUP` / `REFERENCE_TABLE` が、フォーム定義には存在する。

### 変換 ── `converterGetToSet` は `toSetRecord`

`guardUtils.converterGetToSet` に相当するものは `toSetRecord`。
ただし落とす対象は実測で決めており、`kintone-typeguard` とは中身が違う（上記）。

## もっと詳しく

- [`fixtures/measured.json`](fixtures/measured.json) — 型の唯一の根拠。実測データそのもの
- [`fixtures/write-behavior.md`](fixtures/write-behavior.md) — REST 書き込みの受け入れ挙動（20 ケース）
- [`fixtures/set-behavior.md`](fixtures/set-behavior.md) — `kintone.app.record.set()` の受け入れ挙動（22 ケース）
- [設計判断の記録](docs/DECISIONS.md) — 何を決めたか、**何を捨てたか、なぜ捨てたか**。
  実測で判明した kintone / API の制約と、**測り方を間違えた記録**も入っている
- [開発する](CONTRIBUTING.md) — このリポジトリに手を入れるときの手順

## ライセンス

[MIT](LICENSE)
