import { describe, expect, test } from "vitest";
import { shapeOf } from "../../test/shape";
import { inspectStructure, probe } from "./serialize";

/**
 * このライブラリの実測が成立するための最低条件を守るテスト。
 *
 * ここが壊れると実測結果そのものが信用できなくなるので、
 * 変換関数や型より先に守るべき不変条件として置く。
 */

describe("キーの存在と undefined の区別", () => {
	test("値が undefined のキーは「存在する」として保持される", () => {
		const result = probe({ error: undefined });
		expect(result).toEqual({
			k: "object",
			ctor: "Object",
			keys: ["error"],
			props: { error: { k: "undefined" } },
		});
	});

	test("キーが無い場合と値が undefined の場合が区別できる", () => {
		const absent = probe({});
		const present = probe({ error: undefined });
		expect(absent).not.toEqual(present);
	});

	test("JSON.stringify ではこの区別が失われる（このシリアライザが必要な理由）", () => {
		expect(JSON.stringify({ error: undefined })).toBe(JSON.stringify({}));
	});

	test("null / 空文字 / 空配列 / undefined がすべて別物として残る", () => {
		const shapes = [null, "", [], undefined].map((v) => shapeOf(probe(v)));
		expect(shapes).toEqual(["null", '""', "[]", "undefined"]);
		expect(new Set(shapes).size).toBe(4);
	});
});

describe("フィールドの形", () => {
	test("event.record 相当と REST 相当で FILE の形が違うことを検出できる", () => {
		const ui = probe({
			type: "FILE",
			value: [
				{ contentType: "text/plain", fileKey: "k", name: "a.txt", size: "3" },
			],
		});
		const write = probe({ type: "FILE", value: [{ fileKey: "k" }] });
		expect(shapeOf(ui)).not.toBe(shapeOf(write));
	});

	test("サブテーブルの id が保持される", () => {
		const shape = shapeOf(
			probe({ type: "SUBTABLE", value: [{ id: "1", value: {} }] }),
		);
		expect(shape).toContain("id: string");
	});

	test("循環参照でスタックを溢れさせない", () => {
		const circular: Record<string, unknown> = { a: 1 };
		circular.self = circular;
		expect(() => probe(circular)).not.toThrow();
	});
});

describe("構造チェック", () => {
	test("getter を持つプロパティを accessorKeys として検出する", () => {
		const withGetter = {};
		Object.defineProperty(withGetter, "computed", {
			get: () => 1,
			enumerable: true,
			configurable: true,
		});
		const [report] = inspectStructure(withGetter);
		expect(report?.accessorKeys).toEqual(["computed"]);
	});

	test("素の data property では accessorKeys が空になる", () => {
		const [report] = inspectStructure({ plain: 1 });
		expect(report?.accessorKeys).toEqual([]);
	});

	test("非列挙キーを enumerableOwnKeys との差として検出できる", () => {
		const target = { visible: 1 };
		Object.defineProperty(target, "hidden", { value: 2, enumerable: false });
		const [report] = inspectStructure(target);
		expect(report?.enumerableOwnKeys).toEqual(["visible"]);
		expect(report?.allOwnStringKeys).toContain("hidden");
	});
});
