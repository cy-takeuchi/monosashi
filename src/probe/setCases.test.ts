import { describe, expect, test } from "vitest";
import { OBSERVED_FIELD_TYPES } from "../../test/fieldTypes";
import { canSetValue } from "../build/setValue.js";
import { REJECTED_ON_WRITE } from "../convert/fieldTypes.js";
import {
	CURRENT_VALUE,
	type ResolvedCodes,
	SET_CASES,
	STRIP_ROW_IDS,
} from "./setCases.js";

/**
 * ケース定義そのものを縛る。**実 kintone には繋がない。**
 *
 * 測る前にレビューできるようにするのが目的。
 * 「その確かめ方では答えが出ない」という手戻りを、実測の前に見つける。
 */

/** 全種別が載った検証アプリを模したもの */
const fullCodes: ResolvedCodes = {
	byType: Object.fromEntries(
		OBSERVED_FIELD_TYPES.map((type) => [type, `code_${type}`]),
	),
	subtable: { code: "code_SUBTABLE", rowIds: ["1", "2"] },
	file: {
		code: "code_FILE",
		first: { contentType: "text/plain", fileKey: "k", name: "n", size: "1" },
	},
};

/** 何も無い画面。飛ばす経路が動くか */
const emptyCodes: ResolvedCodes = {
	byType: {},
	subtable: undefined,
	file: undefined,
};

describe("ケース定義", () => {
	test("id が重複していない", () => {
		const ids = SET_CASES.map(({ id }) => id);
		expect(ids).toEqual([...new Set(ids)]);
	});

	test("question が空でない", () => {
		expect(SET_CASES.filter(({ question }) => question.trim() === "")).toEqual(
			[],
		);
	});

	test("全種別が載った画面では、ほぼすべてのケースが組み立てられる", () => {
		const skipped = SET_CASES.filter(
			({ build }) => build(fullCodes) === undefined,
		).map(({ id }) => id);
		expect(skipped).toEqual([]);
	});

	test("対象が無い画面では黙って壊れず undefined を返す", () => {
		// 存在しないフィールドコードを渡すケースだけは、レコードに依存しないので残る
		const built = SET_CASES.filter(
			({ build }) => build(emptyCodes) !== undefined,
		).map(({ id }) => id);
		expect(built).toEqual(["unknown-field-code"]);
	});
});

describe("何を測ろうとしているか", () => {
	// **REST が拒否した種別は、set() でも全部確かめる。**
	// REST と set() は別の API なので同じ結果とは限らない。
	// 片方だけ測って「同じだろう」と決めるのが、このリポジトリが繰り返し
	// 塞いできた誤り（DECISIONS「同形だと思えることも根拠にならない」）
	test("REST が拒否した種別をすべて覆っている", () => {
		const covered = SET_CASES.flatMap(({ build }) => {
			const patch = build(fullCodes);
			if (patch === undefined) return [];
			return Object.values(patch).map((field) =>
				typeof field === "object" && field !== null
					? String((field as { type?: unknown }).type)
					: "",
			);
		});
		const missing = REJECTED_ON_WRITE.filter((type) => !covered.includes(type));
		// GROUP はレコードに現れないので、set() には渡せない（実測で除外済み）
		expect(missing).toEqual(["GROUP"]);
	});

	// **null を受け付ける種別すべてに、種別ごとのケースがある。**
	//
	// `canSetValue` を使うのは「どの種別が対象か」を数え上げるためだけ。
	// **形でまとめて 1 つで済ませない。** 結論は種別ごとの表になる。
	//
	// ここが落ちたら、対象の種別が増えたか、ケースを削ったかのどちらか。
	// どちらも測り直しが要る
	test("null を受け付ける全種別に null を渡している", () => {
		// **表（VALUE_SHAPE）を export せず、canSetValue の挙動から導く。**
		// 表を公開すると内部の形が公開 API になる。
		// 挙動から引けば、表の作りが変わっても追随する
		const nullable = OBSERVED_FIELD_TYPES.filter((type) =>
			canSetValue({ f: { type, value: "" } }, "f", null),
		);
		expect(nullable.length).toBeGreaterThan(1);

		const measured = nullable.filter((type) =>
			SET_CASES.some(({ build }) => {
				const patch = build(fullCodes);
				if (patch === undefined) return false;
				return Object.values(patch).some(
					(field) =>
						typeof field === "object" &&
						field !== null &&
						(field as { type?: unknown }).type === type &&
						(field as { value?: unknown }).value === null,
				);
			}),
		);
		expect([...measured].sort()).toEqual([...nullable].sort());
	});

	test("REST と JS API で表現が違う DROP_DOWN を測っている", () => {
		const patch = SET_CASES.find(({ id }) => id === "dropdown-null")?.build(
			fullCodes,
		);
		expect(patch).toBeDefined();
		expect(Object.values(patch ?? {})[0]).toMatchObject({
			type: "DROP_DOWN",
			value: null,
		});
	});

	test("FILE は 4 キーと fileKey だけの両方を測っている", () => {
		const all = SET_CASES.find(({ id }) => id === "file-all-keys")?.build(
			fullCodes,
		);
		const only = SET_CASES.find(({ id }) => id === "file-key-only")?.build(
			fullCodes,
		);
		const keysOf = (patch: Record<string, unknown> | undefined): string[] => {
			const field = Object.values(patch ?? {})[0] as { value?: unknown };
			const first = Array.isArray(field?.value) ? field.value[0] : {};
			return Object.keys(first as object).sort();
		};
		expect(keysOf(all)).toEqual(["contentType", "fileKey", "name", "size"]);
		expect(keysOf(only)).toEqual(["fileKey"]);
	});

	test("サブテーブルは id あり / なしの両方を測っている", () => {
		const keep = SET_CASES.find(
			({ id }) => id === "subtable-keep-row-id",
		)?.build(fullCodes);
		const drop = SET_CASES.find(
			({ id }) => id === "subtable-drop-row-id",
		)?.build(fullCodes);
		expect(Object.values(keep ?? {})[0]).toMatchObject({
			value: CURRENT_VALUE,
		});
		expect(Object.values(drop ?? {})[0]).toMatchObject({
			value: STRIP_ROW_IDS,
		});
	});

	test("type を省くケースが type を持っていない", () => {
		const patch = SET_CASES.find(({ id }) => id === "no-type")?.build(
			fullCodes,
		);
		const field = Object.values(patch ?? {})[0] as object;
		expect("type" in field).toBe(false);
	});
});

describe("目印は値として区別できる", () => {
	// materialize（main.ts）が `=== CURRENT_VALUE` で判定するので、
	// 実データと衝突しないことが前提になる。Symbol なら衝突しない
	test("CURRENT_VALUE と STRIP_ROW_IDS は別物", () => {
		expect(CURRENT_VALUE).not.toBe(STRIP_ROW_IDS);
		expect(typeof CURRENT_VALUE).toBe("symbol");
		expect(typeof STRIP_ROW_IDS).toBe("symbol");
	});
});
