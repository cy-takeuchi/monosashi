import { describe, expectTypeOf, test } from "vitest";
import { field } from "../build/field.js";
import type { RestWriteRecord } from "./toRestWrite.js";

/**
 * `RestWriteRecord` が `field.*()` の作る形をちょうど受け入れることを縛る。
 *
 * ここが緩むと `RestWriteRecord` が何でも受け取る型になり、
 * 締まると手書きのリテラルが余剰プロパティで弾かれる（#33）。
 * **どちら側に転んでも落ちるように、両方を書く。**
 */

describe("field.*() の戻り値と手書きのリテラルが同じように通る", () => {
	test("戻り値をそのまま代入できる", () => {
		const record: RestWriteRecord = {};
		record.a = field.file([{ fileKey: "x" }]);
		record.b = field.singleLineText("x");
		record.c = field.number(1);
		expectTypeOf(record.a).toEqualTypeOf<RestWriteRecord[string]>();
	});

	test("同じ形を手で書いても通る", () => {
		// #33。関数の戻り値なら通るのに手書きだと弾かれる、という差を無くす
		const record: RestWriteRecord = {
			a: { type: "FILE", value: [{ fileKey: "x" }] },
		};
		record.b = { type: "SINGLE_LINE_TEXT", value: "x" };
		expectTypeOf(record.b).toEqualTypeOf<RestWriteRecord[string]>();
	});

	test("type を省いても通る（REST が要求しないため）", () => {
		const record: RestWriteRecord = { a: { value: "x" } };
		expectTypeOf(record).not.toBeNever();
		expectTypeOf<RestWriteRecord[string]["type"]>().toEqualTypeOf<
			string | undefined
		>();
		expectTypeOf<RestWriteRecord[string]["value"]>().toEqualTypeOf<unknown>();
	});
});

describe("何でも受け取る型にはなっていない", () => {
	test("value は必須", () => {
		// @ts-expect-error value の無いフィールドは REST に渡せない
		const record: RestWriteRecord = { a: { type: "FILE" } };
		expectTypeOf(record).not.toBeNever();
	});

	test("set() 専用のプロパティは通らない", () => {
		// @ts-expect-error disabled は kintone.app.record.set() 専用（SetRecord）
		const record: RestWriteRecord = { a: { value: "x", disabled: true } };
		expectTypeOf(record).not.toBeNever();
	});

	test("綴りを間違えたプロパティは通らない", () => {
		// @ts-expect-error tpye は type の綴り違い
		const record: RestWriteRecord = { a: { value: "x", tpye: "FILE" } };
		expectTypeOf(record).not.toBeNever();
	});
});
