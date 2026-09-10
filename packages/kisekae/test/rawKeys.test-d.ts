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
 */

/** 表の要素の型を、キーの union として取り出す */
type KeysOf<T extends readonly string[]> = T[number];

describe("プロパティの表が型と一致する", () => {
	test("組み込みフィールド", () => {
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.RECORD_NUMBER>>().toEqualTypeOf<
			keyof Property.RecordNumber
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.CREATOR>>().toEqualTypeOf<
			keyof Property.Creator
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.CREATED_TIME>>().toEqualTypeOf<
			keyof Property.CreatedTime
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.MODIFIER>>().toEqualTypeOf<
			keyof Property.Modifier
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.UPDATED_TIME>>().toEqualTypeOf<
			keyof Property.UpdatedTime
		>();
	});

	test("プロセス管理・カテゴリー", () => {
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.CATEGORY>>().toEqualTypeOf<
			keyof Property.Category
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.STATUS>>().toEqualTypeOf<
			keyof Property.Status
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.STATUS_ASSIGNEE>>().toEqualTypeOf<
			keyof Property.StatusAssignee
		>();
	});

	test("文字列・数値・計算・リンク", () => {
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.SINGLE_LINE_TEXT>>().toEqualTypeOf<
			keyof Property.SingleLineText
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.MULTI_LINE_TEXT>>().toEqualTypeOf<
			keyof Property.MultiLineText
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.RICH_TEXT>>().toEqualTypeOf<
			keyof Property.RichText
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.NUMBER>>().toEqualTypeOf<
			keyof Property.Number
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.CALC>>().toEqualTypeOf<
			keyof Property.Calc
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.LINK>>().toEqualTypeOf<
			keyof Property.Link
		>();
	});

	test("選択系", () => {
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.CHECK_BOX>>().toEqualTypeOf<
			keyof Property.CheckBox
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.RADIO_BUTTON>>().toEqualTypeOf<
			keyof Property.RadioButton
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.DROP_DOWN>>().toEqualTypeOf<
			keyof Property.Dropdown
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.MULTI_SELECT>>().toEqualTypeOf<
			keyof Property.MultiSelect
		>();
	});

	test("日時・添付ファイル", () => {
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.DATE>>().toEqualTypeOf<
			keyof Property.Date
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.TIME>>().toEqualTypeOf<
			keyof Property.Time
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.DATETIME>>().toEqualTypeOf<
			keyof Property.DateTime
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.FILE>>().toEqualTypeOf<
			keyof Property.File
		>();
	});

	test("ユーザー・組織・グループ選択", () => {
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.USER_SELECT>>().toEqualTypeOf<
			keyof Property.UserSelect
		>();
		expectTypeOf<
			KeysOf<typeof PROPERTY_KEYS.ORGANIZATION_SELECT>
		>().toEqualTypeOf<keyof Property.OrganizationSelect>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.GROUP_SELECT>>().toEqualTypeOf<
			keyof Property.GroupSelect
		>();
	});

	test("グループ・関連レコード一覧・サブテーブル・ルックアップ", () => {
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.GROUP>>().toEqualTypeOf<
			keyof Property.Group
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.REFERENCE_TABLE>>().toEqualTypeOf<
			keyof Property.ReferenceTable
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.SUBTABLE>>().toEqualTypeOf<
			keyof Property.Subtable<{ [code: string]: Property.InSubtable }>
		>();
		expectTypeOf<KeysOf<typeof PROPERTY_KEYS.LOOKUP>>().toEqualTypeOf<
			keyof Property.Lookup
		>();
	});
});

describe("レイアウト要素の表が型と一致する", () => {
	test("size を持つフィールド（代表を見る）", () => {
		expectTypeOf<
			KeysOf<typeof LAYOUT_ELEMENT_KEYS.SINGLE_LINE_TEXT>
		>().toEqualTypeOf<keyof Layout.Element.SingleLineText>();
		expectTypeOf<
			KeysOf<typeof LAYOUT_ELEMENT_KEYS.MULTI_LINE_TEXT>
		>().toEqualTypeOf<keyof Layout.Element.MultiLineText>();
		expectTypeOf<
			KeysOf<typeof LAYOUT_ELEMENT_KEYS.RECORD_NUMBER>
		>().toEqualTypeOf<keyof Layout.Element.RecordNumber>();
	});

	test("形が違う 4 つ", () => {
		expectTypeOf<
			KeysOf<typeof LAYOUT_ELEMENT_KEYS.REFERENCE_TABLE>
		>().toEqualTypeOf<keyof Layout.Element.ReferenceTable>();
		expectTypeOf<KeysOf<typeof LAYOUT_ELEMENT_KEYS.LABEL>>().toEqualTypeOf<
			keyof Layout.Element.Label
		>();
		expectTypeOf<KeysOf<typeof LAYOUT_ELEMENT_KEYS.HR>>().toEqualTypeOf<
			keyof Layout.Element.HR
		>();
		expectTypeOf<KeysOf<typeof LAYOUT_ELEMENT_KEYS.SPACER>>().toEqualTypeOf<
			keyof Layout.Element.Spacer
		>();
	});
});

describe("コンテナの表が型と一致する", () => {
	test("ROW / SUBTABLE / GROUP", () => {
		expectTypeOf<KeysOf<typeof LAYOUT_CONTAINER_KEYS.ROW>>().toEqualTypeOf<
			keyof Layout.Row
		>();
		expectTypeOf<KeysOf<typeof LAYOUT_CONTAINER_KEYS.SUBTABLE>>().toEqualTypeOf<
			keyof Layout.Subtable
		>();
		expectTypeOf<KeysOf<typeof LAYOUT_CONTAINER_KEYS.GROUP>>().toEqualTypeOf<
			keyof Layout.Group
		>();
	});
});
