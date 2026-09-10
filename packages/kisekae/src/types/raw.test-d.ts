import type {
	KintoneFormFieldProperty,
	KintoneFormLayout,
} from "@kintone/rest-api-client";
import { describe, expectTypeOf, test } from "vitest";
import type { Layout, Property } from "./raw.js";

/**
 * 自前の `Raw` が `@kintone/rest-api-client` と等価であることを縛る。
 *
 * ## これは正しさの判定ではない。トリップワイヤ
 *
 * 根拠は 3 つに分かれている（`docs/DECISIONS.md`「5. 等価性テスト」）。
 *
 * | | 根拠 | 縛るもの |
 * |---|---|---|
 * | ① 実測が正 | `fixtures/form/definition.json` | 実測した箇所 |
 * | ② ドキュメントが正 | 公式の型 | 実測していない箇所 |
 * | ③ 乖離の検出 | **このファイル** | ①②のどちらかが動いたら落ちる |
 *
 * ここが落ちたときに公式の型に合わせるのではない。
 * **どちらが正しいかを①で決めて、決めた結果をこのファイルの式に書く。**
 *
 * ## なぜ要るか
 *
 * 利用者は `client.app.getFormFields()` の結果を `toForm` に渡す。
 * 乖離するとそこで型エラーになるのは**利用者の手元**で、
 * こちらは何もしていないのに壊れる。
 *
 * `@kintone/rest-api-client` は devDependency としてこのリポジトリには
 * 常に在るので、利用者に負担をかけずに突き合わせられる
 * （公開する `.d.ts` からは参照しない。`pack:check` がそれを縛る）。
 *
 * ## 逃げ道は作らない
 *
 * 「この型は突き合わせない」という許容リストは作らない。
 * 対象が時間とともに広がり、何が確かめられているのか読めなくなる。
 *
 * 既知の乖離は**交差型で式の中に書く**。乖離の内容そのものが型で固定されるので、
 * 片側が動いた瞬間に落ちる。素の等価性で書くと初日から赤になり、
 * 「毎回差分が出て、やがて誰も見なくなる」状態になる。
 */

describe("プロパティの型が公式と等価", () => {
	/**
	 * `OneOf` が一致すれば全メンバが一致する。
	 * ただし落ちたときにどのメンバが原因か分からないので、種別ごとも並べる。
	 */
	test("OneOf が完全に一致する", () => {
		expectTypeOf<Property.OneOf>().toEqualTypeOf<KintoneFormFieldProperty.OneOf>();
	});

	test("サブテーブルに入れられる種別が一致する", () => {
		expectTypeOf<Property.InSubtable>().toEqualTypeOf<KintoneFormFieldProperty.InSubtable>();
	});

	test("組み込みフィールド", () => {
		expectTypeOf<Property.RecordNumber>().toEqualTypeOf<KintoneFormFieldProperty.RecordNumber>();
		expectTypeOf<Property.Creator>().toEqualTypeOf<KintoneFormFieldProperty.Creator>();
		expectTypeOf<Property.CreatedTime>().toEqualTypeOf<KintoneFormFieldProperty.CreatedTime>();
		expectTypeOf<Property.Modifier>().toEqualTypeOf<KintoneFormFieldProperty.Modifier>();
		expectTypeOf<Property.UpdatedTime>().toEqualTypeOf<KintoneFormFieldProperty.UpdatedTime>();
	});

	test("プロセス管理・カテゴリー（enabled を持つ）", () => {
		expectTypeOf<Property.Category>().toEqualTypeOf<KintoneFormFieldProperty.Category>();
		expectTypeOf<Property.Status>().toEqualTypeOf<KintoneFormFieldProperty.Status>();
		expectTypeOf<Property.StatusAssignee>().toEqualTypeOf<KintoneFormFieldProperty.StatusAssignee>();
	});

	test("文字列・数値・計算", () => {
		expectTypeOf<Property.SingleLineText>().toEqualTypeOf<KintoneFormFieldProperty.SingleLineText>();
		expectTypeOf<Property.MultiLineText>().toEqualTypeOf<KintoneFormFieldProperty.MultiLineText>();
		expectTypeOf<Property.RichText>().toEqualTypeOf<KintoneFormFieldProperty.RichText>();
		expectTypeOf<Property.Number>().toEqualTypeOf<KintoneFormFieldProperty.Number>();
		expectTypeOf<Property.Calc>().toEqualTypeOf<KintoneFormFieldProperty.Calc>();
		expectTypeOf<Property.Link>().toEqualTypeOf<KintoneFormFieldProperty.Link>();
	});

	test("選択系（options を持つ）", () => {
		expectTypeOf<Property.CheckBox>().toEqualTypeOf<KintoneFormFieldProperty.CheckBox>();
		expectTypeOf<Property.RadioButton>().toEqualTypeOf<KintoneFormFieldProperty.RadioButton>();
		expectTypeOf<Property.Dropdown>().toEqualTypeOf<KintoneFormFieldProperty.Dropdown>();
		expectTypeOf<Property.MultiSelect>().toEqualTypeOf<KintoneFormFieldProperty.MultiSelect>();
	});

	test("日時・添付ファイル", () => {
		expectTypeOf<Property.Date>().toEqualTypeOf<KintoneFormFieldProperty.Date>();
		expectTypeOf<Property.Time>().toEqualTypeOf<KintoneFormFieldProperty.Time>();
		expectTypeOf<Property.DateTime>().toEqualTypeOf<KintoneFormFieldProperty.DateTime>();
		expectTypeOf<Property.File>().toEqualTypeOf<KintoneFormFieldProperty.File>();
	});

	test("ユーザー・組織・グループ選択", () => {
		expectTypeOf<Property.UserSelect>().toEqualTypeOf<KintoneFormFieldProperty.UserSelect>();
		expectTypeOf<Property.OrganizationSelect>().toEqualTypeOf<KintoneFormFieldProperty.OrganizationSelect>();
		expectTypeOf<Property.GroupSelect>().toEqualTypeOf<KintoneFormFieldProperty.GroupSelect>();
	});

	test("グループ・関連レコード一覧・ルックアップ・サブテーブル", () => {
		expectTypeOf<Property.Group>().toEqualTypeOf<KintoneFormFieldProperty.Group>();
		expectTypeOf<Property.ReferenceTable>().toEqualTypeOf<KintoneFormFieldProperty.ReferenceTable>();
		expectTypeOf<Property.Lookup>().toEqualTypeOf<KintoneFormFieldProperty.Lookup>();
		expectTypeOf<
			Property.Subtable<{ [code: string]: Property.InSubtable }>
		>().toEqualTypeOf<
			KintoneFormFieldProperty.Subtable<{
				[code: string]: KintoneFormFieldProperty.InSubtable;
			}>
		>();
	});
});

/**
 * 交差型を平坦化する。
 *
 * `toEqualTypeOf` は `A & { x: string }` と
 * `{ ...Aのキー..., x: string }` を**等価と見ない**（実際に落ちた）。
 * 乖離を交差型で書くには、比較の前に平坦化する必要がある。
 */
type Flatten<T> = { [K in keyof T]: T[K] };

/** 公式の `Label` に、実測で分かった `elementId` を足したもの */
type PatchedLabel = Flatten<
	KintoneFormLayout.Field.Label & { elementId: string }
>;
/** 公式の `HR` に、実測で分かった `elementId` を足したもの */
type PatchedHR = Flatten<KintoneFormLayout.Field.HR & { elementId: string }>;

/** 公式の要素のユニオンに、上の 2 つを差し替えたもの */
type PatchedElement =
	| Exclude<
			KintoneFormLayout.Field.OneOf,
			KintoneFormLayout.Field.Label | KintoneFormLayout.Field.HR
	  >
	| PatchedLabel
	| PatchedHR;

describe("レイアウト要素の型が公式と等価", () => {
	test("フィールドのレイアウト（size を持つもの）", () => {
		expectTypeOf<Layout.Element.SingleLineText>().toEqualTypeOf<KintoneFormLayout.Field.SingleLineText>();
		expectTypeOf<Layout.Element.Number>().toEqualTypeOf<KintoneFormLayout.Field.Number>();
		expectTypeOf<Layout.Element.Calc>().toEqualTypeOf<KintoneFormLayout.Field.Calc>();
		expectTypeOf<Layout.Element.Link>().toEqualTypeOf<KintoneFormLayout.Field.Link>();
		expectTypeOf<Layout.Element.CheckBox>().toEqualTypeOf<KintoneFormLayout.Field.CheckBox>();
		expectTypeOf<Layout.Element.RadioButton>().toEqualTypeOf<KintoneFormLayout.Field.RadioButton>();
		expectTypeOf<Layout.Element.Dropdown>().toEqualTypeOf<KintoneFormLayout.Field.Dropdown>();
		expectTypeOf<Layout.Element.MultiSelect>().toEqualTypeOf<KintoneFormLayout.Field.MultiSelect>();
		expectTypeOf<Layout.Element.File>().toEqualTypeOf<KintoneFormLayout.Field.File>();
		expectTypeOf<Layout.Element.Date>().toEqualTypeOf<KintoneFormLayout.Field.Date>();
		expectTypeOf<Layout.Element.Time>().toEqualTypeOf<KintoneFormLayout.Field.Time>();
		expectTypeOf<Layout.Element.DateTime>().toEqualTypeOf<KintoneFormLayout.Field.DateTime>();
		expectTypeOf<Layout.Element.UserSelect>().toEqualTypeOf<KintoneFormLayout.Field.UserSelect>();
		expectTypeOf<Layout.Element.OrganizationSelect>().toEqualTypeOf<KintoneFormLayout.Field.OrganizationSelect>();
		expectTypeOf<Layout.Element.GroupSelect>().toEqualTypeOf<KintoneFormLayout.Field.GroupSelect>();
	});

	test("組み込みフィールドのレイアウト", () => {
		expectTypeOf<Layout.Element.RecordNumber>().toEqualTypeOf<KintoneFormLayout.Field.RecordNumber>();
		expectTypeOf<Layout.Element.Creator>().toEqualTypeOf<KintoneFormLayout.Field.Creator>();
		expectTypeOf<Layout.Element.CreatedTime>().toEqualTypeOf<KintoneFormLayout.Field.CreatedTime>();
		expectTypeOf<Layout.Element.Modifier>().toEqualTypeOf<KintoneFormLayout.Field.Modifier>();
		expectTypeOf<Layout.Element.UpdatedTime>().toEqualTypeOf<KintoneFormLayout.Field.UpdatedTime>();
	});

	test("size に innerHeight が付くのは複数行文字列とリッチテキストだけ", () => {
		expectTypeOf<Layout.Element.MultiLineText>().toEqualTypeOf<KintoneFormLayout.Field.MultiLineText>();
		expectTypeOf<Layout.Element.RichText>().toEqualTypeOf<KintoneFormLayout.Field.RichText>();
	});

	test("関連レコード一覧は size を持たない", () => {
		expectTypeOf<Layout.Element.ReferenceTable>().toEqualTypeOf<KintoneFormLayout.Field.ReferenceTable>();
	});

	test("スペースは公式と等価", () => {
		expectTypeOf<Layout.Element.Spacer>().toEqualTypeOf<KintoneFormLayout.Field.Spacer>();
	});

	test("サブテーブルの中身は公式と等価（レイアウト要素が入らないため）", () => {
		expectTypeOf<Layout.Element.InSubtable>().toEqualTypeOf<KintoneFormLayout.Field.InSubtable>();
	});
});

describe("実測が公式の型を否定した箇所", () => {
	/**
	 * **2026-09-10 実測。** `getFormLayout` は `LABEL` / `HR` にも
	 * `elementId` を返す。公式の型は宣言していない。
	 *
	 * `updateFormLayout` に `elementId` を送っていないので
	 * （`tools/fixture-app/layout.ts` を見れば分かる）、**kintone が付けている。**
	 * 名前を付けていないラベル・罫線では空文字列。
	 *
	 * ここを素の `toEqualTypeOf` で書くと**初日から赤になる**。
	 * 交差型で乖離の内容を固定し、**公式が `elementId` を足したら落ちる**形にする。
	 * 落ちたときは `PatchedLabel` / `PatchedHR` の交差を消す
	 * （それが乖離が解消したという意味）。
	 */
	test("LABEL は公式の型に elementId を足したもの", () => {
		expectTypeOf<Layout.Element.Label>().toEqualTypeOf<PatchedLabel>();
	});

	test("HR は公式の型に elementId を足したもの", () => {
		expectTypeOf<Layout.Element.HR>().toEqualTypeOf<PatchedHR>();
	});

	/**
	 * 乖離は `elementId` だけであることを縛る。
	 *
	 * ここが落ちたら、`elementId` 以外の乖離が新たに生まれたということ。
	 */
	test("要素のユニオンの乖離は LABEL / HR の elementId だけ", () => {
		expectTypeOf<Layout.Element.OneOf>().toEqualTypeOf<PatchedElement>();
	});
});

describe("レイアウトのコンテナ", () => {
	/**
	 * `Label` / `HR` の乖離は、それを含むコンテナ
	 * （`Row` / `Group`）にも伝播する。そのままでは公式と等価にならない。
	 *
	 * **コンテナの形と、中身の型を分けて縛る。**
	 *
	 *  1. 公式のコンテナの形を固定する（公式が `Row` にキーを足したら落ちる）
	 *  2. こちらのコンテナが「その形に patched な要素を入れたもの」であることを縛る
	 *
	 * 1 を省くと 2 が「公式と無関係な形の宣言」になり、トリップワイヤでなくなる。
	 */
	test("公式のコンテナの形", () => {
		expectTypeOf<KintoneFormLayout.Row<never[]>>().toEqualTypeOf<{
			type: "ROW";
			fields: never[];
		}>();
		expectTypeOf<KintoneFormLayout.Subtable<never[]>>().toEqualTypeOf<{
			type: "SUBTABLE";
			code: string;
			fields: never[];
		}>();
		expectTypeOf<KintoneFormLayout.Group<never[]>>().toEqualTypeOf<{
			type: "GROUP";
			code: string;
			layout: never[];
		}>();
	});

	test("こちらのコンテナは公式の形に patched な要素を入れたもの", () => {
		expectTypeOf<Layout.Row>().toEqualTypeOf<{
			type: "ROW";
			fields: PatchedElement[];
		}>();
		expectTypeOf<Layout.Subtable>().toEqualTypeOf<{
			type: "SUBTABLE";
			code: string;
			fields: KintoneFormLayout.Field.InSubtable[];
		}>();
		expectTypeOf<Layout.Group>().toEqualTypeOf<{
			type: "GROUP";
			code: string;
			layout: Array<{ type: "ROW"; fields: PatchedElement[] }>;
		}>();
	});

	/** `getFormLayout` が返す配列の要素 */
	test("トップレベルは行・サブテーブル・グループの 3 択", () => {
		expectTypeOf<Layout.OneOf>().toEqualTypeOf<
			Layout.Row | Layout.Subtable | Layout.Group
		>();
	});
});
