import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { toRestWrite } from "../convert/toRestWrite";
import type { Probed } from "../probe/serialize";
import type { ProbeStore } from "../probe/store";
import { field } from "./field";
import {
	canSetValue,
	FieldValueError,
	setRowValue,
	setValue,
} from "./setValue";

/**
 * 構築 API と代入 API のテスト。
 *
 * 実測レコードに対して代入を試み、
 * 「現行の型では素通りしていた誤りが、ここでは止まる」ことを確かめる。
 */

const revive = (probed: Probed): unknown => {
	switch (probed.k) {
		case "undefined":
			return undefined;
		case "null":
			return null;
		case "string":
		case "number":
		case "boolean":
			return probed.v;
		case "array":
			return probed.items.map(revive);
		case "object": {
			const out: { [key: string]: unknown } = {};
			for (const key of probed.keys) {
				const child = probed.props[key];
				out[key] = child === undefined ? undefined : revive(child);
			}
			return out;
		}
		default:
			return undefined;
	}
};

type AnyRecord = { [code: string]: { type: string; value: unknown } };

/** 全項目が揃っている実測レコードを 1 件取り出す */
const sampleRecord = (): AnyRecord => {
	const samples = readdirSync("fixtures")
		.filter((name) => name.endsWith(".json"))
		.flatMap((name) => {
			const store = JSON.parse(
				readFileSync(join("fixtures", name), "utf8"),
			) as ProbeStore;
			return store.samples;
		});

	const found = samples.find(
		(sample) =>
			sample.event === "app.record.detail.show" &&
			sample.data.k === "object" &&
			sample.data.keys.includes("subtable"),
	);
	if (found === undefined) throw new Error("実測レコードが見つかりません");
	return revive(found.data) as AnyRecord;
};

describe("構築 API", () => {
	test("数値は number でも string でも渡せる", () => {
		expect(field.number(12.5)).toEqual({ type: "NUMBER", value: "12.5" });
		expect(field.number("12.5")).toEqual({ type: "NUMBER", value: "12.5" });
	});

	test("添付ファイルは fileKey だけに絞られる", () => {
		const built = field.file([
			{
				contentType: "text/plain",
				fileKey: "abc",
				name: "a.txt",
				size: "3",
			},
		]);
		expect(built.value).toEqual([{ fileKey: "abc" }]);
	});

	test("ユーザー選択は code だけに絞られる", () => {
		const built = field.userSelect([{ code: "u1", name: "ユーザー1" }]);
		expect(built.value).toEqual([{ code: "u1" }]);
	});

	test("サブテーブルの行は id を省略すると新規行になる", () => {
		const withId = field.subtableRow({ a: field.singleLineText("x") }, "10");
		const withoutId = field.subtableRow({ a: field.singleLineText("x") });
		expect(withId).toHaveProperty("id", "10");
		expect(withoutId).not.toHaveProperty("id");
	});

	test("構築したフィールドはそのまま REST 書き込みに通る", () => {
		const record = {
			text: field.singleLineText("a"),
			num: field.number(1),
			checks: field.checkBox(["x"]),
			files: field.file([{ fileKey: "k" }]),
		};
		const { record: converted } = toRestWrite(record);
		expect(Object.keys(converted).sort()).toEqual([
			"checks",
			"files",
			"num",
			"text",
		]);
	});
});

describe("代入 API が現行の型では素通りする誤りを止める", () => {
	const cases: { code: string; type: string; bad: unknown }[] = [
		{ code: "number", type: "NUMBER", bad: ["これは", "配列"] },
		{ code: "checkBox", type: "CHECK_BOX", bad: "配列であるべき" },
		{ code: "singleLineText", type: "SINGLE_LINE_TEXT", bad: 123 },
		{ code: "userSelect", type: "USER_SELECT", bad: ["u1"] },
		{ code: "file", type: "FILE", bad: [{ name: "a.txt" }] },
		{ code: "date", type: "DATE", bad: 20260830 },
	];

	for (const { code, type, bad } of cases) {
		test(`${code}（${type}）に不正な値を代入すると止まる`, () => {
			const record = sampleRecord();
			expect(record[code]?.type).toBe(type);
			expect(() => setValue(record, code, bad)).toThrow(FieldValueError);
			expect(canSetValue(record, code, bad)).toBe(false);
		});
	}

	test("正しい値は代入できる", () => {
		const record = sampleRecord();
		setValue(record, "singleLineText", "新しい値");
		setValue(record, "number", "42");
		setValue(record, "checkBox", ["sample1"]);
		setValue(record, "date", null);
		expect(record.singleLineText?.value).toBe("新しい値");
		expect(record.date?.value).toBeNull();
	});

	test("存在しないフィールドへの代入は止まる", () => {
		const record = sampleRecord();
		expect(() => setValue(record, "存在しない", "x")).toThrow(FieldValueError);
	});

	test("未知の type は素通しする（新しい種別でブロックしないため）", () => {
		const record: AnyRecord = {
			future: { type: "KINTONE_の_新種別", value: "" },
		};
		expect(() => setValue(record, "future", { anything: true })).not.toThrow();
	});

	test("エラーメッセージがフィールドコードと種別を含む", () => {
		const record = sampleRecord();
		try {
			setValue(record, "number", ["配列"]);
			expect.unreachable("例外が投げられるはず");
		} catch (error) {
			expect(String(error)).toContain("number");
			expect(String(error)).toContain("NUMBER");
		}
	});
});

describe("setRowValue: サブテーブルの行のセルへの代入", () => {
	// 実在のプラグインが `draft[tableField.code].value = initialValue` に
	// エラー抑制コメントを付けていた箇所に相当する API。
	// 移行先で最初に使われるものなので、実際に動くことを確かめておく。
	const sampleRow = () => ({
		id: "1",
		value: {
			t_text: { type: "SINGLE_LINE_TEXT", value: "初期値" },
			t_number: { type: "NUMBER", value: "1" },
		},
	});

	test("行のセルに代入できる", () => {
		const row = sampleRow();
		setRowValue(row, "t_text", "書き換え");
		expect(row.value.t_text.value).toBe("書き換え");
	});

	test("行の id は触らない（落とすと行が置き換わるため）", () => {
		const row = sampleRow();
		setRowValue(row, "t_number", "2");
		expect(row.id).toBe("1");
	});

	test("種別と合わない値は弾く", () => {
		const row = sampleRow();
		expect(() => setRowValue(row, "t_number", ["配列"])).toThrow(
			FieldValueError,
		);
		expect(row.value.t_number.value).toBe("1");
	});

	test("行に無いフィールドコードは弾く", () => {
		const row = sampleRow();
		expect(() => setRowValue(row, "存在しない", "x")).toThrow(FieldValueError);
	});
});
