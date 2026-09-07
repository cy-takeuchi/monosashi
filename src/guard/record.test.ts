import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
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

type AnyRecord = { [code: string]: { type: string; value: unknown } };

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
 * 実測レコードのフィールドを **`type` で** 集める。
 *
 * 以前はここで `record.subtable` とフィールドコードを直接書いていた。
 * `subtable` は `tools/fixture-app/fields.ts` で**我々が決めた**コードで、
 * kintone の仕様ではない。実アプリのサブテーブルがこの名前であることは、まず無い。
 *
 * ガードの主張は「`type` が一致するものに絞り込める」であって、
 * コードは一切関係がない。コードで引くと
 *
 *   - 主張と関係のないものを検査することになる
 *   - 1 件見つけた時点で緑になり、他が絞り込めなくても気づけない
 *   - 落ちたときの意味が「ガードが壊れた」ではなく「コードが変わった」になる
 *
 * `docs/DECISIONS.md` の「採取文脈の下限を固定する」では、
 * コードまで指定してよいのは**他に特定する手段が無いとき**だけ、としている。
 * ここは `type` で引けるので、その条件を満たしていなかった。
 */
const fieldsOfType = (
	type: string,
): { label: string; code: string; field: AnyRecord[string] }[] => {
	const out: { label: string; code: string; field: AnyRecord[string] }[] = [];
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
			if (field.type === type) {
				out.push({ label, code, field: field as AnyRecord[string] });
			}
			// サブテーブルの中にも FILE などが入る
			if (field.type === "SUBTABLE") walk(label, field.value);
		}
	};
	for (const { label, record } of records) walk(label, record);
	return out;
};

describe("isSubtable", () => {
	test("実測に現れる SUBTABLE をすべて絞り込める", () => {
		const found = fieldsOfType("SUBTABLE");
		expect(found.length).toBeGreaterThan(0);

		const missed = found
			.filter(({ field }) => !isSubtable(field))
			.map(({ label, code }) => `${label}:${code}`);
		expect(missed).toEqual([]);
	});

	test("SUBTABLE 以外は 1 つも通さない", () => {
		const offenders = records.flatMap(({ label, record }) =>
			Object.entries(record)
				.filter(([, field]) => field.type !== "SUBTABLE" && isSubtable(field))
				.map(([code]) => `${label}:${code}`),
		);
		expect(offenders).toEqual([]);
	});

	test("絞り込んだ先の value は行の配列", () => {
		const found = fieldsOfType("SUBTABLE");
		expect(found.length).toBeGreaterThan(0);
		for (const { label, code, field } of found) {
			if (!isSubtable(field)) throw new Error(`${label}:${code} が通らない`);
			expect(Array.isArray(field.value), `${label}:${code}`).toBe(true);
		}
	});
});

describe("isFile", () => {
	// SUBTABLE と並んで、導入先で実際に使われているのはこの 2 つ（52 箇所のほぼ全部）
	test("実測に現れる FILE をすべて絞り込める。サブテーブルの中も含めて", () => {
		const found = fieldsOfType("FILE");
		expect(found.length).toBeGreaterThan(0);

		const missed = found
			.filter(({ field }) => !isFile(field))
			.map(({ label, code }) => `${label}:${code}`);
		expect(missed).toEqual([]);
	});

	test("FILE 以外は 1 つも通さない", () => {
		const offenders = records.flatMap(({ label, record }) =>
			Object.entries(record)
				.filter(([, field]) => field.type !== "FILE" && isFile(field))
				.map(([code]) => `${label}:${code}`),
		);
		expect(offenders).toEqual([]);
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
