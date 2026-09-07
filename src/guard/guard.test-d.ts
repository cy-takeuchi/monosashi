import { describe, expectTypeOf, test } from "vitest";
import type { Editing, Saved } from "../types/field.js";
import type { EditingRecord, SavedRecord } from "../types/record.js";
import type { RestRecord } from "../types/rest.js";
import {
	hasValue,
	isCheckBox,
	isDropdown,
	isLookup,
	isSingleLineText,
	isSubtable,
} from "./record.js";

/**
 * 型ガードが 3 文脈それぞれで正しく絞り込むことを確かめる。
 *
 * kintone-typeguard は 4 名前空間の直積を FFF<A,B,C,D> で扱っており、
 * 絞り込んだあとに何の型か読めなくなっていた。
 * ここでは入力の型がそのまま保たれることを検証する。
 */

describe("Saved のレコードを絞り込む", () => {
	test("value が Saved の型になる", () => {
		const record: SavedRecord = {};
		const f = record.code;
		if (isSingleLineText(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string>();
		}
		if (isDropdown(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string>();
		}
		if (isCheckBox(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string[]>();
		}
	});

	test("サブテーブルの行 id は文字列", () => {
		const record: SavedRecord = {};
		const f = record.table;
		if (isSubtable(f)) {
			expectTypeOf(f.value[0]).toEqualTypeOf<Saved.SubtableRow | undefined>();
		}
	});
});

describe("Editing のレコードを絞り込む", () => {
	test("value に undefined が残る", () => {
		const record: EditingRecord = {};
		const f = record.code;
		if (isSingleLineText(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string | undefined>();
		}
	});

	test("hasValue と組み合わせると undefined が消える", () => {
		const record: EditingRecord = {};
		const f = record.code;
		if (isSingleLineText(f) && hasValue(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string>();
		}
	});

	test("サブテーブルの行 id は null になりうる", () => {
		const record: EditingRecord = {};
		const f = record.table;
		if (isSubtable(f)) {
			expectTypeOf(f.value[0]).toEqualTypeOf<Editing.SubtableRow | undefined>();
		}
	});
});

describe("Rest のレコードを絞り込む", () => {
	test("DROP_DOWN は null になりうる", () => {
		const record: RestRecord = {};
		const f = record.code;
		if (isDropdown(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string | null>();
		}
	});
});

describe("ルックアップは type ではなくキーで判別する", () => {
	test("confirmed と recordId に絞り込める", () => {
		const record: SavedRecord = {};
		const f = record.code;
		if (isLookup(f)) {
			expectTypeOf(f.confirmed).toEqualTypeOf<boolean>();
			expectTypeOf(f.recordId).toEqualTypeOf<string | null>();
		}
	});
});

describe("緩い型のレコードでも絞り込める", () => {
	test("type が string の入力で never にならない", () => {
		// プラグインのコードでは、設定から受け取ったフィールドコードで
		// 緩い型のレコードを引く場面が多い
		const loose: { [code: string]: { type: string; value: unknown } } = {};
		const f = loose.code;
		if (isSingleLineText(f)) {
			expectTypeOf(f).not.toBeNever();
			expectTypeOf(f.type).toEqualTypeOf<"SINGLE_LINE_TEXT">();
		}
		if (isSubtable(f)) {
			expectTypeOf(f).not.toBeNever();
			expectTypeOf(f.value).not.toBeNever();
		}
	});
});

describe("undefined と null を受け付ける", () => {
	test("インデックスアクセスの結果をそのまま渡せる", () => {
		const record: SavedRecord = {};
		// noUncheckedIndexedAccess により undefined を含む
		const f = record.code;
		expectTypeOf(f).toEqualTypeOf<Saved.OneOf | undefined>();
		if (isSingleLineText(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string>();
		}
	});
});
