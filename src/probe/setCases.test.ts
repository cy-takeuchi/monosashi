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

/**
 * ソースを読んで検査するときの下ごしらえ。
 *
 * ## 探す前に「そこに在る」ことを確かめる
 *
 * `main.ts` から `runSetCase.ts` へ切り出したとき、
 * 対象を `main.ts` のまま探していたのに**テストは緑だった**。
 * 空文字列を検査していただけで、何も守っていなかった（2026-09-08）。
 *
 * `anchor` が見つからなければ落とす。
 *
 * ## コメントを外す
 *
 * 「try/catch を置かない」のような方針は JSDoc で説明しているので、
 * 素朴に文字列で探すと**自分の説明文に当たる**。
 */
const codeOf = (path: string, anchor: string): string => {
	const source = readFileSync(path, "utf8");
	expect(source, `${path} に ${anchor} が無い`).toContain(anchor);
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
};

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
		const code = codeOf(
			"src/probe/runSetCase.ts",
			"export const runSetCase = ",
		);
		expect(code).not.toContain("try {");
		expect(code).not.toContain("catch");
	});

	test("判定は errorShown で受け取る形になっている", () => {
		const code = codeOf("src/probe/store.ts", "export const markSetCase");
		expect(code).toContain("errorShown");
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
		const anchor = "export const measureSetBehavior";
		const source = codeOf("e2e/panel.ts", anchor);
		const driver = source.slice(source.indexOf(anchor));
		expect(driver).toContain("page.reload()");
	});

	// 止めたままにすると、このあとの採取が全部消える
	//
	// **引数は正規表現で探す。** 以前は `suppressSamples(true)` を
	// 文字列で探していたが、整形の都合で引数が折り返されると
	// `suppressSamples(\n\ttrue,\n)` になって一致しなくなる。
	// 実際に `window` のキャストを短くしたときに折り返しが変わり、
	// **中身は正しいのにこのテストが落ちた**。縛る対象は整形ではなく呼び出し
	test("自動採取の停止を必ず戻している", () => {
		const anchor = "export const measureSetBehavior";
		const source = codeOf("e2e/panel.ts", anchor);
		const driver = source.slice(source.indexOf(anchor));
		const stop = /suppressSamples\(\s*true\s*[,)]/;
		const restore = /suppressSamples\(\s*false\s*[,)]/;
		expect(driver, "採取を止めていない").toMatch(stop);
		expect(driver, "採取を戻していない").toMatch(restore);

		// **例外で抜けたときも戻す。** 止めたままにすると、このあとの採取が
		// 全部消える。`.finally()` か `try`/`finally` のどちらかで囲うこと
		const at = driver.search(restore);
		const before = driver.slice(0, at);
		expect(
			before.includes(".finally(") || before.includes("} finally {"),
			"採取の再開が finally の外にある",
		).toBe(true);
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
		const fields = codeOf("tools/fixture-app/fields.ts", "unique: true");
		const spec = codeOf("e2e/collect.spec.ts", "filledRecord(probeFileKeys");
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
	// **`withDialogsAccepted` の外で登録させない。**
	// ヘルパが寿命を持つので、生の `page.on` / `page.once` を書くと
	// また外し忘れが起きる
	test("dialog の登録はヘルパ 1 箇所だけ", () => {
		// **レシーバ名で絞らない。** `page.on` だけを見ていたら、
		// `p.on("dialog", …)` と書いた変異を見逃した（2026-09-08）。
		// 引数が `"dialog"` であることだけを条件にする
		const code = codeOf("e2e/panel.ts", "const withDialogsAccepted");
		const registered = [...code.matchAll(/\.(?:on|once)\("dialog"/g)];
		const removed = [...code.matchAll(/\.off\("dialog"/g)];
		expect(
			registered.map(({ index }) => index),
			"dialog の登録が 1 箇所を超えている",
		).toHaveLength(1);
		expect(removed).toHaveLength(1);

		// 登録がヘルパの中に在ること。外に書いたら意味が無い
		const helperStart = code.indexOf("const withDialogsAccepted");
		const helperEnd = code.indexOf("\n};", helperStart);
		const at = registered[0]?.index ?? -1;
		expect(
			at,
			"dialog の登録が withDialogsAccepted の外にある",
		).toBeGreaterThan(helperStart);
		expect(at).toBeLessThan(helperEnd);
	});

	test("collect.spec.ts では直に登録していない", () => {
		const code = codeOf("e2e/collect.spec.ts", "measureSetBehavior");
		expect(code).not.toMatch(/\.(?:on|once)\("dialog"/);
	});
});

describe("目印は値として区別できる", () => {
	// materialize（runSetCase.ts）が `=== CURRENT_VALUE` で判定するので、
	// 実データと衝突しないことが前提になる。Symbol なら衝突しない
	test("目印が互いに別物", () => {
		const marks = [CURRENT_VALUE, ROWS_KEEP_ID, ROWS_DROP_ID];
		expect(new Set(marks).size).toBe(marks.length);
		for (const mark of marks) expect(typeof mark).toBe("symbol");
	});
});
