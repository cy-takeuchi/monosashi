import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { Probed } from "../probe/serialize";
import type { ProbeStore, Sample } from "../probe/store";
import {
	IGNORED_ON_WRITE,
	REJECTED_ON_WRITE,
	UI_ONLY_PROPERTIES,
} from "./fieldTypes";
import { convertField, toRest, toRestWrite } from "./toRestWrite";

/**
 * 変換関数を実測データに対して検証する。
 *
 * 合成データではなく kintone が実際に返したレコードを通す。
 * 手で作ったサンプルは、こちらの思い込みどおりの形にしかならない。
 */

/** Probed を元の値に戻す。実測データをそのまま変換関数に食わせるため */
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

const samples: Sample[] = readdirSync("fixtures")
	.filter((name) => name.endsWith(".json"))
	.flatMap((name) => {
		const store = JSON.parse(
			readFileSync(join("fixtures", name), "utf8"),
		) as ProbeStore;
		return store.samples;
	});

type AnyRecord = { [code: string]: { type: string; value: unknown } };

const records: { label: string; record: AnyRecord }[] = samples
	.filter((sample) => sample.data.k === "object")
	.map((sample) => ({
		label: `${sample.event}/${sample.source}`,
		record: revive(sample.data) as AnyRecord,
	}))
	// 一覧イベントは records 配列なので単体レコードだけを対象にする
	.filter(({ record }) =>
		Object.values(record).every(
			(field) => typeof field === "object" && field !== null && "type" in field,
		),
	);

describe("実測レコードを変換できる", () => {
	test("対象のレコードが存在する", () => {
		expect(records.length).toBeGreaterThan(0);
	});

	test("例外を投げない", () => {
		for (const { record } of records) {
			expect(() => toRestWrite(record)).not.toThrow();
		}
	});
});

describe("書き込みが拒否される type を落とす", () => {
	test("変換後に 1 つも残らない", () => {
		const rejected = new Set<string>(REJECTED_ON_WRITE);
		const offenders: string[] = [];

		for (const { label, record } of records) {
			const { record: converted } = toRestWrite(record);
			for (const code of Object.keys(converted)) {
				const original = record[code];
				if (original !== undefined && rejected.has(original.type)) {
					offenders.push(`${label}:${code}(${original.type})`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	test("実測レコードには実際にそれらの type が含まれている（テストが空振りしていない）", () => {
		const rejected = new Set<string>(REJECTED_ON_WRITE);
		const found = records.some(({ record }) =>
			Object.values(record).some((field) => rejected.has(field.type)),
		);
		expect(found).toBe(true);
	});
});

describe("$id / $revision を分離する", () => {
	test("レコードから取り出して id / revision として返す", () => {
		const withMeta = records.find(({ record }) => "$id" in record);
		expect(withMeta).toBeDefined();
		if (withMeta === undefined) return;

		const result = toRestWrite(withMeta.record);
		expect(result.id).toBeTypeOf("string");
		expect(result.revision).toBeTypeOf("string");
		expect(result.record.$id).toBeUndefined();
		expect(result.record.$revision).toBeUndefined();
	});
});

describe("サブテーブルの行 id を保持する", () => {
	test("id を持つ行は id 付きのまま変換される", () => {
		const target = records.find(({ record }) => {
			const subtable = record.subtable;
			return (
				subtable !== undefined &&
				Array.isArray(subtable.value) &&
				subtable.value.some(
					(row) => typeof (row as { id?: unknown }).id === "string",
				)
			);
		});
		expect(target).toBeDefined();
		if (target === undefined) return;

		const before = (target.record.subtable?.value ?? []) as { id?: string }[];
		const after = (toRestWrite(target.record).record.subtable?.value ?? []) as {
			id?: string;
		}[];

		expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
	});

	test("id が null の行（作成画面）では id を渡さない", () => {
		const target = records.find(({ record }) => {
			const subtable = record.subtable;
			return (
				subtable !== undefined &&
				Array.isArray(subtable.value) &&
				subtable.value.some((row) => (row as { id?: unknown }).id === null)
			);
		});
		expect(target).toBeDefined();
		if (target === undefined) return;

		const after = (toRestWrite(target.record).record.subtable?.value ?? []) as {
			id?: string;
		}[];
		expect(after.every((row) => !("id" in row))).toBe(true);
	});

	test("テーブル内の CALC は落とされる", () => {
		const target = records.find(({ record }) => {
			const subtable = record.subtable;
			if (subtable === undefined || !Array.isArray(subtable.value))
				return false;
			return subtable.value.some((row) => {
				const value = (row as { value?: Record<string, { type?: string }> })
					.value;
				return value !== undefined && value.t_calc?.type === "CALC";
			});
		});
		expect(target).toBeDefined();
		if (target === undefined) return;

		const after = (toRestWrite(target.record).record.subtable?.value ?? []) as {
			value: Record<string, unknown>;
		}[];
		expect(after.every((row) => !("t_calc" in row.value))).toBe(true);
	});
});

describe("UI 専用プロパティを落とす", () => {
	test("ルックアップの confirmed / recordId が残らない", () => {
		const target = records.find(({ record }) =>
			Object.values(record).some(
				(field) => "confirmed" in field && "recordId" in field,
			),
		);
		expect(target).toBeDefined();
		if (target === undefined) return;

		const converted = toRestWrite(target.record).record;
		const offenders = Object.entries(converted).filter(
			([, field]) => "confirmed" in field || "recordId" in field,
		);
		expect(offenders).toEqual([]);
	});
});

describe("未設定のフィールドは送らない", () => {
	test("値が undefined のフィールドが変換後に残らない", () => {
		const target = records.find(({ record }) =>
			Object.values(record).some((field) => field.value === undefined),
		);
		expect(target).toBeDefined();
		if (target === undefined) return;

		const converted = toRestWrite(target.record).record;
		const offenders = Object.entries(converted).filter(
			([, field]) => field.value === undefined,
		);
		expect(offenders).toEqual([]);
	});
});

describe("toRest（読み取り方向の正規化）", () => {
	test("UI 専用プロパティを落とす", () => {
		const target = records.find(({ record }) =>
			Object.values(record).some((field) => "confirmed" in field),
		);
		expect(target).toBeDefined();
		if (target === undefined) return;

		const converted = toRest(target.record) as Record<string, object>;
		const offenders = Object.entries(converted).filter(
			([, field]) => "confirmed" in field || "recordId" in field,
		);
		expect(offenders).toEqual([]);
	});

	test("type は保持する（型ガードで使うため）", () => {
		const { record } = records[0] ?? { record: {} };
		const converted = toRest(record) as Record<string, { type?: string }>;
		for (const [code, field] of Object.entries(converted)) {
			expect(field.type, `${code} の type が失われている`).toBeTypeOf("string");
		}
	});
});

describe("convertField: フィールド 1 つの変換", () => {
	// サブテーブルの 1 行だけを扱うコードのために公開している API。
	test("通常のフィールドは value だけにする", () => {
		expect(convertField({ type: "SINGLE_LINE_TEXT", value: "a" })).toEqual({
			value: "a",
		});
	});

	test("拒否される種別は undefined を返す", () => {
		for (const type of REJECTED_ON_WRITE) {
			expect(convertField({ type, value: "x" })).toBeUndefined();
		}
	});

	test("無視される種別も undefined を返す", () => {
		for (const type of IGNORED_ON_WRITE) {
			expect(convertField({ type, value: "x" })).toBeUndefined();
		}
	});

	test("サブテーブルは行の id を保ったまま中身を変換する", () => {
		const converted = convertField({
			type: "SUBTABLE",
			value: [
				{
					id: "7",
					value: {
						t_text: { type: "SINGLE_LINE_TEXT", value: "a" },
						t_calc: { type: "CALC", value: "9" },
					},
				},
				// 作成画面の新規行。id は null で、渡してはいけない
				{
					id: null,
					value: { t_text: { type: "SINGLE_LINE_TEXT", value: "b" } },
				},
			],
		});
		expect(converted).toEqual({
			value: [
				{ id: "7", value: { t_text: { value: "a" } } },
				{ value: { t_text: { value: "b" } } },
			],
		});
	});
});

describe("UI 専用プロパティ", () => {
	test("toRest が UI_ONLY_PROPERTIES を全て落とす", () => {
		const field: Record<string, unknown> = {
			type: "SINGLE_LINE_TEXT",
			value: "a",
		};
		for (const key of UI_ONLY_PROPERTIES) field[key] = "落とされるはず";

		const converted = toRest({ text: field as never }) as {
			text: Record<string, unknown>;
		};
		for (const key of UI_ONLY_PROPERTIES) {
			expect(converted.text, `${key} が残っている`).not.toHaveProperty(key);
		}
		expect(converted.text).toEqual({ type: "SINGLE_LINE_TEXT", value: "a" });
	});
});
