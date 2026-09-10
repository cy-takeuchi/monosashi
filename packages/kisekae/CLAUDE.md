# CLAUDE.md

kintone の**フォーム定義**（`getFormFields` / `getFormLayout`）を、
プラグインから扱いやすい形に整えて返す npm パッケージ `kisekae`。

**共通のルールはリポジトリのルートの `CLAUDE.md`**（日本語で書く / 型に書く前に測る /
実行してはいけないこと / コミット規約）。ここには kisekae 固有のことだけを書く。

| | |
|---|---|
| kintone 自体の挙動 | `../../docs/KINTONE.md` |
| 環境とツールチェーン | `../../docs/TOOLCHAIN.md` |
| kisekae の設計判断 | `docs/DECISIONS.md` |

## 実測の根拠

**`fixtures/form/definition.json` が唯一の根拠。** 手で編集しない。
`pnpm run app:collect-form` → `pnpm run fixture:form` で生成する。

測る対象は monosashi が建てた検証アプリ。**同じアプリを 2 つのパッケージが測る。**
アプリの定義は `../monosashi/tools/fixture-app/` にある。
レイアウトに要素（`SPACER` / `LABEL` / `HR`）が要るときはそこを直す。

## 根拠は 3 つの機構で縛る

型は実行時に消えるので、実測データと型を直接突き合わせられない。
キーの表を挟んで 3 点を縛る。

```
Raw の型  ←→  キーの表  ←→  fixtures/form/definition.json
```

| ファイル | 縛るもの |
|---|---|
| `src/types/raw.test-d.ts` | 型 ↔ 公式（乖離の検出。**既知の乖離は交差型で式に書く**） |
| `test/rawKeys.test-d.ts` | 型 ↔ 表（`keyof T` と表の要素の union が一致） |
| `test/rawFixture.test.ts` | 表 ↔ 実測（キーの集合が全件一致） |

**3 つのうち 2 つが一致していても通らない。** 表と型の両方に実測に無いキーを
足して、空振りでないことを確かめてある。

`src/types/raw.test-d.ts` に**許容リストを作らない**。
既知の乖離は `PatchedLabel` のように交差型で内容ごと固定する。
素の等価性で書くと初日から赤になり、「毎回差分が出て、やがて誰も見なくなる」。

## 直してはいけない設計

### ルックアップは種別ごとに分ける

`Field.LookupSingleLineText` / `Field.LookupNumber` を 1 つに戻さない。

判別子が 2 値のメンバ（公式の `Lookup` は `type: "NUMBER" | "SINGLE_LINE_TEXT"`）が
混ざると**ユニオン全体が判別ユニオンでなくなり、`filter` の型述語推論が死ぬ**。
kintone-pretty-fields が 30 個のガードを必要としたのはこれが原因で、
しかもそのガードはルックアップを通してしまう unsound なものだった。

`src/types/field.test-d.ts` と `test/dist/consumer.ts` が、
壊れていないことを縛っている（後者は**出荷物**に対して）。

### 種別ごとのガードを出さない

TypeScript 5.5 以降は型述語を推論するので、`filter((f) => f.type === "NUMBER")` で絞れる。
出すのは**入れ子の判別子で埋まらないもの**だけ
（`isInSubtable` / `isInGroup` / `isTopLevel`）。

### 派生値を持たない

`sortedOptions` / `isLookupCopy` を足さない。フィールドの内容はそのまま返す。
どちらも kintone-pretty-fields にあって、消費側 6 本のうち 1 つも使っていなかった。

### `unplaced` を `parent: null` で兼ねない

「フォームに置かれていない」と「トップレベルに置かれている」は違う。
兼ねると消費側が `setFieldShown` を呼んで失敗する。

## 検査

```sh
pnpm run check
```

中身は `tsc --noEmit` / vitest（`--typecheck` 込み）/ `pack:check`。
biome はリポジトリのルートで 1 回だけ回す。

`pack:check` が確かめているのは、**実行時依存がゼロであること**
（tarball を空のプロジェクトに入れて `node_modules` に `kisekae` 以外が現れない）と、
`dist/*.d.ts` を `skipLibCheck: false` で直接検査したときに通ること。
公開する `.d.ts` から `@kintone/rest-api-client` を参照した瞬間に落ちる。

## 実行してはいけないこと

| | 理由 |
|---|---|
| `fixtures/form/definition.json` を手で編集 | 実測の根拠が実測でなくなる |
| `pnpm run app:collect-form` を勝手に実行 | 実 kintone に接続する。認証情報が要る |
