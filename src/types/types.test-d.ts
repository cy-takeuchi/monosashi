import { describe, expectTypeOf, test } from "vitest";
import type { Editing, Saved } from "./field.js";
import type { CreateRecord, EditingRecord, SavedRecord } from "./record.js";
import type { RestRecord } from "./rest.js";

/**
 * コンパイル時の型テスト。
 *
 * field.test.ts が「実測データが型の主張どおりか」を確かめるのに対し、
 * こちらは「型が意図した区別をしているか」を確かめる。
 */

describe("Saved と Editing の違いが型に出ている", () => {
	test("Saved の value は undefined を含まない", () => {
		expectTypeOf<Saved.SingleLineText["value"]>().toEqualTypeOf<string>();
		expectTypeOf<Saved.Dropdown["value"]>().toEqualTypeOf<string>();
		expectTypeOf<Saved.Date["value"]>().toEqualTypeOf<string | null>();
	});

	test("Editing の value は undefined を含む", () => {
		expectTypeOf<Editing.SingleLineText["value"]>().toEqualTypeOf<
			string | undefined
		>();
		expectTypeOf<Editing.Dropdown["value"]>().toEqualTypeOf<
			string | undefined
		>();
		expectTypeOf<Editing.Date["value"]>().toEqualTypeOf<
			string | null | undefined
		>();
	});

	test("配列を値に持つフィールドは Editing でも undefined にならない", () => {
		expectTypeOf<Editing.CheckBox["value"]>().toEqualTypeOf<string[]>();
		expectTypeOf<Editing.File["value"]>().toEqualTypeOf<Saved.File["value"]>();
	});
});

describe("サブテーブルの行 id", () => {
	test("Saved は文字列、Editing は null になりうる", () => {
		expectTypeOf<Saved.SubtableRow["id"]>().toEqualTypeOf<string>();
		expectTypeOf<Editing.SubtableRow["id"]>().toEqualTypeOf<string | null>();
	});
});

describe("ルックアップのキーフィールド", () => {
	test("confirmed と recordId を持つ", () => {
		expectTypeOf<Saved.Lookup["confirmed"]>().toEqualTypeOf<boolean>();
		expectTypeOf<Saved.Lookup["recordId"]>().toEqualTypeOf<string | null>();
	});

	test("通常のフィールドには無い", () => {
		// @ts-expect-error 通常の SINGLE_LINE_TEXT に confirmed は無い
		type _ = Saved.SingleLineText["confirmed"];
	});
});

describe("disabled / error は読み取り型に存在しない", () => {
	test("Saved にも Editing にも無い", () => {
		// @ts-expect-error 読み取り型に disabled は無い
		type _a = Saved.SingleLineText["disabled"];
		// @ts-expect-error 読み取り型に error は無い
		type _b = Editing.SingleLineText["error"];
	});
});

describe("作成画面のレコードはシステムフィールドを持たない", () => {
	test("レコード番号や作成者を代入できない", () => {
		const record: CreateRecord = {};
		// @ts-expect-error 作成画面のレコードにシステムフィールドは存在しない
		record.x = { type: "RECORD_NUMBER", value: "1" };
		// @ts-expect-error 作成画面のレコードにステータスは存在しない
		record.y = { type: "STATUS", value: "未処理" };
	});

	test("通常のフィールドは代入できる", () => {
		const record: CreateRecord = {};
		record.singleLineText = { type: "SINGLE_LINE_TEXT", value: "a" };
		expectTypeOf(record.singleLineText).not.toBeNever();
	});
});

describe("レコード型が読み取りで正しく絞り込める", () => {
	test("type による絞り込みが効く", () => {
		const check = (record: SavedRecord, code: string): string | null => {
			const field = record[code];
			if (field === undefined) return null;
			if (field.type === "SINGLE_LINE_TEXT") {
				expectTypeOf(field.value).toEqualTypeOf<string>();
				return field.value;
			}
			if (field.type === "CHECK_BOX") {
				expectTypeOf(field.value).toEqualTypeOf<string[]>();
				return field.value.join(",");
			}
			return null;
		};
		expectTypeOf(check).toBeFunction();
	});

	test("Editing では undefined を考慮させられる", () => {
		const check = (record: EditingRecord, code: string): string => {
			const field = record[code];
			if (field?.type !== "SINGLE_LINE_TEXT") return "";
			// undefined の可能性があるので ?? が必要
			return field.value ?? "";
		};
		expectTypeOf(check).toBeFunction();
	});

	test("REST の DROP_DOWN は null を考慮させられる", () => {
		const check = (record: RestRecord, code: string): string => {
			const field = record[code];
			if (field?.type !== "DROP_DOWN") return "";
			return field.value ?? "";
		};
		expectTypeOf(check).toBeFunction();
	});
});
