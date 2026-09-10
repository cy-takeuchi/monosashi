# kisekae

kintone のフォーム定義（`getFormFields` / `getFormLayout`）を、
プラグインから扱いやすい形に整えて返す。

**実行時依存を持たない。** `@kintone/rest-api-client` を入れていなくても使える。

## 何をするのか

2 つの API の結果を突き合わせて、1 つの構造にする。

```ts
import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { toForm, guard } from "kisekae";

const client = new KintoneRestAPIClient();
const [fields, layout] = await Promise.all([
  client.app.getFormFields({ app: 1, lang: "user", preview: false }),
  client.app.getFormLayout({ app: 1, preview: false }),
]);

const form = toForm(fields.properties, layout.layout);
```

返るのは 5 つ。

| | 中身 |
|---|---|
| `fields` | フォームに置かれた実フィールド。**レイアウト順**（左上が先、右下が後）。所属あり |
| `tables` | サブテーブル。中のフィールドは持たない |
| `groups` | グループ。同上 |
| `elements` | `SPACER` / `LABEL` / `HR`。**レイアウト順**。所属あり |
| `unplaced` | `properties` にあって `layout` に無いもの。所属を持たない |

## 所属は必須で、親のラベルを持つ

```ts
// f.parent は必ずある（null か、テーブルかグループ）
form.fields.map((f) => f.parent?.label ?? "（トップレベル）");
```

`parent` が `null` なのは「フォームのトップレベルに置かれている」という意味。
「フォームに置かれていない」は `unplaced` で表す。この 2 つは違う
（`setFieldShown` を呼べるかどうかが変わる）。

所属で絞るときだけガードを使う。

```ts
const inTable = form.fields.filter(guard.isInSubtable);
inTable[0].parent.code;   // string。`!` は要らない
```

## 種別で絞るのにガードは要らない

TypeScript 5.5 以降は型述語を推論する。

```ts
form.fields.filter((f) => f.type === "CHECK_BOX");
// → Field.CheckBox[]

form.fields.filter((f) => f.type === "RADIO_BUTTON" || f.type === "DROP_DOWN");
// → (Field.RadioButton | Field.Dropdown)[]
```

そのために**ルックアップのキーフィールドを種別ごとに分けている**。
公式の型は 1 つのメンバで `type: "NUMBER" | "SINGLE_LINE_TEXT"` と宣言していて、
判別子が 2 値のメンバが混ざると**ユニオン全体の推論が死ぬ**。

```ts
// 文字列 1 行で絞ると、通常とルックアップの 2 メンバになる
for (const f of form.fields.filter((x) => x.type === "SINGLE_LINE_TEXT")) {
  if ("lookup" in f) continue;   // ルックアップを除く
  f.maxLength;                   // ここで文字列固有のプロパティに触れる
}
```

ルックアップのキーフィールドは `maxLength` などを**返さない**（実測）。
だから「各型に optional な `lookup` を足す」形は採れない
（型が「ある」と言うのに実行時は `undefined` になる）。

## 型だけを使う

`@kintone/rest-api-client` を入れずにフォーム定義に型を付けられる。

```ts
import type { Properties, Layout, Field, Form } from "kisekae";
```

`Properties` / `Layout` が `getFormFields` / `getFormLayout` の戻り値の形、
`Field` / `Form` が整形後。

## なぜ実測なのか

型の根拠は実 kintone から採った `fixtures/form/definition.json`。
公式の型と全件突き合わせた結果、**乖離が 1 件見つかっている**。

`LABEL` と `HR` は `elementId` を返すが、`@kintone/rest-api-client` の型は
宣言していない。`updateFormLayout` に送っていないので kintone が付けている。

kisekae はそれを型に出す。乖離の内容は
[`src/types/raw.test-d.ts`](https://github.com/cy-takeuchi/jissoku/blob/main/packages/kisekae/src/types/raw.test-d.ts) が式で固定しているので、
公式が追いついたらそのテストが落ちる。

## もっと読む

- [開発する](https://github.com/cy-takeuchi/jissoku/blob/main/packages/kisekae/CONTRIBUTING.md) — 実測の手順、型を足すとき、公開する
- [設計判断の記録](https://github.com/cy-takeuchi/jissoku/blob/main/packages/kisekae/docs/DECISIONS.md) — 何を決めたか、**何を捨てたか、なぜ捨てたか**

## ライセンス

[MIT](LICENSE)
