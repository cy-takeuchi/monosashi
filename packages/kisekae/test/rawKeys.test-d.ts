import { describe, expectTypeOf, test } from "vitest";
import type { Layout, Property } from "../src/types/raw.js";
import type {
	LAYOUT_CONTAINER_KEYS,
	LAYOUT_ELEMENT_KEYS,
	PROPERTY_KEYS,
} from "./rawKeys.js";

/**
 * キーの表が `Raw` の型と一致していることを縛る。
 *
 * これは 3 点のうちの 1 辺（`rawKeys.ts` の図）。
 * 表と実測の突き合わせは `rawFixture.test.ts`。
 *
 * **表だけを直しても、型だけを直しても落ちる。**
 * 表は実行時のテストが使うので、ここが無いと
 * 「表は古いが実測と一致しているので緑」という状態があり得る。
 *
 * ## 1 件ずつ書かない
 *
 * 以前は `expectTypeOf<KeysOf<typeof PROPERTY_KEYS.CALC>>()` の形で
 * 30 件を手で並べていた。**表に行を足して assert を書き忘れても緑になる。**
 * レイアウト要素に至っては 26 件のうち 3 件しか見ておらず、
 * その旨（「代表を見る」）がコメントに書いてあった。
 *
 * 表のキーと型の対応を `対応表` に持ち、`keyof` が表と一致することを
 * 縛ったうえで、全件の突き合わせを 1 式で行う。
 * **表に足して対応表に書き忘れると、そこで落ちる。**
 *
 * tsumekae の `test/fieldTypes.ts` + `coverage.test.ts` と同じ手口
 * （あちらは `Record<ObservedFieldType, ...>` で 28 種別を縛っている）。
 */

/** 表の要素の型を、キーの union として取り出す */
type KeysOf<T extends readonly string[]> = T[number];

/**
 * 表のキーと型の対応。
 *
 * ルックアップだけ `type` で引けないので `LOOKUP` という別のキーで持つ
 * （判定は `"lookup" in property`）。理由は `rawKeys.ts`。
 */
type PropertyTypeOf = {
	RECORD_NUMBER: Property.RecordNumber;
	CREATOR: Property.Creator;
	CREATED_TIME: Property.CreatedTime;
	MODIFIER: Property.Modifier;
	UPDATED_TIME: Property.UpdatedTime;
	CATEGORY: Property.Category;
	STATUS: Property.Status;
	STATUS_ASSIGNEE: Property.StatusAssignee;
	SINGLE_LINE_TEXT: Property.SingleLineText;
	NUMBER: Property.Number;
	CALC: Property.Calc;
	MULTI_LINE_TEXT: Property.MultiLineText;
	RICH_TEXT: Property.RichText;
	LINK: Property.Link;
	CHECK_BOX: Property.CheckBox;
	RADIO_BUTTON: Property.RadioButton;
	DROP_DOWN: Property.Dropdown;
	MULTI_SELECT: Property.MultiSelect;
	FILE: Property.File;
	DATE: Property.Date;
	TIME: Property.Time;
	DATETIME: Property.DateTime;
	USER_SELECT: Property.UserSelect;
	ORGANIZATION_SELECT: Property.OrganizationSelect;
	GROUP_SELECT: Property.GroupSelect;
	GROUP: Property.Group;
	REFERENCE_TABLE: Property.ReferenceTable;
	SUBTABLE: Property.Subtable<{ [fieldCode: string]: Property.InSubtable }>;
	LOOKUP: Property.Lookup;
};

type LayoutElementTypeOf = {
	RECORD_NUMBER: Layout.Element.RecordNumber;
	CREATOR: Layout.Element.Creator;
	CREATED_TIME: Layout.Element.CreatedTime;
	MODIFIER: Layout.Element.Modifier;
	UPDATED_TIME: Layout.Element.UpdatedTime;
	SINGLE_LINE_TEXT: Layout.Element.SingleLineText;
	NUMBER: Layout.Element.Number;
	CALC: Layout.Element.Calc;
	MULTI_LINE_TEXT: Layout.Element.MultiLineText;
	RICH_TEXT: Layout.Element.RichText;
	LINK: Layout.Element.Link;
	CHECK_BOX: Layout.Element.CheckBox;
	RADIO_BUTTON: Layout.Element.RadioButton;
	DROP_DOWN: Layout.Element.Dropdown;
	MULTI_SELECT: Layout.Element.MultiSelect;
	FILE: Layout.Element.File;
	DATE: Layout.Element.Date;
	TIME: Layout.Element.Time;
	DATETIME: Layout.Element.DateTime;
	USER_SELECT: Layout.Element.UserSelect;
	ORGANIZATION_SELECT: Layout.Element.OrganizationSelect;
	GROUP_SELECT: Layout.Element.GroupSelect;
	REFERENCE_TABLE: Layout.Element.ReferenceTable;
	LABEL: Layout.Element.Label;
	HR: Layout.Element.HR;
	SPACER: Layout.Element.Spacer;
};

type LayoutContainerTypeOf = {
	ROW: Layout.Row;
	SUBTABLE: Layout.Subtable;
	GROUP: Layout.Group;
};

/**
 * 表と型でキーの集合が食い違っているものだけを残す。
 *
 * 両向きの `extends` で見る。片向きだと、表が型より少ないときに通ってしまう。
 */
type Mismatched<
	Table extends { [key in keyof Types]: readonly string[] },
	Types,
> = {
	[K in keyof Types]: KeysOf<Table[K]> extends keyof Types[K]
		? keyof Types[K] extends KeysOf<Table[K]>
			? never
			: K
		: K;
}[keyof Types];

describe("表と型の対応が漏れていない", () => {
	// **対応表に書き忘れると、ここで落ちる。**
	// 表に種別を足したのに突き合わせを書かない、という漏れ方を塞ぐ
	test("プロパティの表と対応表のキーが一致する", () => {
		expectTypeOf<keyof PropertyTypeOf>().toEqualTypeOf<
			keyof typeof PROPERTY_KEYS
		>();
	});

	test("レイアウト要素の表と対応表のキーが一致する", () => {
		expectTypeOf<keyof LayoutElementTypeOf>().toEqualTypeOf<
			keyof typeof LAYOUT_ELEMENT_KEYS
		>();
	});

	test("コンテナの表と対応表のキーが一致する", () => {
		expectTypeOf<keyof LayoutContainerTypeOf>().toEqualTypeOf<
			keyof typeof LAYOUT_CONTAINER_KEYS
		>();
	});
});

describe("表のキーが型と一致する", () => {
	test("プロパティ 29 種すべて", () => {
		expectTypeOf<
			Mismatched<typeof PROPERTY_KEYS, PropertyTypeOf>
		>().toEqualTypeOf<never>();
	});

	// **以前は 26 件のうち 3 件しか見ていなかった**（「代表を見る」）。
	// 22 件が `["type", "code", "size"]` で同じなので、
	// 1 件ずつ書くのを避けた結果、残り 23 件が検査されていなかった
	test("レイアウト要素 26 種すべて", () => {
		expectTypeOf<
			Mismatched<typeof LAYOUT_ELEMENT_KEYS, LayoutElementTypeOf>
		>().toEqualTypeOf<never>();
	});

	test("コンテナ 3 種すべて", () => {
		expectTypeOf<
			Mismatched<typeof LAYOUT_CONTAINER_KEYS, LayoutContainerTypeOf>
		>().toEqualTypeOf<never>();
	});

	/**
	 * 空振りでないことの当たり。
	 *
	 * `Mismatched` が `never` を返すだけなら、表が空でも通ってしまう。
	 * キーを 1 つ落とした表を作って、それが拾われることを見る。
	 */
	test("食い違いを実際に拾える", () => {
		type Broken = { NUMBER: readonly ["type", "code"] };
		expectTypeOf<
			Mismatched<Broken, { NUMBER: Property.Number }>
		>().toEqualTypeOf<"NUMBER">();
	});
});
