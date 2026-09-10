import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { OBSERVED_FIELD_TYPES } from "../../test/fieldTypes";
import { GUARD_OF } from "../../test/guards";
import type { Probed } from "../probe/serialize.js";
import type { ProbeStore, Sample } from "../probe/store.js";
import { hasValue, isFile, isLookup, isSubtable } from "./record.js";

/** Probed を元の値に戻す */
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

type Field = { type: string; value: unknown };
type AnyRecord = { [code: string]: Field };

const samples: Sample[] = readdirSync("fixtures")
	.filter((name) => name.endsWith(".json"))
	.flatMap((name) => {
		const store = JSON.parse(
			readFileSync(join("fixtures", name), "utf8"),
		) as ProbeStore;
		return store.samples;
	});

const records = samples
	.filter((sample) => sample.data.k === "object")
	.map((sample) => ({
		label: `${sample.event}/${sample.source}`,
		isRest: sample.source.startsWith("rest."),
		record: revive(sample.data) as AnyRecord,
	}));

describe("isLookup", () => {
	test("JS API / event.record ではルックアップのキーを見つける", () => {
		const found = records
			.filter(({ isRest }) => !isRest)
			.some(({ record }) => Object.values(record).some(isLookup));
		expect(found).toBe(true);
	});

	test("REST では 1 件も見つからない（キーが無いため）", () => {
		const offenders = records
			.filter(({ isRest }) => isRest)
			.flatMap(({ label, record }) =>
				Object.entries(record)
					.filter(([, field]) => isLookup(field))
					.map(([code]) => `${label}:${code}`),
			);
		expect(offenders).toEqual([]);
	});

	// ここだけはフィールドコードを書く。**主張がコードの集合そのもの**だから。
	// ルックアップのキーフィールドは type では区別できず（元フィールドの型になる）、
	// コピー先と区別できることを示すには「どのコードが検出されたか」を見るしかない。
	// 他のガードは type で引けるので、コードを書かない
	test("見つかるのは lookupKey だけ（コピー先は判別できない）", () => {
		const codes = new Set(
			records
				.filter(({ isRest }) => !isRest)
				.flatMap(({ record }) =>
					Object.entries(record)
						.filter(([, field]) => isLookup(field))
						.map(([code]) => code),
				),
		);
		expect([...codes]).toEqual(["lookupKey"]);
	});
});

describe("hasValue", () => {
	test("undefined のフィールドを弾く", () => {
		const target = records.find(({ record }) =>
			Object.values(record).some((field) => field.value === undefined),
		);
		expect(target).toBeDefined();
		if (target === undefined) return;

		const undefinedFields = Object.values(target.record).filter(
			(field) => field.value === undefined,
		);
		expect(undefinedFields.length).toBeGreaterThan(0);
		expect(undefinedFields.every((field) => !hasValue(field))).toBe(true);
	});

	test("空文字や空配列は通す（未設定とは違う）", () => {
		expect(hasValue({ type: "SINGLE_LINE_TEXT", value: "" })).toBe(true);
		expect(hasValue({ type: "CHECK_BOX", value: [] })).toBe(true);
		expect(hasValue({ type: "DATE", value: null })).toBe(true);
		expect(hasValue({ type: "SINGLE_LINE_TEXT", value: undefined })).toBe(
			false,
		);
	});
});

/**
 * 実測レコードのフィールドを、`type` ごとにまとめて 1 回だけ集める。
 *
 * サブテーブルの中も歩く。`FILE` などは行の中にも入るため。
 */
const byType = ((): Map<
	string,
	{ label: string; code: string; field: Field }[]
> => {
	const out = new Map<
		string,
		{ label: string; code: string; field: Field }[]
	>();
	const walk = (label: string, node: unknown): void => {
		if (Array.isArray(node)) {
			for (const item of node) walk(label, item);
			return;
		}
		if (typeof node !== "object" || node === null) return;
		for (const [code, value] of Object.entries(node)) {
			if (typeof value !== "object" || value === null) continue;
			const field = value as { type?: unknown; value?: unknown };
			if (typeof field.type !== "string") continue;

			const bucket = out.get(field.type) ?? [];
			bucket.push({ label, code, field: field as Field });
			out.set(field.type, bucket);

			if (field.type === "SUBTABLE") walk(label, field.value);
		}
	};
	for (const { label, record } of records) walk(label, record);
	return out;
})();

/** 実測に現れたすべてのフィールド。他種別の混入を見るときに使う */
const allFields = [...byType.values()].flat();

/**
 * **全 28 種別**を、実測データで両方向から縛る。
 *
 * ## なぜ「他種別を通さない」側が要るのか
 *
 * `test/coverage.test.ts` の「ガードが全種別にある」は
 * `is({ type, value: undefined })` という**手で作ったオブジェクト**を通す。
 * ガードを「常に true」や「常に false」にすれば落ちるので無駄ではないが、
 * **実在する別の種別を 1 つだけ通してしまう**壊れ方は捕まえられない。
 *
 * ```ts
 * // これが coverage.test.ts を通ってしまう
 * export const isNumber = (f) => f.type === "NUMBER" || f.type === "CALC";
 * ```
 *
 * `is({ type: "他の型" })` は `CALC` ではないので false のまま。
 * 実測データを通していないと気づけない。
 *
 * この壊し方を 21 種別で試したところ、**19 が緑のまま通った**（2026-09-08）。
 * ここで両方向を見ることで全部落ちるようにする。
 *
 * ## フィールドコードは書かない
 *
 * 以前は `record.subtable` とコードを直接書いていた。
 * `subtable` は `tools/fixture-app/fields.ts` で**我々が決めた**もので、
 * kintone の仕様ではない。実アプリのサブテーブルがこの名前であることは、まず無い。
 * ガードの主張は「`type` が一致するものに絞り込める」で、コードは関係が無い。
 */
describe.each(OBSERVED_FIELD_TYPES)("%s のガード", (type) => {
	const is = GUARD_OF[type];

	test("実測に現れるものをすべて絞り込める", () => {
		const found = byType.get(type) ?? [];
		expect(found.length, `${type} の実測が 1 件も無い`).toBeGreaterThan(0);

		const missed = found
			.filter(({ field }) => !is(field))
			.map(({ label, code }) => `${label}:${code}`);
		expect(missed).toEqual([]);
	});

	test("他の種別は 1 つも通さない", () => {
		const offenders = allFields
			.filter(({ field }) => field.type !== type && is(field))
			.map(({ label, code, field }) => `${label}:${code}(${field.type})`);
		expect([...new Set(offenders)]).toEqual([]);
	});
});

describe("絞り込んだ先の形", () => {
	test("SUBTABLE の value は行の配列", () => {
		const found = byType.get("SUBTABLE") ?? [];
		expect(found.length).toBeGreaterThan(0);
		for (const { label, code, field } of found) {
			if (!isSubtable(field)) throw new Error(`${label}:${code} が通らない`);
			expect(Array.isArray(field.value), `${label}:${code}`).toBe(true);
		}
	});

	test("FILE はサブテーブルの中にも在り、そこでも絞り込める", () => {
		const inSubtable = (byType.get("SUBTABLE") ?? []).flatMap(({ field }) =>
			(Array.isArray(field.value) ? field.value : []).flatMap((row) => {
				const inner = (row as { value?: Record<string, unknown> }).value ?? {};
				return Object.values(inner).filter(
					(cell): cell is Field =>
						typeof cell === "object" &&
						cell !== null &&
						(cell as { type?: unknown }).type === "FILE",
				);
			}),
		);
		expect(inSubtable.length).toBeGreaterThan(0);
		expect(inSubtable.every((cell) => isFile(cell))).toBe(true);
	});
});

describe("undefined / null を受ける", () => {
	// 導入先は `if (f === undefined || !guardRecord.isSubtable(f)) return;` と
	// 前置きしている。ガード側が受けるので、この前置きは要らない
	test("前置きの undefined チェックが要らない", () => {
		expect(isSubtable(undefined)).toBe(false);
		expect(isSubtable(null)).toBe(false);
		expect(isFile(undefined)).toBe(false);
		expect(isFile(null)).toBe(false);
		expect(isLookup(undefined)).toBe(false);
		expect(isLookup(null)).toBe(false);
		expect(hasValue(undefined)).toBe(false);
		expect(hasValue(null)).toBe(false);
	});
});
