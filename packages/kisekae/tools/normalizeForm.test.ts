/**
 * フォーム定義の正規化を縛る。
 *
 * ここで見たいのは「伏せられること」だけではない。
 * **伏せてはいけないものが残ること**が本題。
 * 一律に伏せる実装にすると、測定対象そのものが消える。
 */

import { describe, expect, test } from "vitest";
import { normalizeForm, PLACEHOLDER } from "./normalizeForm";

const isRecord = (value: unknown): Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`オブジェクトではありません: ${String(value)}`);
	}
	return value as Record<string, unknown>;
};

/** 1 アプリ分の採取結果を組む */
const captured = (
	properties: Record<string, unknown>,
	layout: unknown[] = [],
) => ({
	version: 1,
	at: "2026-09-10T00:00:00.000Z",
	apps: [
		{
			role: "fixture",
			fields: { properties, revision: "42" },
			layout: { layout, revision: "17" },
		},
	],
});

const firstApp = (raw: unknown) => {
	const normalized = normalizeForm(raw);
	const app = isRecord(normalized.apps[0]);
	return {
		normalized,
		app,
		fields: isRecord(app.fields),
		layout: isRecord(app.layout),
		properties: isRecord(isRecord(app.fields).properties),
	};
};

describe("環境ごとに変わるものを伏せる", () => {
	test("revision と採取時刻を伏せる", () => {
		const { normalized, fields, layout } = firstApp(captured({}));
		expect(normalized.at).toBe(PLACEHOLDER.at);
		expect(fields.revision).toBe(PLACEHOLDER.revision);
		expect(layout.revision).toBe(PLACEHOLDER.revision);
	});

	test("ルックアップの参照先アプリ ID を伏せ、code は残す", () => {
		const { properties } = firstApp(
			captured({
				lookupKey: {
					type: "SINGLE_LINE_TEXT",
					code: "lookupKey",
					lookup: { relatedApp: { app: "123", code: "" }, fieldMappings: [] },
				},
			}),
		);
		const lookup = isRecord(isRecord(properties.lookupKey).lookup);
		expect(lookup.relatedApp).toEqual({ app: PLACEHOLDER.appId, code: "" });
	});

	test("関連レコード一覧の参照先アプリ ID も伏せる", () => {
		const { properties } = firstApp(
			captured({
				referenceTable: {
					type: "REFERENCE_TABLE",
					code: "referenceTable",
					referenceTable: { relatedApp: { app: "123", code: "src" } },
				},
			}),
		);
		const table = isRecord(isRecord(properties.referenceTable).referenceTable);
		expect(table.relatedApp).toEqual({
			app: PLACEHOLDER.appId,
			code: "src",
		});
	});

	test("ユーザーの code と name を伏せる", () => {
		const { properties } = firstApp(
			captured({
				userSelect: {
					type: "USER_SELECT",
					code: "userSelect",
					entities: [{ type: "USER", code: "taro", name: "山田 太郎" }],
					defaultValue: [{ type: "USER", code: "hanako" }],
				},
			}),
		);
		const field = isRecord(properties.userSelect);
		expect(field.entities).toEqual([
			{
				type: "USER",
				code: PLACEHOLDER.entityCode,
				name: PLACEHOLDER.entityName,
			},
		]);
		// name を持たない形で来たら、name を足さない（キーの有無を壊さない）
		expect(field.defaultValue).toEqual([
			{ type: "USER", code: PLACEHOLDER.entityCode },
		]);
	});
});

describe("伏せてはいけないもの", () => {
	/**
	 * `{ type: "FUNCTION", code: "LOGINUSER()" }` の `code` は kintone の
	 * 関数名そのもの。個人情報ではなく測定の対象で、伏せると
	 * 「初期値にログインユーザーが指定されている」という情報が消える。
	 */
	test("LOGINUSER() は伏せない", () => {
		const { properties } = firstApp(
			captured({
				userSelect: {
					type: "USER_SELECT",
					code: "userSelect",
					entities: [],
					defaultValue: [
						{ type: "FUNCTION", code: "LOGINUSER()" },
						{ type: "USER", code: "taro" },
					],
				},
			}),
		);
		expect(isRecord(properties.userSelect).defaultValue).toEqual([
			{ type: "FUNCTION", code: "LOGINUSER()" },
			{ type: "USER", code: PLACEHOLDER.entityCode },
		]);
	});

	/**
	 * 名前なしスペーサーの `elementId` が空文字列で返るのかは、
	 * この採取の測定対象そのもの。空文字を潰すと測れない。
	 */
	test("空文字は空文字のまま残す", () => {
		const { layout } = firstApp(
			captured({}, [
				{
					type: "ROW",
					fields: [
						{ type: "SPACER", elementId: "", size: { width: "100" } },
						{ type: "SPACER", elementId: "named", size: { width: "100" } },
					],
				},
			]),
		);
		expect(layout.layout).toEqual([
			{
				type: "ROW",
				fields: [
					{ type: "SPACER", elementId: "", size: { width: "100" } },
					{ type: "SPACER", elementId: "named", size: { width: "100" } },
				],
			},
		]);
	});

	/**
	 * レイアウトの順序は kisekae が「レイアウト順に並べて返す」ことの根拠。
	 * 並べ替えると根拠が消える。
	 */
	test("layout は並べ替えない", () => {
		const rows = [
			{ type: "ROW", fields: [{ type: "SINGLE_LINE_TEXT", code: "z" }] },
			{ type: "ROW", fields: [{ type: "SINGLE_LINE_TEXT", code: "a" }] },
		];
		const { layout } = firstApp(captured({}, rows));
		expect(layout.layout).toEqual(rows);
	});
});

describe("キーの順序を揃える", () => {
	test("properties をコードで並べ替える", () => {
		const { properties } = firstApp(
			captured({
				zebra: { type: "SINGLE_LINE_TEXT", code: "zebra" },
				apple: { type: "SINGLE_LINE_TEXT", code: "apple" },
			}),
		);
		expect(Object.keys(properties)).toEqual(["apple", "zebra"]);
	});

	test("サブテーブル内のフィールドも並べ替える", () => {
		const { properties } = firstApp(
			captured({
				subtable: {
					type: "SUBTABLE",
					code: "subtable",
					fields: {
						zebra: { type: "SINGLE_LINE_TEXT", code: "zebra" },
						apple: { type: "SINGLE_LINE_TEXT", code: "apple" },
					},
				},
			}),
		);
		const fields = isRecord(isRecord(properties.subtable).fields);
		expect(Object.keys(fields)).toEqual(["apple", "zebra"]);
	});
});

describe("採取結果の形が違えば落ちる", () => {
	test("apps が無ければ例外にする", () => {
		expect(() => normalizeForm({ version: 1 })).toThrow(/apps の配列/);
	});
});
