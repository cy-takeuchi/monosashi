import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
	LAYOUT_CONTAINER_KEYS,
	LAYOUT_ELEMENT_KEYS,
	LAYOUT_SIZE_KEYS,
	PROPERTY_KEYS,
} from "./rawKeys.js";

/**
 * `Raw` の型が実測と一致していることを縛る。
 *
 * これが 3 点のうちのもう 1 辺（`rawKeys.ts` の図）で、
 * **実測が正であることを機械にしたもの**。
 *
 * 実 kintone には接続しない。凍結したフィクスチャに対してだけ走る。
 * フィクスチャを採り直して差分が出たら、ここが落ちて型を直すことになる。
 *
 * ## 何を比べるのか
 *
 * **キーの集合。** 値の型は比べない（JSON からは `string` と
 * `"BEFORE" | "AFTER"` の区別が付かない）。
 * 型の主張のうち機械で確かめられるのはキーの有無までで、
 * そこが実際に外れていた箇所（`LABEL` / `HR` の `elementId`）でもある。
 *
 * ## パスは cwd 相対
 *
 * vitest はリポジトリのルートから走る。モノレポ化で
 * `packages/kisekae/fixtures/` に移したらここも直す
 * （`docs/DECISIONS.md`「12. 作業順序」の 7）。
 */

const FIXTURE = "fixtures/form/definition.json";

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown, where: string): Json => {
	if (!isRecord(value))
		throw new Error(`${where} がオブジェクトではありません`);
	return value;
};

const asArray = (value: unknown, where: string): unknown[] => {
	if (!Array.isArray(value)) throw new Error(`${where} が配列ではありません`);
	return value;
};

const fixture = (() => {
	const root = asRecord(
		JSON.parse(readFileSync(FIXTURE, "utf8")),
		`${FIXTURE} の中身`,
	);
	return asArray(root.apps, `${FIXTURE} の apps`).map((app, i) =>
		asRecord(app, `apps[${i}]`),
	);
})();

/** キー集合の食い違い。1 件ずつ「どこの何が」を出す */
type Mismatch = string;

const compare = (
	where: string,
	actual: Json,
	expected: readonly string[],
): Mismatch[] => {
	const got = new Set(Object.keys(actual));
	const want = new Set(expected);
	const extra = [...got].filter((key) => !want.has(key)).sort();
	const missing = [...want].filter((key) => !got.has(key)).sort();
	return [
		...(extra.length > 0
			? [`${where}: 実測にだけある ${extra.join(", ")}`]
			: []),
		...(missing.length > 0
			? [`${where}: 型にだけある ${missing.join(", ")}`]
			: []),
	];
};

const propertyMismatches = (where: string, property: Json): Mismatch[] => {
	// ルックアップは type で引けない。判定はキーの有無で行う
	const key = "lookup" in property ? "LOOKUP" : String(property.type);
	const expected = (PROPERTY_KEYS as Record<string, readonly string[]>)[key];
	if (expected === undefined) {
		return [`${where}: 型に無い type=${key}`];
	}
	const out = compare(`${where} (${key})`, property, expected);
	if (property.type === "SUBTABLE") {
		const fields = asRecord(property.fields, `${where}.fields`);
		for (const [code, inner] of Object.entries(fields)) {
			out.push(
				...propertyMismatches(
					`${where}.fields[${code}]`,
					asRecord(inner, `${where}.fields[${code}]`),
				),
			);
		}
	}
	return out;
};

const elementMismatches = (where: string, element: Json): Mismatch[] => {
	const type = String(element.type);
	const expected = (LAYOUT_ELEMENT_KEYS as Record<string, readonly string[]>)[
		type
	];
	if (expected === undefined) {
		return [`${where}: 型に無い要素 type=${type}`];
	}
	const out = compare(`${where} (${type})`, element, expected);
	if ("size" in element) {
		const sizeKeys =
			(LAYOUT_SIZE_KEYS as Record<string, readonly string[]>)[type] ??
			LAYOUT_SIZE_KEYS.default;
		out.push(
			...compare(
				`${where} (${type}).size`,
				asRecord(element.size, `${where}.size`),
				sizeKeys,
			),
		);
	}
	return out;
};

const containerMismatches = (where: string, row: Json): Mismatch[] => {
	const type = String(row.type);
	const expected = (LAYOUT_CONTAINER_KEYS as Record<string, readonly string[]>)[
		type
	];
	if (expected === undefined) {
		return [`${where}: 型に無いコンテナ type=${type}`];
	}
	const out = compare(`${where} (${type})`, row, expected);
	if (type === "ROW" || type === "SUBTABLE") {
		asArray(row.fields, `${where}.fields`).forEach((element, i) => {
			out.push(
				...elementMismatches(
					`${where}.fields[${i}]`,
					asRecord(element, `${where}.fields[${i}]`),
				),
			);
		});
	}
	if (type === "GROUP") {
		asArray(row.layout, `${where}.layout`).forEach((inner, i) => {
			out.push(
				...containerMismatches(
					`${where}.layout[${i}]`,
					asRecord(inner, `${where}.layout[${i}]`),
				),
			);
		});
	}
	return out;
};

const allMismatches = (): Mismatch[] =>
	fixture.flatMap((app) => {
		const role = String(app.role);
		const fields = asRecord(app.fields, `${role}.fields`);
		const layout = asRecord(app.layout, `${role}.layout`);
		const properties = asRecord(fields.properties, `${role}.properties`);

		return [
			...Object.entries(properties).flatMap(([code, property]) =>
				propertyMismatches(
					`[${role}] ${code}`,
					asRecord(property, `${role}.${code}`),
				),
			),
			...asArray(layout.layout, `${role}.layout.layout`).flatMap((row, i) =>
				containerMismatches(
					`[${role}] layout[${i}]`,
					asRecord(row, `${role}.layout[${i}]`),
				),
			),
		];
	});

describe("実測データが揃っていること", () => {
	test("2 つのアプリが入っている", () => {
		expect(fixture.map((app) => app.role)).toEqual(["fixture", "lookupSource"]);
	});

	test("測定用アプリに全種別がある", () => {
		const app = fixture[0];
		if (app === undefined) throw new Error("測定用アプリが無い");
		const properties = asRecord(
			asRecord(app.fields, "fields").properties,
			"properties",
		);
		const types = new Set(
			Object.values(properties).map((p) => String(asRecord(p, "p").type)),
		);
		// SUBTABLE / GROUP / REFERENCE_TABLE / LOOKUP まで入っていること
		for (const type of ["SUBTABLE", "GROUP", "REFERENCE_TABLE", "CATEGORY"]) {
			expect(types.has(type), `${type} が実測に無い`).toBe(true);
		}
	});

	test("レイアウト要素が実測に入っている", () => {
		const raw = readFileSync(FIXTURE, "utf8");
		for (const type of ["SPACER", "LABEL", "HR"]) {
			expect(raw.includes(`"${type}"`), `${type} が実測に無い`).toBe(true);
		}
	});
});

describe("Raw の型が実測と一致する", () => {
	/**
	 * **1 件ずつ出す。** まとめて「一致しません」だと、
	 * どの種別のどのキーが増えたのか分からず、実測を読み直すことになる。
	 */
	test("キーの集合が全件一致する", () => {
		const mismatches = allMismatches();
		expect(
			mismatches,
			`実測と型が食い違っている:\n  ${mismatches.join("\n  ")}`,
		).toEqual([]);
	});
});
