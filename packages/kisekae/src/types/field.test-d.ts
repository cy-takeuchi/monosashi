import { describe, expectTypeOf, test } from "vitest";
import type {
	Element,
	ElementParent,
	Field,
	FieldParent,
	Form,
	Group,
	Table,
	Unplaced,
} from "./field.js";
import type { Property } from "./raw.js";

/**
 * 整形後の型が、意図した区別をしていることを縛る。
 *
 * ## ここで見たいのは「通ること」ではない
 *
 * 縛るのは 3 点。
 *
 *  1. **`Raw` との差分が `parent` だけ**であること（派生値を足していない）
 *  2. **`filter((f) => f.type === "...")` が絞れる**こと
 *     （ルックアップの分割が効いている＝判別ユニオンが壊れていない）
 *  3. **あり得ない所属が型で書けない**こと
 *     （組み込みフィールドが「テーブル内」にならない）
 *
 * 2 が kisekae の設計の中心。kintone-pretty-fields は判別ユニオンを
 * 1 メンバで壊し、その穴を 30 個のガードで埋め、しかもそのガードが
 * unsound だった。**壊れていないことを機械で確かめる。**
 */

describe("Raw との差分は parent だけ", () => {
	test("parent を除くと Raw と一致する", () => {
		expectTypeOf<
			Omit<Field.SingleLineText, "parent">
		>().toEqualTypeOf<Property.SingleLineText>();
		expectTypeOf<
			Omit<Field.Number, "parent">
		>().toEqualTypeOf<Property.Number>();
		expectTypeOf<
			Omit<Field.CheckBox, "parent">
		>().toEqualTypeOf<Property.CheckBox>();
		expectTypeOf<
			Omit<Field.UserSelect, "parent">
		>().toEqualTypeOf<Property.UserSelect>();
		expectTypeOf<
			Omit<Field.RecordNumber, "parent">
		>().toEqualTypeOf<Property.RecordNumber>();
		expectTypeOf<
			Omit<Field.ReferenceTable, "parent">
		>().toEqualTypeOf<Property.ReferenceTable>();
	});

	test("値を持つフィールドの所属は 3 択", () => {
		expectTypeOf<Field.SingleLineText["parent"]>().toEqualTypeOf<FieldParent>();
		expectTypeOf<Field.CheckBox["parent"]>().toEqualTypeOf<FieldParent>();
		expectTypeOf<
			Field.LookupSingleLineText["parent"]
		>().toEqualTypeOf<FieldParent>();
	});

	test("テーブル内になり得ないものの所属は 2 択", () => {
		expectTypeOf<Field.RecordNumber["parent"]>().toEqualTypeOf<ElementParent>();
		expectTypeOf<
			Field.ReferenceTable["parent"]
		>().toEqualTypeOf<ElementParent>();
		expectTypeOf<Element.Spacer["parent"]>().toEqualTypeOf<ElementParent>();
	});

	test("派生値を足していない", () => {
		// sortedOptions / isLookupCopy を持たない。
		// キーの集合が Raw + parent と完全に一致することで縛られる
		expectTypeOf<keyof Field.CheckBox>().toEqualTypeOf<
			keyof Property.CheckBox | "parent"
		>();
		expectTypeOf<keyof Field.SingleLineText>().toEqualTypeOf<
			keyof Property.SingleLineText | "parent"
		>();
	});
});

declare const fields: Field.OneOf[];
declare const unplaced: Unplaced[];

describe("type で絞れる（判別ユニオンが壊れていない）", () => {
	/**
	 * **kintone-pretty-fields ではここが絞れなかった。**
	 * `Lookup` の `type` が `"NUMBER" | "SINGLE_LINE_TEXT"` の 2 値だったため。
	 */
	test("文字列 1 行で絞ると、通常とルックアップの 2 メンバになる", () => {
		const narrowed = fields.filter((f) => f.type === "SINGLE_LINE_TEXT");
		expectTypeOf(narrowed).toEqualTypeOf<
			Array<Field.SingleLineText | Field.LookupSingleLineText>
		>();
	});

	test("数値も同じ", () => {
		const narrowed = fields.filter((f) => f.type === "NUMBER");
		expectTypeOf(narrowed).toEqualTypeOf<
			Array<Field.Number | Field.LookupNumber>
		>();
	});

	/** ルックアップが無い種別は 1 メンバに絞れる */
	test("ルックアップになれない種別は 1 メンバに絞れる", () => {
		expectTypeOf(fields.filter((f) => f.type === "CHECK_BOX")).toEqualTypeOf<
			Field.CheckBox[]
		>();
		expectTypeOf(fields.filter((f) => f.type === "FILE")).toEqualTypeOf<
			Field.File[]
		>();
		expectTypeOf(
			fields.filter((f) => f.type === "REFERENCE_TABLE"),
		).toEqualTypeOf<Field.ReferenceTable[]>();
	});

	test("複数種別の合成でも絞れる", () => {
		const narrowed = fields.filter(
			(f) => f.type === "RADIO_BUTTON" || f.type === "DROP_DOWN",
		);
		expectTypeOf(narrowed).toEqualTypeOf<
			Array<Field.RadioButton | Field.Dropdown>
		>();
	});

	test("否定でも絞れる", () => {
		const narrowed = fields.filter(
			(f) => f.type !== "REFERENCE_TABLE" && f.type !== "FILE",
		);
		expectTypeOf(narrowed).toEqualTypeOf<
			Array<Exclude<Field.OneOf, Field.ReferenceTable | Field.File>>
		>();
	});

	/**
	 * ルックアップかどうかは `type` では分からない。`in` で絞る。
	 * `filter` の合成条件では推論が効かないので、そこはガードが要る（次の段）。
	 */
	test("ルックアップは in で絞れる", () => {
		const narrowed = fields.filter((f) => "lookup" in f);
		expectTypeOf(narrowed).toEqualTypeOf<
			Array<Field.LookupSingleLineText | Field.LookupNumber>
		>();
	});
});

describe("あり得ない所属を型で書けない", () => {
	test("組み込みフィールドの所属はグループか null だけ", () => {
		expectTypeOf<Field.RecordNumber["parent"]>().toEqualTypeOf<ElementParent>();
		// テーブル内は取れない
		expectTypeOf<
			Extract<Field.RecordNumber["parent"], { type: "SUBTABLE" }>
		>().toEqualTypeOf<never>();
	});

	test("関連レコード一覧とレイアウト要素も同じ", () => {
		expectTypeOf<
			Extract<Field.ReferenceTable["parent"], { type: "SUBTABLE" }>
		>().toEqualTypeOf<never>();
		expectTypeOf<
			Extract<Element.Spacer["parent"], { type: "SUBTABLE" }>
		>().toEqualTypeOf<never>();
	});

	test("値を持つフィールドはテーブル内になれる", () => {
		expectTypeOf<
			Extract<Field.SingleLineText["parent"], { type: "SUBTABLE" }>
		>().toEqualTypeOf<{ type: "SUBTABLE"; code: string; label: string }>();
	});

	/** 親のラベルを持つので、消費側がコードから引き直さなくて済む */
	test("所属はラベルを持つ", () => {
		expectTypeOf<
			NonNullable<Field.SingleLineText["parent"]>["label"]
		>().toEqualTypeOf<string>();
	});
});

describe("バケツの中身", () => {
	test("fields に SUBTABLE / GROUP / CATEGORY は入らない", () => {
		expectTypeOf<
			Extract<Field.OneOf, { type: "SUBTABLE" }>
		>().toEqualTypeOf<never>();
		expectTypeOf<
			Extract<Field.OneOf, { type: "GROUP" }>
		>().toEqualTypeOf<never>();
		expectTypeOf<
			Extract<Field.OneOf, { type: "CATEGORY" }>
		>().toEqualTypeOf<never>();
	});

	test("tables / groups は中のフィールドと所属を持たない", () => {
		expectTypeOf<keyof Table>().toEqualTypeOf<
			"type" | "code" | "label" | "noLabel"
		>();
		expectTypeOf<keyof Group>().toEqualTypeOf<
			"type" | "code" | "label" | "noLabel" | "openGroup"
		>();
	});

	test("unplaced は parent を持たない", () => {
		expectTypeOf<
			Extract<Unplaced, { parent: unknown }>
		>().toEqualTypeOf<never>();
	});

	/** `enabled` を見て絞れる形で返る（kisekae は絞らない） */
	test("unplaced でも type で絞れる", () => {
		expectTypeOf(unplaced.filter((f) => f.type === "CATEGORY")).toEqualTypeOf<
			Property.Category[]
		>();
		expectTypeOf(unplaced.filter((f) => f.type === "STATUS")).toEqualTypeOf<
			Property.Status[]
		>();
	});

	test("Form のキーは 5 つ", () => {
		expectTypeOf<keyof Form>().toEqualTypeOf<
			"fields" | "tables" | "groups" | "elements" | "unplaced"
		>();
	});

	/**
	 * **`Unplaced` は `Property.OneOf` を 26 メンバ書き写している。**
	 * `Raw` に種別が増えたときに書き忘れると、その種別だけ
	 * 「レイアウトに無いと消える」ことになるが、型は通る。
	 *
	 * 種別を絞っていないことが `Unplaced` の設計なので
	 * （「値を持つフィールドは必ずレイアウトに現れる」は測っていない）、
	 * **絞られていないことを機械で見る。**
	 *
	 * ルックアップとサブテーブルは形を変えて入れるので除く
	 * （`LookupSingleLineTextProperty` / `LookupNumberProperty` と `Table`）。
	 */
	test("ルックアップとサブテーブル以外の全プロパティを unplaced が受ける", () => {
		expectTypeOf<
			Exclude<
				Property.OneOf,
				| Property.Lookup
				| Property.Subtable<{ [fieldCode: string]: Property.InSubtable }>
			>
		>().toMatchTypeOf<Unplaced>();
	});
});
