import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { OBSERVED_FIELD_TYPES } from "../../test/fieldTypes";
import { canSetValue } from "../build/setValue.js";
import { REJECTED_ON_WRITE } from "../convert/fieldTypes.js";
import {
	CURRENT_VALUE,
	type ResolvedCodes,
	ROWS_DROP_ID,
	ROWS_KEEP_ID,
	SET_CASES,
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
		fromEvent: false,
	},
	found: "テスト用",
};

/** 何も無い画面。飛ばす経路が動くか */
const emptyCodes: ResolvedCodes = {
	byType: {},
	subtable: undefined,
	file: undefined,
	found: "テスト用（空）",
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
			value: ROWS_KEEP_ID,
		});
		expect(Object.values(drop ?? {})[0]).toMatchObject({
			value: ROWS_DROP_ID,
		});
	});

	// **同じ値を渡すと変化が読めない。**
	// 最初は読み取り専用に get() の値をそのまま返していたら、
	// 19 ケース中 17 件が「変化なし」になって何も分からなかった（2026-09-08）。
	//
	// 読み取り専用のケースは、いまの値と違う値を渡していること
	test("読み取り専用のケースは CURRENT_VALUE を渡していない", () => {
		const readOnly = SET_CASES.filter(({ id }) => id.startsWith("readonly-"));
		expect(readOnly.length).toBeGreaterThan(0);

		const passthrough = readOnly.filter(({ build }) => {
			const patch = build(fullCodes);
			if (patch === undefined) return false;
			return Object.values(patch).some(
				(field) =>
					typeof field === "object" &&
					field !== null &&
					(field as { value?: unknown }).value === CURRENT_VALUE,
			);
		});
		expect(passthrough.map(({ id }) => id)).toEqual([]);
	});

	test("読み取り専用の全種別に、渡す値が用意されている", () => {
		const missing = SET_CASES.filter(
			({ id, build }) =>
				id.startsWith("readonly-") &&
				Object.values(build(fullCodes) ?? {}).some(
					(field) =>
						typeof field === "object" &&
						field !== null &&
						(field as { value?: unknown }).value === undefined,
				),
		).map(({ id }) => id);
		expect(missing).toEqual([]);
	});

	test("type を省くケースが type を持っていない", () => {
		const patch = SET_CASES.find(({ id }) => id === "no-type")?.build(
			fullCodes,
		);
		const field = Object.values(patch ?? {})[0] as object;
		expect("type" in field).toBe(false);
	});
});

describe("失敗の検出は probe 側では行わない", () => {
	// **set() に不正な値を渡しても例外は飛ばない。**
	// kintone が画面にエラーを出すだけで、呼び出し元には何も返らない
	// （e2e/panel.ts に既に記録がある。2026-09-08 に実際に踏んだ）。
	//
	// try/catch を置くと「捕まえられる」という誤解が残るので置かない。
	// ここが落ちたら、その誤解に戻りかけている
	test("probe に try/catch を置いていない", () => {
		const source = readFileSync("src/probe/main.ts", "utf8");
		const runSetCase = source.slice(
			source.indexOf("const runSetCase = "),
			source.indexOf("let changeEventCount"),
		);
		expect(runSetCase).not.toContain("try {");
		expect(runSetCase).not.toContain("catch");
	});

	test("判定は errorShown で受け取る形になっている", () => {
		const source = readFileSync("src/probe/store.ts", "utf8");
		expect(source).toContain("errorShown");
		expect(source).toContain("markSetCase");
	});
});

describe("観測できないケースに印が付いている", () => {
	// **`get()` は編集画面で FILE を空配列で返す**（実測 2026-09-08）。
	// 印が無いと「変わらなかった」と「見えていない」を取り違えて
	// 「無視された」という誤った結論が基準になる
	test("FILE のケースは unobservable", () => {
		const fileCases = SET_CASES.filter(({ id }) => id.startsWith("file-"));
		expect(fileCases.length).toBeGreaterThan(0);

		const unmarked = fileCases
			.filter(({ unobservable }) => unobservable !== true)
			.map(({ id }) => id);
		expect(unmarked).toEqual([]);
	});

	// 観測できるケースに印を付けると、変化を見なくなって検出力が落ちる
	test("FILE 以外には印を付けていない", () => {
		const marked = SET_CASES.filter(
			({ id, unobservable }) =>
				unobservable === true && !id.startsWith("file-"),
		).map(({ id }) => id);
		expect(marked).toEqual([]);
	});
});

describe("ケースごとに画面を作り直す", () => {
	// **`page.goto` では作り直されない。** ハッシュだけが違う同じ URL への
	// 遷移はリロードにならないので、前のケースのエラー表示が残る
	// （2026-09-08 に開始時チェックが検出した）。
	//
	// ここが落ちたら goto に戻りかけている
	test("2 件目以降は reload している", () => {
		const source = readFileSync("e2e/panel.ts", "utf8");
		const driver = source.slice(
			source.indexOf("export const measureSetBehavior"),
		);
		expect(driver).toContain("page.reload()");
	});

	// 止めたままにすると、このあとの採取が全部消える
	test("自動採取の停止を必ず戻している", () => {
		const source = readFileSync("e2e/panel.ts", "utf8");
		const driver = source.slice(
			source.indexOf("export const measureSetBehavior"),
		);
		expect(driver).toContain("suppressSamples(true)");
		expect(driver).toContain("suppressSamples(false)");
		// finally に置いていないと、例外で抜けたときに戻らない
		const finallyBlock = driver.slice(driver.lastIndexOf("} finally {"));
		expect(finallyBlock).toContain("suppressSamples(false)");
	});
});

describe("測定用レコードの作り方", () => {
	// **重複禁止フィールドをそのまま渡すと落ちる。**
	// filledRecord は検証アプリの構築でも使っており、そこで作ったレコードが
	// 同じ値を持っている。2 件目として作るときは差し替えが要る
	// （2026-09-08 に [400] [CB_VA01] で踏んだ）。
	//
	// unique な種別が増えたら、ここが落ちて差し替え漏れに気づける
	test("unique なフィールドは測定用レコードで差し替えている", () => {
		const fields = readFileSync("tools/fixture-app/fields.ts", "utf8");
		const spec = readFileSync("e2e/collect.spec.ts", "utf8");
		const probeBlock = spec.slice(spec.indexOf("filledRecord(probeFileKeys"));

		// アプリ本体の unique フィールドを拾う（参照先アプリの分は除く）
		// 参照先アプリ（lookupAppFields）の unique は別アプリなので除く
		const main = fields.slice(
			fields.indexOf("export const fixtureAppBaseFields"),
		);
		const uniques = [
			...main.matchAll(/code: "(\w+)",[\s\S]{0,200}?unique: true/g),
		].map((match) => match[1]);
		expect(uniques.length).toBeGreaterThan(0);

		const missing = uniques.filter(
			(code) => code !== undefined && !probeBlock.includes(code),
		);
		expect(missing).toEqual([]);
	});
});

describe("dialog リスナーを漏らさない", () => {
	// **`page.once("dialog", ...)` は発火しなかったら武装したまま残る。**
	// `deleteRecord` がそれで壊れた（2026-09-08）。DOM のダイアログで済んだ画面では
	// window.confirm が出ないので発火せず、あとで別の目的で出したダイアログを
	// 横取りして `Cannot accept dialog which is already handled!` になる。
	//
	// 登録したら必ず外す。ソースを読んで、登録の数だけ解除があることを見る
	test("dialog を登録した数だけ page.off がある", () => {
		for (const file of ["e2e/panel.ts", "e2e/collect.spec.ts"]) {
			const source = readFileSync(file, "utf8");
			const registered = [...source.matchAll(/page\.(?:on|once)\("dialog"/g)]
				.length;
			const removed = [...source.matchAll(/page\.off\("dialog"/g)].length;
			expect(removed, `${file}: 登録 ${registered} / 解除 ${removed}`).toBe(
				registered,
			);
		}
	});
});

describe("目印は値として区別できる", () => {
	// materialize（main.ts）が `=== CURRENT_VALUE` で判定するので、
	// 実データと衝突しないことが前提になる。Symbol なら衝突しない
	test("目印が互いに別物", () => {
		const marks = [CURRENT_VALUE, ROWS_KEEP_ID, ROWS_DROP_ID];
		expect(new Set(marks).size).toBe(marks.length);
		for (const mark of marks) expect(typeof mark).toBe("symbol");
	});
});
