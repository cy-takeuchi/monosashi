# 設計判断の記録（kisekae）

kintone のフォーム定義（`getFormFields` / `getFormLayout`）を、
プラグインから扱いやすい形に整えて返す npm パッケージ `kisekae`。
`kintone-pretty-fields` の作り直し。初版は `0.1.0`。

対象バージョン: kintone-pretty-fields 0.11.0 / kintone-typeguard 0.18.3 /
@kintone/rest-api-client 6.2.1 / TypeScript 7.0.2

**まだ 1 行も実装していない。** これは実装前に決めたことの記録で、
[12. 作業順序](#12-作業順序)のとおり**実測が先**。
実測は 2026-09-10 に 1 回目を採り終えた
（`fixtures/form/definition.json` / monosashi の DECISIONS
「フォーム定義の実測でわかったこと」）。**未確定は無い。**

---

## 背景

`kintone-pretty-fields` は 6 本のプラグインが使っていて（41 ファイル）、
中心的な価値は 3 つだった。

1. `getFormFields` と `getFormLayout` を突き合わせ、**レイアウト順**に並べる
2. テーブル内 / グループ内のフィールドに**所属**を付ける
3. スペーサーも返す

この 3 つは実際に使われている。作り直す理由は、**その周りが壊れていた**こと。
以下は現物を読み、動かして確かめたもの。

### 型ガードが unsound だった

`Lookup` の判別子が `type: "NUMBER" | "SINGLE_LINE_TEXT"` という 2 値のユニオンで、
`OneOf` に混ざっている。実際に動かすとこうなる。

```
isSingleLineText(ルックアップのキーフィールド) = true     ← 通る
lookupKey.maxLength   型は string / 実行時は undefined   ← 型エラーなしで読める
fields.filter(isSingleLineText) → SingleLineText[]      ← 嘘（ルックアップが混在）
```

### そのせいで 30 個のガードが必要になっていた

判別子が 2 値のメンバが 1 つ混ざると、**ユニオン全体が判別ユニオンでなくなり**、
TypeScript の型述語推論が死ぬ。

```
type L = { type: "A" | "B"; lookup: object };   // Lookup 相当

(A | B)[].filter((f) => f.type === "A")      → A[]        絞れる
(A | B | L)[].filter((f) => f.type === "A")  → (A|B|L)[]  絞れない ★
one.type === "A" ? one : null                → A | L      if 文なら絞れる
(f): f is A | L => f.type === "A"            → (A|L)[]    明示すれば効く
```

つまり pretty-fields の 30 個のガードは、**自分で壊した推論を自分で埋めていた**。

### 使われていない機能があった

| | 消費側の参照 |
|---|--:|
| `sortedOptions` | **0** |
| `isLookupCopy` | **0** |
| `isNotInSubtable`（`field is T` で絞り込みが起きない） | 0 |
| `tables[].fields` / `groups[].fields`（中のフィールド） | **0** |

`sortedOptions` を使う代わりに `kantan-map/src/hooks/useBulkUpdate.ts:78-89` は
`Object.entries().sort()` を自分で書いていて、しかも入力の型は
`kintone.FormField`（JS API のグローバル型）で pretty-fields を通していない。

### 所属が optional なせいで消費側が壊れていた

`table?: string` / `group?: string` が optional なので「所属を持つ」ことを
型で言えず、消費側が 2 通りに埋めていた。

```ts
// detailed-map-3/src/functions/record/fields.ts:38-42
} else if ("table" in notGroupingField) {
  // biome-ignore lint/style/noNonNullAssertion: false
  showSubtableCodes.push(notGroupingField.table!);

// detailed-map-3/src/functions/config/utils.ts:17  ── 嘘の型述語
formFields.find((field): field is kintonePrettyType.InSubtable => field.code === item.value)
```

後者は `code` が一致するだけで `InSubtable` だと言い切っていて、
テーブル外のフィールドでも通る。`.table` に触るためだけの unsound なキャスト。

### 所属のラベル解決を消費側が毎回書いていた

`shared/src/utils/options.ts:126-145` の `getGrouping` は
`tables` / `groups` から**ラベルだけ**を `find` で引いている。
そのために `generateOptions(fields, tableFields, groupFields)` という 3 引数の関数と、
`formFields.filter(isSubtable)` / `filter(isGroup)` の 2 行が 4〜6 本で重複していた。
同ファイルのコメントにはこう書かれている ──
「同じ相手アプリの選択肢を設定画面と align の両方が作るのに、
式が別々に書かれていて既にズレていた」。

### 依存が幽霊だった

`kintone-typeguard` は `dist` のどこからも参照されていない（`.js` も `.d.ts` も 0 件）。
実際に効いている依存は `@kintone/rest-api-client` 1 つで、
使われ方は**型だけ**なのに `dependencies` に入っていた（利用者に 7MB を背負わせる）。

### レイアウトに現れないフィールドの扱いが揺れていた

```
enabled=true  → [ステータス, カテゴリー, 文字列]   ← 先頭に足す
enabled=false → [文字列]                          ← 落とす
レイアウトに無い RECORD_NUMBER → [文字列, レコード番号]  ← 末尾に足す
```

前に足すか後ろに足すかが揃っておらず、どこにも書かれていない。
`LABEL` / `HR` は理由の記述なく捨てられていた。

---

## 決定サマリ

| | 決定 |
|---|---|
| 成果物の中心 | フォーム定義を整形して返すこと。ガードは必要な範囲だけ |
| 公開する値 | `toForm` / `guard` / 型 `Field` / 型 `Raw` の 4 つだけ |
| 返り値 | `{ fields, tables, groups, elements, unplaced }` |
| 所属 | 必須の nullable 1 本。親のラベルも持つ |
| 入力 | 純粋関数。クライアントを受け取らない |
| 型 | 全種別を自前で書き下す。`@kintone/rest-api-client` は devDependency のみ |
| 等価性テスト | **入力側**（生のフォーム定義）を縛る |
| ガード | `type` で判別できないものだけ 3 個 |
| 実行時依存 | ゼロ。`pack:check` が縛る |
| monosashi | **依存しない**。受け渡しの通貨は素の値 |
| 根拠 | 実測。monosashi の検証アプリを共有する |

---

## 1. 成果物の範囲

**決定**: 中心は**フォーム定義を整形して返すこと**。型ガードは整形に必要な範囲だけ持つ。

**捨てた選択肢**

- **フォーム定義版 monosashi**（型とガードが中心で、生の形にもガードを効かせる） ──
  生の `getFormFields` の形を判別する需要が実際に無い。消費側は整形後だけを扱う。
  `kintone-typeguard` の `guardFormField` / `guardFormLayout`（各 29 個）は引き取らない
- **2 層を別サブパスで出す** ── 使われるか分からない入口を先に 2 つ作ることになる

## 2. 返り値の形

**決定**:

```ts
toForm(properties, layout): Form
// Form = {
//   fields,    実フィールド。レイアウト順。parent 付き
//   tables,    SUBTABLE の定義（中のフィールドは持たない）
//   groups,    GROUP の定義（同上）
//   elements,  SPACER / LABEL / HR。レイアウト順。parent 付き
//   unplaced,  properties にあって layout に無いもの
// }
```

**理由**: 消費側の痛みが 2 種類あり、平坦な配列と用途別のリストがそれぞれを消す。

- 平坦な `fields` に**必須の所属**を持たせることで `f.table!` と嘘の型述語が消える
- `tables` / `groups` を最初から返すことで、6 本に重複している
  `filter(isSubtable)` / `filter(isGroup)` が消える

**捨てた選択肢**

- **レイアウトを写した木を主にする** ── 6 本すべてがやっている
  「フィールドピッカーの選択肢作り」（`fields.filter(...)`）が書けなくなる。
  木を平坦化する関数を消費側が毎回書くことになり、痛みの置き換えにしかならない
- **`table?` / `group?` を optional のまま残す** ── 上の 2 つのバグの直接の原因

### 中のフィールドを持たせない

`tables[].fields` / `groups[].fields` は 6 本のうち 1 つも見ていない。
持たせると**同じフィールドが 2 箇所に現れる**（pretty-fields の今の形）ことになり、
片方だけ加工されたときに壊れる。
テーブル内のフィールドが要れば `fields.filter((f) => f.parent?.code === table)` で取れる。

### 派生値を持たない

**フィールドの内容はそのまま返す。** `sortedOptions` は持たない
（誰も使っておらず、要る人は `Object.entries().sort()` を書いている）。
`isLookupCopy` も持たない（0 件。しかもルックアップ元アプリの権限を要求する唯一の機能）。

## 3. 所属の表し方

**決定**:

```ts
parent:
  | { type: "SUBTABLE"; code: string; label: string }
  | { type: "GROUP"; code: string; label: string }
  | null
```

レイアウト要素・組み込みフィールド・`REFERENCE_TABLE` は
テーブル内になり得ないので `{ type: "GROUP"; ... } | null` に絞る。

**排他であることの根拠**（公式の型が構造で保証している）

```ts
// layout.d.ts
export type Group<T extends Array<Row<Field.OneOf[]>>> = { type: "GROUP"; code: string; layout: T };
// fieldLayout.d.ts
export type InSubtable = Exclude<OneOf, RecordNumber | ... | ReferenceTable | Label | HR | Spacer>;
```

グループの中身は `ROW` だけ（`SUBTABLE` も入れ子の `GROUP` も入らない）。
よって「テーブル内かつグループ内」のフィールドは存在しない。

**捨てた選択肢**

- **`table: string | null; group: string | null`** ── 移行はこれが一番安いが、
  `{ table: "t", group: "g" }` という**あり得ない状態が型として通る**。
  型が実際より緩いことが unsound な型述語を生んだので、そこは締める
- **フィールド型自体を所属で分ける**（`InTableField` など） ── 28 種別 × 3 で
  union が膨らみ、monosashi の CLAUDE.md が禁じている
  「ホバー表示とエラーメッセージが壊れる」状態になる
- **`{ kind: "none" } | { kind: "table" } | ...`** ── `kind: "none"` は語彙の発明。
  判別子は kintone の `type` 文字列で揃える

### ラベルを持たせる

`parent` が親のラベルを持つ。消費側の `getGrouping`（20 行 4 引数）が
`field.parent?.label ?? partition` になり、`generateOption` と `generateOptions` の
引数が 3 本から 1 本になる。**3 引数を毎回正しく揃える必要があること自体**が、
`shared/src/utils/options.ts` のコメントが記録しているズレの原因だった。

親のオブジェクトそのものを入れる案は循環参照になるので採らない。

## 4. 型の出どころ

**決定**: 全種別を**自前で書き下す**。`@kintone/rest-api-client` は devDependency のみ。

**捨てた選択肢**

- **`KintoneFormFieldProperty.*` を `extends` する**（今の pretty-fields） ──
  `extends` は上位互換なので、**整形前と整形後を型で区別できない**。
  所属を必須にした時点で「ただの上位互換」ではなくなるので `extends` の利点が消える。
  `peerDependencies` にしても、型のためだけに利用者へバージョンを押しつける
- **一切参照しない** ── 乖離に気づけない。利用者は結局
  `client.app.getFormFields()` の結果を渡すので、壊れるのは**利用者の手元**

`pack:check`（monosashi と共有）が、tarball を空のプロジェクトに入れて
`node_modules` に他が 1 つも現れないことを確かめる。
`@kintone/rest-api-client` を入れていない利用者のシナリオも検査するので、
**公開する `.d.ts` はこれを参照できない**。この機械が kisekae の設計の要になる。

## 5. 等価性テストは入力側を縛る

**決定**: 生のフォーム定義の型を `expectTypeOf().toEqualTypeOf()` で公式と等価にする。
整形後の型は縛らない。生の型も公開する。

**理由**: monosashi とは向きが逆。monosashi の `RestRecord` は利用者が
`client.record.addRecord()` に**渡す**ものなので出力を縛る必要があった。
kisekae は `getFormFields` の結果を**受け取る**側で、
整形後（`parent` 必須、`Lookup` の作り替え）は設計どおり公式と等価でない。
**壊れると利用者の手元で壊れるのは入力側だけ。**

**捨てた選択肢**

- **種別ごとに `Omit<Pretty, "parent">` で突き合わせ、`Lookup` は例外にする** ──
  monosashi の `rest.test-d.ts` が明確に禁じている。
  「逃げ道は作らない。許容リストを作ると『とりあえず載せる』が起きる」
- **縛らない** ── 乖離の検出という目的そのものが無くなる

生の型を公開するのは、**`@kintone/rest-api-client` の 7MB を入れずに
フォーム定義に型が付く**という、pretty-fields には無かった価値のため。

### 3 つの機構を分ける

**決定（2026-09-10）**: 根拠の種類ごとに機構を分け、**既知の乖離は式の中に書く。**

| | 根拠 | 縛るもの |
|---|---|---|
| ① 実測が正 | `fixtures/form/definition.json` | 実測した箇所の型 |
| ② ドキュメントが正 | `@kintone/rest-api-client` の型 | 実測していない箇所の型 |
| ③ 乖離の検出 | `expectTypeOf().toEqualTypeOf()` | ①②が動いたら落ちる |

**③は正しさの判定ではない。トリップワイヤ。**
落ちたときは「どちらが正しいか」を①で決め、
決めた結果を③の式に書く。

monosashi はすでにこの形になっている。`Rest` は
`src/types/field.test.ts`（`isRestContext` で 6 箇所）が実測で縛り、
`src/types/rest.test-d.ts` が公式の型との等価性で縛っている。
**同じ型を 2 つの機構が縛っていて、いまは一致しているので緑。**

### 既知の乖離は式の中に書く

2026-09-10 の実測で食い違いが 1 件出た。
`LABEL` / `HR` は `elementId` を返すのに、公式の型は宣言していない
（[9](#9-レイアウトに現れないフィールド)の実測）。

**素の等価性で書くと初日から赤になる。**
main が赤いままの検査は、monosashi が繰り返し記録している失敗そのもの
（「毎回差分が出て、やがて誰も見なくなる」）。

```ts
// 実測: kintone は LABEL / HR にも elementId を返す（公式の型には無い）。
// 公式が足したらこの式が落ちる。そのとき交差型を消す
expectTypeOf<Raw.Label>().toEqualTypeOf<
  KintoneFormLayout.Field.Label & { elementId: string }
>();
```

**これは許容リストではない。** 許容リストは「この型は突き合わせない」と書くので、
対象が時間とともに広がり、何が確かめられているのか読めなくなる。
交差型は**乖離の内容そのものを型で固定する**ので、
片側が動いた瞬間に落ちる。次に読む人が測り直さずに済む。

**捨てた選択肢**

- **等価性を主張する対象を選ぶ**（レイアウト要素型は突き合わせない） ──
  「主張しない範囲」が広がる余地を残す。許容リストと実質同じ
- **一方向の代入可能性にする**（公式 ⊆ kisekae） ──
  「公式が狭い」ことしか言えず、**どこが狭いのかを型が記録しない**。
  公式が別の場所で狭くなっても落ちない

## 6. ガードを 3 個に絞る

**決定**: `type` で判別**できないもの**だけ出す。`isInTable` / `isInGroup` / `isTopLevel`。
`export * as guard` で名前空間に入れる。

**理由**: TypeScript 7.0.2（monosashi と kintone-plugins の双方が使用中）の
型述語推論で、種別ごとのガードは不要になる。実測した。

| 書き方 | 結果 |
|---|---|
| `filter((f) => f.type === "NUMBER")` | 絞れる |
| `filter((f) => isNumber(f) \|\| isRadio(f))` | 絞れる |
| 名前付き述語（型述語の注釈なし） | 絞れる |
| `filter((f) => f.type !== "SUBTABLE" && f.type !== "RADIO_BUTTON")` | 絞れる |
| `"lookup" in f` | 絞れる |
| **`filter((f) => f.parent.type === "SUBTABLE")`** | **絞れない** |

入れ子の判別子だけは `filter` で `f` の型に投影されない
（`if` の中では `f.parent.code` に `!` なしで触れる）。
**ガードが要る唯一の場所**で、しかもそこが実害が出ていた場所そのもの。

**捨てた選択肢**

- **monosashi 方式で全種別を書き下す（約 33 個）** ── monosashi が
  `is(type)` ファクトリと `Narrow<T, Type>` を持つ理由は、
  `Saved` / `Editing` / `Rest` の **3 文脈**をまたぐことと、
  `LooseField`（`value: unknown`）入力で `Extract` が `never` に落ちるのを救うこと。
  kisekae は文脈が 1 つで `value` を持たないので、この複雑さの根拠がまるごと無い。
  monosashi を参考にするのは実装ではなく**判断の立て方**
- **`isType(["NUMBER", "RADIO_BUTTON"])` のようなパラメータ化ガード** ──
  `f.type === "A" || f.type === "B"` が絞れると分かった時点で不要

ただしこれは**ユニオンが判別ユニオンであること**が前提。
[7](#7-ルックアップは判別ユニオンを壊す)がその前提を握っている。

## 7. ルックアップは判別ユニオンを壊す

**決定（2026-09-10 実測で確定）**: **種別ごとの独立メンバに分ける。**

```ts
namespace Field {
  type SingleLineText = { type: "SINGLE_LINE_TEXT"; code; label; noLabel; required;
                          minLength; maxLength; expression; hideExpression; unique; defaultValue;
                          parent: FieldParent };
  type LookupSingleLineText = { type: "SINGLE_LINE_TEXT"; code; label; noLabel; required;
                                lookup: Lookup; parent: FieldParent };
  // NUMBER も同じ 2 分割
}
```

公式と同じ形（`Lookup` を独立メンバにし `type` を 2 値にする）は採らない。
ユニオン全体の推論が死に、[6](#6-ガードを-3-個に絞る)が崩れて 33 個のガードが必要になる。

### 実測

`getFormFields` はルックアップのキーフィールドに**通常プロパティを返さない**。

```json
{ "type": "SINGLE_LINE_TEXT", "code": "lookupKey", "label": "ルックアップ",
  "noLabel": false, "required": false, "lookup": { ... } }
```

`minLength` / `maxLength` / `unique` / `defaultValue` / `expression` /
`hideExpression` が付いてこない（通常の `SINGLE_LINE_TEXT` は全部持つ）。
`@kintone/rest-api-client` の `Lookup` 型の主張どおりだった。

**よって「各型に optional な `lookup`」は unsound。**
`maxLength: string` があると型が言うのに実行時は `undefined` になる ──
`kintone-pretty-fields` の `isSingleLineText` が起こしていたのと同じ形の嘘。
きれいな方（`filter` が `SingleLineText[]` に絞れる）を採れないのは残念だが、
**きれいさのために嘘をつくのが、いま直している問題そのもの**。

### 受け入れる摩擦

`type` で絞ると 2 メンバのユニオンになる。

```ts
fields.filter((f) => f.type === "SINGLE_LINE_TEXT")
// → (Field.SingleLineText | Field.LookupSingleLineText)[]
```

`code` / `label` / `noLabel` / `required` / `parent` は共通なので触れる。
6 本のプラグインが `type` で絞ったあとに触るのはこの範囲だけなので、実害は無い。

`maxLength` のような固有プロパティに触るには 1 段絞る必要がある。
合成条件は推論が効かない（実測済み）ので、そこは明示的な型述語が要る。

```ts
fields.filter((f) => f.type === "SINGLE_LINE_TEXT" && !("lookup" in f))  // → OneOf[] 絞れない
```

**この 1 つのために `guard` にガードを足すかは、要ると分かってから決める。**
[6](#6-ガードを-3-個に絞る)の「使われない export を出さない」に従う。

### コピー先には印が付かないが、判別はできる

`lookupCopyName` のキー集合は通常の `singleLineText` と**完全に同一**で、
コピー先であることを示すプロパティは無い（実測）。

一方、キーフィールドの `lookup.fieldMappings` がコピー先を列挙している。

```json
"fieldMappings": [
  { "field": "lookupCopyName",   "relatedField": "name"   },
  { "field": "lookupCopyAmount", "relatedField": "amount" }
]
```

`field` は**同じアプリのフィールドコード**。つまり
**対象アプリの `getFormFields` だけでコピー先が判別できる。**
`kintone-pretty-fields` の README が `isLookupCopy` に
「Requires lookup source app permissions」と書いているのは実装の都合で、
情報が無いからではなかった。

**それでも `isLookupCopy` は出さない。** 消費側の参照が 0 件という理由は変わらない。
記録しておくのは、**要ると分かったときに 1 パスで作れる**ことを示すため
（`fieldMappings` を集めて `Set` に入れるだけ。元アプリの権限は要らない）。

## 8. 初期値の生成は持たない

**決定**: フォーム定義の `defaultValue` からレコードの値を作る関数は持たない。

**きっかけ**: `floor-map-3/src/handlers/editHandler.ts:66-68` に継ぎ目がある。

```ts
const initialValue = await getInitialValue(tableField);
// @ts-expect-error
draft[tableField.code].value = initialValue;
```

**持たない理由**

1. `getInitialValue` の 130 行のうち、実質的なロジックは
   **フィールド定義の外から情報が要る箇所だけ**。
   `DATE` / `TIME` / `DATETIME` の `defaultNowValue`（現在時刻）と
   `USER_SELECT` / `ORGANIZATION_SELECT` の `FUNCTION` 解決
   （`LOGINUSER()` / `PRIMARY_ORGANIZATION()`）。残りは `field.defaultValue` の素通し
2. 外部情報を注入しない形にすると**ほぼ恒等関数**になり、存在意義が無い
3. 注入する形にすると**タイムゾーンを kisekae に持ち込む**。
   `defaultNowValue: true` の `DATE` の初期値が「どのタイムゾーンの今日」かは
   フォーム定義に書かれていない（ユーザーの設定側）。
   呼び出し側が整形済みの文字列を渡すことになり、得るものがほぼ消える
4. 需要が弱い。6 本のうち floor-map-3 の 1 本だけ

**継ぎ目はどちらのパッケージにも何も足さずに閉じる。**
monosashi の `setRowValue(row, code, value: unknown)` が実行時に
`VALUE_SHAPE` と突き合わせるので、

```ts
setRowValue(newRow, tableField.code, await getInitialValue(tableField));
```

と書けば型エラーは消え、しかも値の形が違えば `FieldValueError` で落ちる
（今の `@ts-expect-error` は間違った形の代入を黙って通す）。

## 9. レイアウトに現れないフィールド

**決定**: `unplaced` に分けて返す。`enabled` で絞らず**そのまま返す**。

`properties` にあって `layout` に無いものが 2 種類ある。
プロセス管理系（`CATEGORY` / `STATUS` / `STATUS_ASSIGNEE`。フォームの要素ではなく
アプリ設定なので原理的にレイアウトに出ない）と、
利用者がフォームから外した組み込みフィールド。

**理由**

1. `fields` が「レイアウト順」であるという約束を守れる。
   末尾や先頭に足すと、配列の順序が何を意味するのか言えなくなる
2. 消費側が実際に区別している。`filterFieldPrintable` は
   `!isStatus(f) && !isStatusAssignee(f)` で除外し、`hideFields` は
   全フィールドに `setFieldShown(code, false)` を呼ぶ（`CATEGORY` に呼ぶと失敗する）
3. `enabled` を返してしまえば、`enabled` の値が信頼できるかという
   [実測待ちの問題](../../../docs/DECISIONS.md#enabled-は使える判定できないは測っていないことを書いていた)が
   どちらに転んでも kisekae は正しい。pretty-fields は絞っていたが、
   それは `enabled` が信頼できる場合にのみ正しい挙動

### レイアウト要素は 1 つのリストにまとめる

`elements` に `SPACER` / `LABEL` / `HR` を入れ、`type` で判別できるようにする。

`LABEL` / `HR` を捨てる根拠は、pretty-fields のコードにもドキュメントにも無い。
`SPACER` を返すなら同じレイアウト要素である 2 つを落とす説明が必要で、それが無い。
`fields` に混ぜないのは、`fields` は実フィールドだけであるべきだから
（「全フィールドを列挙する」用途で毎回除外が要る）。
`labels` / `hrs` と別キーにしないのは、参照が 0 件でトップレベルのキーを
3 つに増やす価値がないから。`elements.filter((e) => e.type === "SPACER")` で絞れる。

### 実測（2026-09-10）

**`LABEL` と `HR` も `elementId` を持って返る。**

```json
{ "type": "SPACER", "elementId": "spacerNamed", "size": { "width": "100", "height": "50" } }
{ "type": "SPACER", "elementId": "",            "size": { "width": "100", "height": "50" } }
{ "type": "LABEL",  "elementId": "", "label": "labelElement", "size": { "width": "200" } }
{ "type": "HR",     "elementId": "",                          "size": { "width": "200" } }
```

`@kintone/rest-api-client` は `Label = { type; label; size }` /
`HR = { type; size }` と宣言していて **`elementId` を持たない**。
`updateFormLayout` に送っていないので、**kintone が付けて返している**。

3 種すべてが `elementId` を持つので、`elements` は
`elementId` を共通プロパティとして持てる。
名前なしは `""`（消費側が `elementId !== ""` で捨てている前提は正しい）。

**グループの中にレイアウト要素を置ける**ことも確認した（受け入れられ、返ってくる）。
よって `elements` の `parent` は `{ type: "GROUP"; ... } | null` で正しい。
サブテーブルの中身は 17 種のフィールドだけで、レイアウト要素は現れない。

## 10. 命名

**決定**

```ts
export { toForm } from "./toForm.js";
export * as guard from "./guard.js";   // isInTable / isInGroup / isTopLevel
export type { Field, Form, Raw } from "./types.js";
```

型の名前空間は 2 つ。`Field`（整形後）/ `Raw`（生）。

**理由**

- 消費側の `kintonePrettyType.*` 98 箇所のうち **77 が `OneOf`**（79%）。
  `Field.OneOf[]` が主要な語彙になる。単純置換で移行できる
- **ルートから `OneOf` を直接出さない。** 消費側は複数の型ソースを同じファイルで
  併用している（`shared/src/clients/kintoneClient.ts` は `kintoneRecordFieldGet` と
  `kintonePrettyType` を同時に import）。monosashi も `Rest.OneOf` を持つ
- `Pretty` は使わない。pretty-fields を作り直す動機はあの設計を捨てることなので、
  名前に残すと「整形後 = pretty-fields と同じもの」と読まれる

`from(properties, layout)` は使わない。呼び出し側が `from(f.properties, l.layout)` になり、
**「何から何へ」が読めない**。monosashi の DECISIONS「型の名前」が
`Live` を捨てた理由と同じ（「読んで分からない」）。
`to*` は monosashi の規約（`toRestWrite` / `toSetRecord` / `toAddParams`）。
返り値に `Form` という名前を与えるのは、消費側がこれを引数に取る関数を必ず書くため。

`guard` を名前空間に入れるのは、`isInTable` のような一般的な名前をルートに置くと
消費側の import が衝突しやすいから。

## 11. モノレポ

**決定**: 既存の monosashi のリポジトリをモノレポ化する。
`packages/monosashi` / `packages/kisekae` / 非公開の共有パッケージ。

**理由**

1. **実測の根拠が 2 リポジトリに割れると静かに腐る。**
   kisekae の実測は monosashi 側の `fields.ts` / `layout.ts` が定義したアプリを
   測ったもの。別リポジトリだと、フィールドを 1 つ変えた瞬間に kisekae の実測が
   古いアプリの記録になり、それを検出する仕組みがどこにも作れない
2. **リリースのコストが最小。** monosashi の `v*` タグと
   `.github/workflows/release.yml` というパスをそのまま残せば、
   npm の OIDC Trusted Publishing の紐づけが生きる。
   kisekae は新規パッケージなのでどうせ登録が要る（増える手作業がゼロ）。
   リポジトリ名を変えると貼り直しが必要なので**改名は急がない**
3. **共有面が小さい。** kisekae は Playwright を必要としない
   （フォーム定義は REST だけで測れる）。`e2e/` の 1,884 行は monosashi に留まる

**共有するもの**（引用は monosashi 固有の記述の数）

| | 行数 | monosashi 固有 |
|---|--:|--:|
| `tools/shared/`（認証・実行・エラー整形） | 249 | 0 |
| `tools/fixture-app/`（検証アプリの構築・検証） | 1,406 | 0（probe の配備が 3 箇所） |
| `tools/package/bundleSize.ts` | 145 | 6 |
| `tools/package/packCheck.ts` | 507 | **25** |

`packCheck` は**土台だけ共有し、シナリオは各パッケージが持つ**。
507 行の大半は利用者側の TypeScript ソースを文字列で埋め込んだ検査シナリオで、
kisekae には `declare global` も `/kintone` サブパスも無いので中身が別物になる。
土台（tarball を作る / 空のプロジェクトに入れる / `node_modules` に他が入らないことを
確かめる / `bundler` と `nodenext` × TS 2 版で型検査する /
`dist/*.d.ts` を `skipLibCheck: false` で直接検査する）は完全に共通。

**引数化して完全に一般化はしない。** シナリオを書くための DSL を作ることになる。
境界は 2 つ書いてみて初めて正確に引けるので、まず kisekae のシナリオを
素直に書いてから共通部分を抜く。

### ドキュメント

ルートに共通（`CLAUDE.md` / `docs/KINTONE.md` / `docs/TOOLCHAIN.md`）、
各パッケージに固有の `CLAUDE.md` と `docs/DECISIONS.md`。

`CLAUDE.md` は作業ディレクトリとその祖先から読まれるので、
`packages/kisekae` で作業すればルートと kisekae の両方が効く。
共通ルールを 2 箇所に書かずに済み、kisekae 側で monosashi の 2,000 行を読まされない。

monosashi の `docs/DECISIONS.md` 2,500 行は 3 つの塊に分かれている。
kintone 自体の事実（約 235 行）と環境・ツールチェーンの判断（約 250 行）が共通で、
残り約 2,000 行が monosashi 固有。
**ただし分割は実測のあと**（[12](#12-作業順序)）。

### CI

ルートの `check` が biome（ルート 1 回）→ `pnpm -r check`。
`check.yml` は今と同じく `pnpm run check` の 1 ステップだけ
（CLAUDE.md の「CI のワークフローにステップを並べない」）。

**ライブ検証は 1 つのワークフローに両方の採取を入れ、
`concurrency: group: live-verification` を共有する。**
同じ検証アプリを見るので、グループを分けると
`app:build` が monosashi の採取中に走る事故が「たまに落ちる不安定なジョブ」として現れる。

変更されたパッケージだけ検査する（`pnpm --filter "...[origin/main]"`）は**まだ入れない**。
2 パッケージなら常に検査しても数十秒の規模で、
先に入れると「浅い clone で base ref が取れず全部スキップされて緑になる」という
いちばん見つけにくい失敗を抱える。速度が実際に痛くなってから移る。

## 12. 作業順序

**決定**: **実測が先。** モノレポ化より先。

1. 検証アプリのレイアウトに `SPACER` / `LABEL` / `HR` を足す（**済**）
2. `getFormFields` / `getFormLayout` の採取と正規化を作る（**済**）
3. `pnpm run app:build` → `app:collect-form` → `fixture:form` で測る（**済**）
4. [7](#7-ルックアップは判別ユニオンを壊す)と `enabled` を確定させる（**済**）
5. `Raw` / `Field` の型を書く
6. `toForm` とガードを書く
7. モノレポ化（`packages/` への移動、ドキュメント分割、リリース配線）
8. 6 本のプラグインを移行する

**理由**

1. [7](#7-ルックアップは判別ユニオンを壊す)が唯一の未確定で、
   `Raw` と `Field` の 33 種別すべての書き方を決める。ここが決まらないと 1 行も書けない
2. 測るのに要る変更が小さく、モノレポ化と独立している
3. **ドキュメント分割を先にやると、間違った場所に固定してしまう。**
   どの記述が共有なのかは kisekae 側の実測が出てから正確に判断できる。
   `enabled` のように「monosashi の結論が kisekae の実測で覆る」ものがある
4. 先に型を書くのは monosashi が最も強く禁じていること
   （CLAUDE.md「型に書く前に測る」「根拠のない型を書いてはいけない」）。
   フォーム定義については、ドキュメントを読んで書いた型の怪しい箇所が
   すでに 2 件出ている（`Lookup` の 6 プロパティ、`enabled`）

## monosashi に依存しない

**決定**: 依存しない。受け渡しの通貨は**素の値**。

monosashi の `setRowValue(row, code, value: unknown)` が `unknown` を受けて
実行時に検証する設計なので、型で繋ぐ必要がない（[8](#8-初期値の生成は持たない)）。

**捨てた選択肢**

- **kisekae が monosashi に依存する** ── monosashi は実行時依存ゼロを
  `pack:check` で毎回縛っている。kisekae の利用者は `@kintone/dts-gen` の型を
  使っているかもしれないので、型の世界を 2 つ引き込ませることになる
- **monosashi が kisekae に依存する** ── 論外。
  monosashi の DECISIONS が「フォーム定義は守備範囲に入れない」と決めている

## 移行

`kintone-pretty-fields` → `kisekae` は**機械的な置き換えではない**。

| 変更前 | 変更後 |
|---|---|
| `kintonePrettyType.OneOf` | `Field.OneOf` |
| `kintonePrettyFields.isNumber(f)` | `f.type === "NUMBER"` |
| `"table" in f` / `f.table!` | `f.parent?.type === "SUBTABLE"` / `f.parent.code` |
| `f.table` からラベルを `find` | `f.parent?.label` |
| `filter(isSubtable)` / `filter(isGroup)` | `tables` / `groups` |
| `filter(isInSubtable)` / `isNotInSubtable` | `guard.isInTable` / `guard.isTopLevel` |
| `spacers` | `elements.filter((e) => e.type === "SPACER")` |
| `sortedOptions` | 無い。`Object.entries(options).sort()` |
| `isLookupCopy` | 無い |
| `getFields({ client, app, lang, preview })` | 呼び出し側で 2 つの API を叩いて `toForm` |

`shared/src/utils/options.ts` が全プラグイン共通なので、
移行は kintone-plugins 側の 1 つの PR にまとまる（41 ファイル）。

**deprecated エイリアスは作らない**（monosashi の「10. 移行」と同じ方針）。
