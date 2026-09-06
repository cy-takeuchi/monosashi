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

> [!NOTE]
> **まだ npm に公開していない**（[#3](../../issues/3)）。
> 今は `pnpm pack` した tarball を参照するか、リポジトリを直接指定して使う。

```sh
pnpm add monosashi
```

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

`@kintone/dts-gen` の `kintone.d.ts` と併用しても壊れない。
`tsconfig` の `include` の順に関わらず、こちらの型が優先されることを確認済み
（`kintone.events.on` と `kintone.app.record.get` の両方）。

### API

| | 用途 |
|---|---|
| `SavedRecord` / `EditingRecord` | レコード型。取得元で `value` の型が違う |
| `Saved` / `Editing` | フィールド型の名前空間 |
| `Rest` / `RestRecord` | REST API の型。本体から出る（下記） |
| `EventOf<"app.record.detail.show">` | イベント名から event の形を引く |
| `toUpdateParams` / `toAddParams` | REST に渡すパラメータを作る |
| `toRestWrite` / `toRest` | 変換の下位 API |
| `field.*` | フィールドの構築 |
| `setValue` / `canSetValue` | 型安全な代入 |
| `guard.*` | 型ガード |

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
