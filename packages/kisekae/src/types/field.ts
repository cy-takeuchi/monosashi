import type { Layout, LookupConfig, Property } from "./raw.js";

/**
 * 整形後のフォーム定義。kisekae が返す形。
 *
 * `Raw`（`getFormFields` / `getFormLayout` が返す形）に対して、
 * この層がやることは 2 つだけ。
 *
 *  1. **所属を必須のプロパティにする**（`parent`）。親のラベルも持つ
 *  2. **ルックアップを種別ごとに分ける**
 *
 * それ以外はフィールドの内容をそのまま通す。
 * `sortedOptions` のような派生値は持たない
 * （`docs/DECISIONS.md`「2. 返り値の形」の「派生値を持たない」）。
 *
 * ## `Raw` との差分は交差型で書く
 *
 * `Property.SingleLineText & { parent: FieldParent }` の形。
 * 全種別を書き下すと `Raw` と二重管理になり、しかも
 * **どちらが正か機械で言えなくなる**（`Raw` は公式と実測の両方で縛られている）。
 *
 * 条件型で導出はしない。tsumekae の CLAUDE.md が禁じている
 * 「ホバー表示とエラーメッセージが壊れる導出」（kintone-typeguard が
 * `FFF<A,B,C,D>` で失敗した道）に当たる。交差型はそれには当たらない。
 *
 * 差分が `parent` だけであることは `field.test-d.ts` が縛っている。
 */

/** 親のテーブル / グループ。`label` を持つので消費側がコードから引き直さなくて済む */
export type Parent =
	| { type: "SUBTABLE"; code: string; label: string }
	| { type: "GROUP"; code: string; label: string };

/**
 * 所属。`null` は**フォームのトップレベルに置かれている**という意味。
 *
 * 「フォームに置かれていない」は `null` ではなく `unplaced` で表す
 * （`Form` の項）。この 2 つを `null` で兼ねると区別できなくなる。
 */
export type FieldParent = Parent | null;

/**
 * テーブル内になり得ないものの所属。
 *
 * サブテーブルの中身は 17 種のフィールドだけで、
 * 組み込みフィールド・`REFERENCE_TABLE`・レイアウト要素は入らない
 * （公式の型の `InSubtable` が `Exclude` していて、実測でも一致した）。
 * その事実を型に出す。
 */
export type ElementParent = Extract<Parent, { type: "GROUP" }> | null;

/**
 * ルックアップのキーフィールドを種別ごとに分けたもの（所属を付ける前）。
 *
 * ## なぜ分けるのか
 *
 * 公式の型は `type: "NUMBER" | "SINGLE_LINE_TEXT"` の 1 つのメンバで表すが、
 * **判別子が 2 値のメンバが混ざるとユニオン全体が判別ユニオンでなくなり、
 * TypeScript の型述語推論が死ぬ**（`docs/DECISIONS.md`「7. ルックアップ」）。
 *
 * ```
 * (A | B)[].filter((f) => f.type === "A")      → A[]        絞れる
 * (A | B | L)[].filter((f) => f.type === "A")  → (A|B|L)[]  絞れない
 * ```
 *
 * kintone-pretty-fields が 30 個のガードを必要としたのはこれが原因で、
 * しかもそのガード（`isSingleLineText`）はルックアップを通してしまう
 * unsound なものだった。
 *
 * ## 通常プロパティを持たない
 *
 * 2026-09-10 実測。`maxLength` / `unique` / `defaultValue` / `expression` は
 * 付いてこない。だから「各型に optional な `lookup` を足す」形は採れない
 * （型が「ある」と言うのに実行時は `undefined` になる）。
 */
export type LookupSingleLineTextProperty = {
	type: "SINGLE_LINE_TEXT";
	code: string;
	label: string;
	noLabel: boolean;
	required: boolean;
	lookup: LookupConfig;
};

export type LookupNumberProperty = {
	type: "NUMBER";
	code: string;
	label: string;
	noLabel: boolean;
	required: boolean;
	lookup: LookupConfig;
};

/**
 * `Form.fields` の要素。**フォームに置かれた実フィールド。**
 *
 * `SUBTABLE` と `GROUP` は入らない（`Form.tables` / `Form.groups` に分ける）。
 * `CATEGORY` / `STATUS` / `STATUS_ASSIGNEE` も入らない
 * （レイアウトに現れないので `Form.unplaced`）。
 */
export namespace Field {
	// --- サブテーブルに入れられる 17 種。所属は 3 択 ---

	export type SingleLineText = Property.SingleLineText & {
		parent: FieldParent;
	};
	export type Number = Property.Number & { parent: FieldParent };
	export type Calc = Property.Calc & { parent: FieldParent };
	export type MultiLineText = Property.MultiLineText & { parent: FieldParent };
	export type RichText = Property.RichText & { parent: FieldParent };
	export type Link = Property.Link & { parent: FieldParent };
	export type CheckBox = Property.CheckBox & { parent: FieldParent };
	export type RadioButton = Property.RadioButton & { parent: FieldParent };
	export type Dropdown = Property.Dropdown & { parent: FieldParent };
	export type MultiSelect = Property.MultiSelect & { parent: FieldParent };
	export type File = Property.File & { parent: FieldParent };
	export type Date = Property.Date & { parent: FieldParent };
	export type Time = Property.Time & { parent: FieldParent };
	export type DateTime = Property.DateTime & { parent: FieldParent };
	export type UserSelect = Property.UserSelect & { parent: FieldParent };
	export type OrganizationSelect = Property.OrganizationSelect & {
		parent: FieldParent;
	};
	export type GroupSelect = Property.GroupSelect & { parent: FieldParent };

	/** ルックアップのキーフィールド。種別ごとに分ける */
	export type LookupSingleLineText = LookupSingleLineTextProperty & {
		parent: FieldParent;
	};
	export type LookupNumber = LookupNumberProperty & { parent: FieldParent };

	// --- テーブル内になり得ないもの。所属は 2 択 ---

	export type RecordNumber = Property.RecordNumber & {
		parent: ElementParent;
	};
	export type Creator = Property.Creator & { parent: ElementParent };
	export type CreatedTime = Property.CreatedTime & { parent: ElementParent };
	export type Modifier = Property.Modifier & { parent: ElementParent };
	export type UpdatedTime = Property.UpdatedTime & { parent: ElementParent };
	export type ReferenceTable = Property.ReferenceTable & {
		parent: ElementParent;
	};

	/** サブテーブルの中に置ける種別 */
	export type InSubtable =
		| SingleLineText
		| Number
		| Calc
		| MultiLineText
		| RichText
		| Link
		| CheckBox
		| RadioButton
		| Dropdown
		| MultiSelect
		| File
		| Date
		| Time
		| DateTime
		| UserSelect
		| OrganizationSelect
		| GroupSelect
		| LookupSingleLineText
		| LookupNumber;

	export type OneOf =
		| InSubtable
		| RecordNumber
		| Creator
		| CreatedTime
		| Modifier
		| UpdatedTime
		| ReferenceTable;
}

/**
 * `Form.elements` の要素。フィールドではないレイアウト要素。
 *
 * 3 種すべてが `elementId` を持つ（`LABEL` / `HR` は 2026-09-10 実測。
 * 公式の型は宣言していない）。名前を付けていなければ空文字列。
 */
export namespace Element {
	export type Spacer = Layout.Element.Spacer & { parent: ElementParent };
	export type Label = Layout.Element.Label & { parent: ElementParent };
	export type HR = Layout.Element.HR & { parent: ElementParent };

	export type OneOf = Spacer | Label | HR;
}

/**
 * `Form.tables` の要素。
 *
 * **中のフィールドを持たない。** 消費側 6 本のうち 1 つも見ていなかった。
 * 持たせると同じフィールドが 2 箇所に現れ、片方だけ加工されたときに壊れる。
 * テーブル内のフィールドは `fields.filter((f) => f.parent?.code === code)` で取れる。
 *
 * **所属を持たない。** サブテーブルはトップレベルにしか置けない
 * （グループの中身は `ROW` だけ）。
 */
export type Table = {
	type: "SUBTABLE";
	code: string;
	label: string;
	noLabel: boolean;
};

/**
 * `Form.groups` の要素。
 *
 * `Table` と同じく中のフィールドと所属を持たない
 * （グループは入れ子にできない）。
 */
export type Group = {
	type: "GROUP";
	code: string;
	label: string;
	noLabel: boolean;
	openGroup: boolean;
};

/**
 * `Form.unplaced` の要素。**`properties` にあって `layout` に無いもの。**
 *
 * 2 種類ある。
 *
 *  - **プロセス管理・カテゴリー** ... フォームの要素ではなくアプリ設定なので
 *    原理的にレイアウトに出ない。`enabled` が設定を反映する（2026-09-10 実測）
 *  - **フォームから外した組み込みフィールド**
 *
 * **`parent` を持たない。** 「フォームに置かれていない」ことと
 * 「トップレベルに置かれている」（`parent: null`）は違う。
 * `parent: null` で兼ねると区別できなくなる。
 *
 * ## 種別を絞っていない理由
 *
 * 「値を持つフィールドは必ずレイアウトに現れる」は**測っていない**。
 * `updateFormLayout` でフィールドを省いたときに受け入れられるかを
 * 確かめていないので、絞らずに全種別を受ける。
 * 絞ると、測っていない主張を型で言うことになる。
 *
 * `SUBTABLE` / `GROUP` は `Table` / `Group` と同じ形で入る
 * （中のフィールドを持たない）。
 */
export type Unplaced =
	| Property.RecordNumber
	| Property.Creator
	| Property.CreatedTime
	| Property.Modifier
	| Property.UpdatedTime
	| Property.Category
	| Property.Status
	| Property.StatusAssignee
	| Property.SingleLineText
	| Property.Number
	| Property.Calc
	| Property.MultiLineText
	| Property.RichText
	| Property.Link
	| Property.CheckBox
	| Property.RadioButton
	| Property.Dropdown
	| Property.MultiSelect
	| Property.File
	| Property.Date
	| Property.Time
	| Property.DateTime
	| Property.UserSelect
	| Property.OrganizationSelect
	| Property.GroupSelect
	| Property.ReferenceTable
	| LookupSingleLineTextProperty
	| LookupNumberProperty
	| Table
	| Group;

/**
 * `toForm` が返すもの。
 *
 * ## なぜ 5 つに分けるのか
 *
 * kintone-pretty-fields は `{ fields, spacers }` の 2 つで、
 * 消費側 6 本が同じ 2 行（`filter(isSubtable)` / `filter(isGroup)`）を
 * 毎回書いていた。ここで返してしまう。
 *
 * | | |
 * |---|---|
 * | `fields` | フォームに置かれた実フィールド。**レイアウト順**。所属あり |
 * | `tables` | サブテーブル。中のフィールドは持たない |
 * | `groups` | グループ。同上 |
 * | `elements` | `SPACER` / `LABEL` / `HR`。**レイアウト順**。所属あり |
 * | `unplaced` | `properties` にあって `layout` に無いもの。所属を持たない |
 *
 * ## 順序
 *
 * `fields` と `elements` は**レイアウト順**（左上が先、右下が後）。
 * 位置を持たないものが混ざらないので、この約束が守れる。
 * kintone-pretty-fields は位置を持たないフィールドを配列に混ぜていて、
 * しかも先頭に足すか末尾に足すかが揃っていなかった。
 *
 * `tables` / `groups` もレイアウト順。`unplaced` は `properties` の
 * キー順（`getFormFields` が返した順序）。
 */
export type Form = {
	fields: Field.OneOf[];
	tables: Table[];
	groups: Group[];
	elements: Element.OneOf[];
	unplaced: Unplaced[];
};
