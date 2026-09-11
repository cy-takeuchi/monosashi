/**
 * 検証アプリのフィールド定義が、それ自身で矛盾していないことを確かめる。
 *
 * ## なぜ要るか
 *
 * `tools/fixture-app/fields.ts` は 559 行のリテラルを
 * `as unknown as Properties` で押し通している。あの型は
 * `exactOptionalPropertyTypes` と噛み合わず `satisfies` にできないので、
 * **キーとコードの取り違えを型は 1 つも見ていない。**
 *
 * ```ts
 * singleLineText: { type: "SINGLE_LINE_TEXT", code: "singleLineTexo", ... }
 * ```
 *
 * これは通る。そして `addFormFields` も通る（kintone はキーではなく
 * `code` を使う）。**壊れるのはレイアウトとレコード投入**で、
 * 実 kintone に接続して初めて分かる。認証情報が要るので、
 * 手元でも CI（PR）でも気づけない。
 *
 * 形が整っていることだけなら、接続せずにここで見られる。
 */

import { describe, expect, test } from "vitest";
import {
	allFixtureFieldCodes,
	fixtureAppBaseFields,
	fixtureAppDependentFields,
	lookupAppFields,
	subtableFieldCodes,
} from "../tools/fixture-app/fields";
import { emptyRecord, filledRecord } from "../tools/fixture-app/records";

/** 型が緩いので、読むときだけ形を書く */
type Declared = { [code: string]: { code?: unknown; type?: unknown } };

const DEFINITIONS = [
	["lookupAppFields", lookupAppFields as Declared],
	["fixtureAppBaseFields", fixtureAppBaseFields() as Declared],
	["fixtureAppDependentFields", fixtureAppDependentFields("99") as Declared],
] as const;

describe("フィールド定義のキーと code が一致する", () => {
	test.each(DEFINITIONS)("%s", (_name, properties) => {
		const mismatched = Object.entries(properties)
			.filter(([key, property]) => property.code !== key)
			.map(([key, property]) => `${key} → code: ${String(property.code)}`);
		expect(
			mismatched,
			"kintone は code を使うので、キーと違っていても addFormFields は通る。壊れるのはレイアウトとレコード投入",
		).toEqual([]);
	});

	test("サブテーブルの中も一致する", () => {
		const subtable = (fixtureAppBaseFields() as Declared).subtable as {
			fields?: Declared;
		};
		const fields = subtable.fields ?? {};
		const mismatched = Object.entries(fields)
			.filter(([key, property]) => property.code !== key)
			.map(([key]) => key);
		expect(mismatched).toEqual([]);
		expect(Object.keys(fields), "走査が空振りしている").not.toHaveLength(0);
	});
});

describe("投入するレコードのコードが定義にある", () => {
	// **レイアウトや採取より前に落とす。** 定義に無いコードを渡すと
	// addRecords が [400] で落ちるが、そこまで行くには実 kintone が要る
	const declared = new Set([
		...allFixtureFieldCodes("99"),
		...subtableFieldCodes,
	]);

	test.each([
		["emptyRecord", emptyRecord()],
		[
			"filledRecord",
			filledRecord(["key1", "key2"], "someone", {
				singleLineTextUnique: "unique-test",
			}),
		],
	])("%s", (_name, record) => {
		const unknownCodes = Object.keys(record).filter(
			(code) => !declared.has(code),
		);
		expect(unknownCodes).toEqual([]);
	});

	test("サブテーブルの行のセルも定義にある", () => {
		const record = filledRecord(["key1", "key2"], "someone", {
			singleLineTextUnique: "unique-test",
		});
		const rows = (record.subtable?.value ?? []) as {
			value?: { [code: string]: unknown };
		}[];
		const cells = new Set(rows.flatMap((row) => Object.keys(row.value ?? {})));
		expect(cells.size, "走査が空振りしている").toBeGreaterThan(0);
		expect([...cells].filter((code) => !declared.has(code))).toEqual([]);
	});
});
