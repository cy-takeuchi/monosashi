import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { SET_CASES } from "../probe/setCases.js";
import type { ProbeStore } from "../probe/store.js";
import { REJECTED_ON_WRITE } from "./fieldTypes.js";
import {
	IGNORED_ON_SET,
	isExcludedOnSet,
	isRejectedOnSet,
	REJECTED_ON_SET,
} from "./setFieldTypes.js";
import { convertFieldForSet, toSetRecord } from "./toSetRecord.js";

/**
 * `toSetRecord` を**実測結果に対して**検証する。
 *
 * `fixtures/set-behavior.md` の元データ（`measured.json` の `setBehavior`）を読み、
 * 「拒否された種別を除いているか」を実測から引く。
 * 表を手で写すと、実測を採り直したときに静かにずれる。
 */

const setBehavior = ((): ProbeStore["setBehavior"] => {
	const store = JSON.parse(
		readFileSync("fixtures/measured.json", "utf8"),
	) as ProbeStore;
	return store.setBehavior;
})();

/**
 * 実測で**種別として拒否された**もの。
 *
 * **「拒否されたケースの種別」ではない。** `unknown-field-code` は
 * `SINGLE_LINE_TEXT` を渡すが、拒否理由はフィールドコードが無いことで
 * 種別は無関係（この取り違えでテストが落ちた。2026-09-08）。
 *
 * ケース定義の `isolates`（何を切り分けているか）が付いているものだけを見る。
 *
 * **`isolates` は結果ではなくケース定義から引く。**
 * フィクスチャに持たせると、定義を直すたびに採り直しが要る。
 * id で突き合わせれば、定義を直した瞬間に反映される。
 */
const isolatedTypeOf = (id: string): string | undefined =>
	SET_CASES.find((setCase) => setCase.id === id)?.isolates;

const rejectedTypes = new Set(
	(setBehavior ?? [])
		.filter((result) => result.errorShown === true)
		.map(({ id }) => isolatedTypeOf(id))
		.filter((type): type is string => type !== undefined),
);

/** 実測で無視された（エラーも変化もなかった）種別 */
const ignoredTypes = new Set(
	(setBehavior ?? [])
		.filter((result) => result.errorShown === false)
		.map(({ id }) => isolatedTypeOf(id))
		.filter((type): type is string => type !== undefined),
);

describe("実測が根拠になっている", () => {
	test("setBehavior が measured.json に在る", () => {
		expect(setBehavior?.length ?? 0).toBeGreaterThan(0);
	});

	test("種別を切り分けたケースがある", () => {
		expect(rejectedTypes.size + ignoredTypes.size).toBeGreaterThan(0);
	});

	// **実測で拒否された種別を、実測から引いて突き合わせる。**
	// 表を手で写すと、採り直したときに静かにずれる
	test("拒否された種別をすべて除いている", () => {
		expect(rejectedTypes.size).toBeGreaterThan(0);
		const notExcluded = [...rejectedTypes].filter(
			(type) => !isExcludedOnSet(type),
		);
		expect(notExcluded).toEqual([]);
	});

	test("REJECTED_ON_SET が実測と一致している", () => {
		expect([...REJECTED_ON_SET].sort()).toEqual([...rejectedTypes].sort());
	});

	// **拒否されていない種別を除いてはいけない。**
	// 除くと画面に反映されなくなる。整形として除いてよいのは
	// 「無視される」と実測で分かっているものだけ
	test("受け入れられる種別を除いていない", () => {
		const wronglyExcluded = [...ignoredTypes].filter(
			(type) =>
				isExcludedOnSet(type) &&
				!new Set<string>(IGNORED_ON_SET).has(type) &&
				!new Set<string>(REJECTED_ON_SET).has(type),
		);
		expect(wronglyExcluded).toEqual([]);
	});
});

describe("REST と要件が違う", () => {
	// **同じ実装を使い回せない**ことを縛る。
	// 片方を直したときにもう片方も直したくなるが、要件が違う
	test("REST は 8 種別を拒否し、set() は 1 種別だけ", () => {
		expect(REJECTED_ON_WRITE.length).toBeGreaterThan(REJECTED_ON_SET.length);
		expect([...REJECTED_ON_SET]).toEqual(["CATEGORY"]);
	});

	test("REST が拒否する種別は set() では無視されるだけ", () => {
		const ignored = new Set<string>(IGNORED_ON_SET);
		const notRejectedOnSet = REJECTED_ON_WRITE.filter(
			(type) => !isRejectedOnSet(type),
		);
		// GROUP はレコードに現れないので set() には渡せない（実測で除外済み）
		const measurable = notRejectedOnSet.filter((type) => type !== "GROUP");
		expect(measurable.filter((type) => !ignored.has(type))).toEqual([]);
	});
});

describe("type を必ず付ける", () => {
	// 省くと実行時に落ちる（実測 2026-08-30）
	test("すべてのフィールドに type が付く", () => {
		const out = toSetRecord({
			text: { type: "SINGLE_LINE_TEXT", value: "a" },
			num: { type: "NUMBER", value: "1" },
		});
		expect(Object.values(out).every((field) => "type" in field)).toBe(true);
	});

	test("サブテーブルの中のセルにも type が付く", () => {
		const out = toSetRecord({
			table: {
				type: "SUBTABLE",
				value: [{ id: "1", value: { cell: { type: "NUMBER", value: "1" } } }],
			},
		});
		const rows = (out.table?.value ?? []) as {
			value: Record<string, object>;
		}[];
		expect("type" in (rows[0]?.value.cell ?? {})).toBe(true);
	});
});

describe("触らないもの", () => {
	// 4 キーのままで通る（実測）。削る必要が無い
	test("FILE の値をそのまま渡す", () => {
		const first = {
			contentType: "text/plain",
			fileKey: "k",
			name: "n",
			size: "1",
		};
		const out = toSetRecord({ f: { type: "FILE", value: [first] } });
		expect(out.f?.value).toEqual([first]);
	});

	// 除いても保たれるが、REST から来た行をそのまま扱えるように渡す
	test("サブテーブルの行 id を渡す", () => {
		const out = toSetRecord({
			table: {
				type: "SUBTABLE",
				value: [{ id: "42", value: {} }],
			},
		});
		const rows = (out.table?.value ?? []) as { id?: string }[];
		expect(rows[0]?.id).toBe("42");
	});

	test("行 id が null なら渡さない（作成画面の新規行）", () => {
		const out = toSetRecord({
			table: { type: "SUBTABLE", value: [{ id: null, value: {} }] },
		});
		const rows = (out.table?.value ?? []) as object[];
		expect("id" in (rows[0] ?? {})).toBe(false);
	});

	// **null は受け入れられ、値が未入力になる**（実測）。
	// REST の未入力をそのまま渡せることが REST → set() の要点
	test("null をそのまま渡す", () => {
		const out = toSetRecord({
			d: { type: "DROP_DOWN", value: null },
			dt: { type: "DATE", value: null },
		});
		expect(out.d?.value).toBe(null);
		expect(out.dt?.value).toBe(null);
	});
});

describe("除くもの", () => {
	test("CATEGORY を除く（唯一の必須要件）", () => {
		const out = toSetRecord({
			c: { type: "CATEGORY", value: ["x"] },
			text: { type: "SINGLE_LINE_TEXT", value: "a" },
		});
		expect(Object.keys(out)).toEqual(["text"]);
	});

	test("読み取り専用と $id / $revision / CALC を除く（整形）", () => {
		const record = Object.fromEntries(
			IGNORED_ON_SET.map((type) => [`f_${type}`, { type, value: "x" }]),
		);
		const out = toSetRecord({
			...record,
			text: { type: "SINGLE_LINE_TEXT", value: "a" },
		});
		expect(Object.keys(out)).toEqual(["text"]);
	});

	test("サブテーブルの中でも除く", () => {
		const out = toSetRecord({
			table: {
				type: "SUBTABLE",
				value: [
					{
						id: "1",
						value: {
							calc: { type: "CALC", value: "9" },
							text: { type: "SINGLE_LINE_TEXT", value: "a" },
						},
					},
				],
			},
		});
		const rows = (out.table?.value ?? []) as {
			value: Record<string, unknown>;
		}[];
		expect(Object.keys(rows[0]?.value ?? {})).toEqual(["text"]);
	});
});

describe("convertFieldForSet は除く判定を含まない", () => {
	// 1 行だけ変換する用途で使えるようにするため。
	// 判定を混ぜると「除くべきもの」を渡せなくなる
	test("CATEGORY を渡しても undefined にならない", () => {
		expect(convertFieldForSet({ type: "CATEGORY", value: ["x"] })).toEqual({
			type: "CATEGORY",
			value: ["x"],
		});
	});
});
