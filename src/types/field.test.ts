import { describe, expect, test } from "vitest";
import {
	fieldsOf,
	fieldValue,
	isEditingContext,
	isRestContext,
	isSavedContext,
	loadSamples,
} from "../../test/fixtures";
import type { Probed } from "../probe/serialize";
import type { Sample } from "../probe/store";

/**
 * 宣言した型が実測と一致していることを確かめる。
 *
 * ここで検証するのは「型がこう主張していること」そのもの。
 * kintone 側の挙動が変わればこのテストが落ち、型を直す必要があると分かる。
 *
 * 「実装が全種別を漏れなく扱えているか」は test/coverage.test.ts が見る。
 */

const samples = loadSamples();

describe("実測データが揃っていること", () => {
	test("フィクスチャが読み込める", () => {
		expect(samples.length).toBeGreaterThan(0);
	});

	test("Saved / Editing / Rest の 3 文脈すべてにサンプルがある", () => {
		expect(samples.filter(isSavedContext).length).toBeGreaterThan(0);
		expect(samples.filter(isEditingContext).length).toBeGreaterThan(0);
		expect(samples.filter(isRestContext).length).toBeGreaterThan(0);
	});
});

describe("Saved 型の主張: undefined は現れない", () => {
	test("正規化済みの文脈に undefined 値のフィールドが 1 件も無い", () => {
		const offenders = samples.filter(isSavedContext).flatMap((sample) =>
			fieldsOf(sample.data)
				.filter(({ field }) => fieldValue(field)?.k === "undefined")
				.map(({ code }) => `${sample.event}/${sample.source}:${code}`),
		);
		expect(offenders).toEqual([]);
	});
});

describe("Editing 型の主張: undefined が現れる", () => {
	test("クライアント側の文脈には undefined 値が実在する", () => {
		const found = samples
			.filter(isEditingContext)
			.some((sample) =>
				fieldsOf(sample.data).some(
					({ field }) => fieldValue(field)?.k === "undefined",
				),
			);
		expect(found).toBe(true);
	});

	test("配列を値に持つフィールドは undefined にならない", () => {
		const arrayTypes = [
			"CHECK_BOX",
			"MULTI_SELECT",
			"FILE",
			"USER_SELECT",
			"ORGANIZATION_SELECT",
			"GROUP_SELECT",
			"CATEGORY",
			"STATUS_ASSIGNEE",
			"SUBTABLE",
		];
		const offenders = samples.flatMap((sample) =>
			fieldsOf(sample.data)
				.filter(
					({ type, field }) =>
						arrayTypes.includes(type) && fieldValue(field)?.k === "undefined",
				)
				.map(({ code }) => `${sample.event}:${code}`),
		);
		expect(offenders).toEqual([]);
	});
});

describe("DROP_DOWN の null は REST だけ", () => {
	test("REST では null になりうる", () => {
		const found = samples
			.filter(isRestContext)
			.some((sample) =>
				fieldsOf(sample.data).some(
					({ type, field }) =>
						type === "DROP_DOWN" && fieldValue(field)?.k === "null",
				),
			);
		expect(found).toBe(true);
	});

	test("Saved では null にならない", () => {
		const offenders = samples.filter(isSavedContext).flatMap((sample) =>
			fieldsOf(sample.data)
				.filter(
					({ type, field }) =>
						type === "DROP_DOWN" && fieldValue(field)?.k === "null",
				)
				.map(({ code }) => `${sample.event}:${code}`),
		);
		expect(offenders).toEqual([]);
	});
});

describe("disabled / error は読み取りに存在しない", () => {
	test("どの文脈にも disabled / error を持つフィールドが無い", () => {
		const offenders = samples.flatMap((sample) =>
			fieldsOf(sample.data)
				.filter(
					({ field }) =>
						field.k === "object" &&
						(field.keys.includes("disabled") || field.keys.includes("error")),
				)
				.map(({ code }) => `${sample.event}/${sample.source}:${code}`),
		);
		expect(offenders).toEqual([]);
	});
});

describe("ルックアップのキーフィールド", () => {
	test("JS API / event.record では confirmed と recordId を持つ", () => {
		const found = samples
			.filter((sample) => !isRestContext(sample))
			.some((sample) =>
				fieldsOf(sample.data).some(
					({ field }) =>
						field.k === "object" &&
						field.keys.includes("confirmed") &&
						field.keys.includes("recordId"),
				),
			);
		expect(found).toBe(true);
	});

	test("REST では confirmed も recordId も持たない", () => {
		const offenders = samples.filter(isRestContext).flatMap((sample) =>
			fieldsOf(sample.data)
				.filter(
					({ field }) =>
						field.k === "object" &&
						(field.keys.includes("confirmed") ||
							field.keys.includes("recordId")),
				)
				.map(({ code }) => `${sample.event}:${code}`),
		);
		expect(offenders).toEqual([]);
	});
});

describe("サブテーブルの行 id", () => {
	const rowIds = (sample: Sample): Probed[] => {
		const out: Probed[] = [];
		for (const { type, field } of fieldsOf(sample.data)) {
			if (type !== "SUBTABLE" || field.k !== "object") continue;
			const rows = field.props.value;
			if (rows === undefined || rows.k !== "array") continue;
			for (const row of rows.items) {
				if (row.k !== "object") continue;
				const id = row.props.id;
				if (id !== undefined) out.push(id);
			}
		}
		return out;
	};

	test("Saved と Rest では必ず文字列", () => {
		const offenders = samples
			.filter((sample) => isSavedContext(sample) || isRestContext(sample))
			.flatMap((sample) =>
				rowIds(sample)
					.filter((id) => id.k !== "string")
					.map((id) => `${sample.event}:${id.k}`),
			);
		expect(offenders).toEqual([]);
	});

	test("Editing では null になりうる", () => {
		const found = samples
			.filter(isEditingContext)
			.some((sample) => rowIds(sample).some((id) => id.k === "null"));
		expect(found).toBe(true);
	});
});

describe("レコードに現れないフィールド", () => {
	test("GROUP と REFERENCE_TABLE はどの文脈にも現れない", () => {
		const offenders = samples.flatMap((sample) =>
			fieldsOf(sample.data)
				.filter(({ type }) => type === "GROUP" || type === "REFERENCE_TABLE")
				.map(({ code, type }) => `${sample.event}:${code}(${type})`),
		);
		expect(offenders).toEqual([]);
	});

	test("グループ内フィールドはフラットに現れる", () => {
		const found = samples.some((sample) =>
			fieldsOf(sample.data).some(({ code }) => code === "inGroupText"),
		);
		expect(found).toBe(true);
	});
});
