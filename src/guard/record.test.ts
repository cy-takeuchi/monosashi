import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { Probed } from "../probe/serialize.js";
import type { ProbeStore, Sample } from "../probe/store.js";
import { hasValue, isLookup, isSubtable } from "./record.js";

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

describe("isSubtable", () => {
	test("実測レコードのサブテーブルを絞り込める", () => {
		const target = records.find(({ record }) => isSubtable(record.subtable));
		expect(target).toBeDefined();
		if (target === undefined) return;

		const table = target.record.subtable;
		if (!isSubtable(table)) return;
		expect(Array.isArray(table.value)).toBe(true);
	});
});
