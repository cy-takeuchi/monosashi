import {
	getRecordViaJsApi,
	isMobile,
	setRecordViaJsApi,
} from "./kintoneApi.js";
import { probe } from "./serialize.js";
import {
	CURRENT_VALUE,
	EDITED_CELL,
	type ResolvedCodes,
	ROWS_DROP_ID,
	ROWS_KEEP_ID,
	SET_CASES,
} from "./setCases.js";
import * as store from "./store.js";

/**
 * `kintone.app.record.set()` の受け入れ挙動を 1 ケースずつ測る（#14）。
 *
 * ケースの定義は `setCases.ts`、判定は e2e（`e2e/panel.ts`）。
 * ここは**渡して、前後を読んで、記録するだけ**。
 *
 * ## なぜ main.ts から分けたか
 *
 * `main.ts` に置くと、採取（`event.record` / `get()` / `set()` の測定）と
 * **判定を e2e に委ねるこの測定**が同じファイルに混ざる。
 * 前者は probe だけで完結するが、後者は
 * 「1 ケースずつ画面を読み直す」「エラー表示を見る」という
 * **e2e との取り決めが前提**で、読むときに必要な文脈が違う。
 *
 * ## `set()` の失敗は検出できない
 *
 * 不正な値を渡しても例外は飛ばない。
 * kintone が画面にエラーを出すだけで、呼び出し元には何も返らない。
 * だから try/catch は**置かない**（置くと「捕まえられる」誤解が残る）。
 * `setCases.test.ts` がソースを読んで縛っている。
 */

/**
 * `event.record` で見えた FILE の値。フィールドコード → 添付の配列。
 *
 * **`kintone.app.record.get()` は編集画面で FILE を空配列で返す**（実測 2026-09-08）。
 * レコードに添付があっても `value` が `[]` になり、
 * `set()` の測定でその値を使えない。
 *
 * `event.record` 側には入っているので、show イベントで見えたものを覚えておく。
 * 1 ケースごとにリロードするので、そのたびに show が飛んで更新される。
 */
let fileValuesFromEvent: { [code: string]: unknown[] } = {};

/**
 * show イベントで見えた FILE の値を覚える（`main.ts` の event ハンドラから呼ぶ）。
 *
 * **状態をこちら側で持つ。** 使うのはこのモジュールだけなので、
 * `main.ts` に置くと「誰が読むのか」が追いにくくなる。
 */
export const rememberFileValues = (record: {
	[code: string]: { type?: unknown; value?: unknown };
}): void => {
	const found: { [code: string]: unknown[] } = {};
	for (const [code, field] of Object.entries(record)) {
		if (field?.type !== "FILE") continue;
		if (Array.isArray(field.value) && field.value.length > 0) {
			found[code] = field.value;
		}
	}
	if (Object.keys(found).length > 0) fileValuesFromEvent = found;
};

/** レコードを走査して、種別ごとの代表フィールドコードを解決する */
const resolveCodes = (
	rec: Record<string, { type?: unknown; value?: unknown }>,
): ResolvedCodes => {
	const byType: { [type: string]: string | undefined } = {};
	let subtable: ResolvedCodes["subtable"];
	let file: ResolvedCodes["file"];

	for (const [code, field] of Object.entries(rec)) {
		if (typeof field?.type !== "string") continue;
		// 最初に見つかったものを代表にする。フィールドコードは我々が決めたものなので
		// 特定のコードを当てにしない（DECISIONS「ガードのテストをフィールドコードで書かない」）
		byType[field.type] ??= code;

		if (field.type === "SUBTABLE" && subtable === undefined) {
			const rows = Array.isArray(field.value) ? field.value : [];
			subtable = {
				code,
				rowIds: rows.map((row) => {
					const id = (row as { id?: unknown }).id;
					return typeof id === "string" ? id : null;
				}),
			};
		}

		if (field.type === "FILE" && file === undefined) {
			// **get() は編集画面で FILE を空で返す**（実測 2026-09-08）。
			// event.record で見えたものに落とす。無ければ諦める
			const values =
				Array.isArray(field.value) && field.value.length > 0
					? field.value
					: (fileValuesFromEvent[code] ?? []);
			const first = values[0];
			// 中身のある FILE でないと 4 キーを渡すケースが作れない
			if (typeof first === "object" && first !== null) {
				file = {
					code,
					first: first as Record<string, unknown>,
					fromEvent: !(Array.isArray(field.value) && field.value.length > 0),
				};
			}
		}
	}
	// 飛ばしたときに理由を辿れるようにする。
	// FILE と SUBTABLE は「あるが空」で飛ぶことがあるので要素数まで残す
	const shapes = Object.entries(rec)
		.filter(([, field]) => typeof field?.type === "string")
		.filter(([, field]) => field.type === "FILE" || field.type === "SUBTABLE")
		.map(([code, field]) => {
			const n = Array.isArray(field.value) ? field.value.length : "配列でない";
			return `${code}(${String(field.type)})=${n}`;
		});
	const found = [`種別 ${Object.keys(byType).length} 個`, ...shapes].join(
		" / ",
	);

	return { byType, subtable, file, found };
};

/**
 * ケース定義の目印を、いまのレコードの値に差し替える。
 *
 * `CURRENT_VALUE` は「get() で読んだ値をそのまま」、
 * `STRIP_ROW_IDS` は「サブテーブルの行から id を外す」。
 * ケース定義を純粋に保つため、差し込みはここで行う。
 */
const materialize = (
	patch: Record<string, unknown>,
	rec: Record<string, { type?: unknown; value?: unknown }>,
): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	for (const [code, field] of Object.entries(patch)) {
		if (typeof field !== "object" || field === null) {
			out[code] = field;
			continue;
		}
		const copy: Record<string, unknown> = { ...field };
		const current = rec[code]?.value;

		if (copy.value === CURRENT_VALUE) copy.value = current;

		// サブテーブルの行を組み立て直す。**セルを 1 つ書き換える。**
		// そのまま渡すと前後が一致して、「id が保たれた」のか
		// 「まるごと無視された」のかが区別できない
		if (copy.value === ROWS_KEEP_ID || copy.value === ROWS_DROP_ID) {
			const keepId = copy.value === ROWS_KEEP_ID;
			const rows = Array.isArray(current) ? current : [];
			copy.value = rows.map((row) => {
				const { id, value } = row as { id?: unknown; value?: unknown };
				const cells =
					typeof value === "object" && value !== null
						? { ...(value as Record<string, { type?: unknown }>) }
						: {};
				// 書き換える対象は type で探す。フィールドコードは当てにしない
				const target = Object.keys(cells).find(
					(code) => cells[code]?.type === "SINGLE_LINE_TEXT",
				);
				if (target !== undefined) {
					cells[target] = {
						type: "SINGLE_LINE_TEXT",
						value: EDITED_CELL,
					} as { type: string };
				}
				return keepId ? { id, value: cells } : { value: cells };
			});
		}
		out[code] = copy;
	}
	return out;
};

/**
 * 1 ケースだけ `set()` へ渡して、渡したものと前後の値を記録する。
 *
 * ## なぜ 1 ケースずつなのか
 *
 * **一度 kintone のエラー表示が出ると、後続の `set()` も失敗する。**
 * 21 ケースをまとめて回すと最初の失敗が残り全部を汚染し、
 * 「どのケースが原因か」が分からなくなる（2026-09-08 に実際そうなった）。
 *
 * e2e が 1 ケースごとに編集画面を読み直してから呼ぶ。
 *
 * ## 成否を返さない
 *
 * `set()` に不正な値を渡しても**例外は飛ばない**。
 * kintone が画面にエラーを出すだけで、呼び出し元には何も返らない
 * （`e2e/panel.ts` に既に記録がある）。
 *
 * だから判定は e2e 側が行う。ここは材料を残すだけ。
 * try/catch は置かない。**置くと「捕まえられる」という誤解が残る。**
 *
 * @returns 走らせたら true、対象が無くて飛ばしたら false
 */
export const runSetCase = (id: string, screen: string): boolean => {
	const setCase = SET_CASES.find((candidate) => candidate.id === id);
	if (setCase === undefined) throw new Error(`ケース ${id} がありません`);

	const base = {
		id: setCase.id,
		question: setCase.question,
		at: new Date().toISOString(),
		isMobile: isMobile(),
		screen,
	};

	const before = getRecordViaJsApi() as
		| Record<string, { type?: unknown; value?: unknown }>
		| undefined;
	if (before === undefined) {
		store.addSetCase({ ...base, skipped: "レコードを取得できません" });
		return false;
	}

	const codes = resolveCodes(before);
	const patch = setCase.build(codes);
	if (patch === undefined) {
		store.addSetCase({
			...base,
			skipped: `対象のフィールドが無い（${codes.found}）`,
		});
		return false;
	}

	const sent = materialize(patch, before);
	const watched = setCase.watch?.(codes) ?? Object.keys(sent);
	const pick = (
		rec: Record<string, { type?: unknown; value?: unknown }> | undefined,
	): unknown => Object.fromEntries(watched.map((code) => [code, rec?.[code]]));

	const beforeWatched = pick(before);

	// **先に記録してから set() を呼ぶ。**
	// set() がページを壊してもここまでは残る。あとで書くと、
	// 落ちたケースの「渡したもの」が失われて原因が追えない
	store.addSetCase({
		...base,
		sent: probe(sent),
		before: probe(beforeWatched),
	});

	setRecordViaJsApi(sent);

	// set() が失敗していても読み直せる。値が変わったかを見るため
	const after = getRecordViaJsApi() as
		| Record<string, { type?: unknown; value?: unknown }>
		| undefined;

	// **行 id は正規化で伏せられるので、ここで比べて真偽値を残す。**
	// before / after を並べても `<row-id>` 同士になって比較できない
	const rowIds = (
		rec: Record<string, { type?: unknown; value?: unknown }> | undefined,
	): string | undefined => {
		const codes = watched.filter((code) => rec?.[code]?.type === "SUBTABLE");
		if (codes.length === 0) return undefined;
		return codes
			.map((code) => {
				const rows = rec?.[code]?.value;
				const ids = Array.isArray(rows)
					? rows.map((row) => String((row as { id?: unknown }).id))
					: [];
				return `${code}:${ids.join(",")}`;
			})
			.join(" ");
	};
	const idsBefore = rowIds(before);
	const idsAfter = rowIds(after);

	store.addSetCase({
		...base,
		sent: probe(sent),
		before: probe(beforeWatched),
		after: probe(pick(after)),
		...(idsBefore === undefined
			? {}
			: { rowIdsPreserved: idsBefore === idsAfter }),
		...(setCase.unobservable === true ? { observable: false } : {}),
	});
	return true;
};
