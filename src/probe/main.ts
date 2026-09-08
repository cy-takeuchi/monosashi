/**
 * kintone 実測採取カスタマイズ（エントリ）。
 *
 * 目的:
 *   作成 / 詳細 / 編集 / 一覧 の各画面で、
 *   event.record / kintone.app.record.get() / REST getRecord
 *   の3経路が実際に何を返すのかを、キーの有無まで壊さずに採取する。
 *
 * 制約:
 *   kintone.app.record.get() / set() は kintone.events.on のハンドラ内では動作しない。
 *   そのためヘッダにボタンを出し、クリック起動で採る。
 *   event.record 側はハンドラ内でしか採れないので、そちらは登録時に採る。
 */

import {
	buildChangeEvents,
	EVENTS_AFTER_SUBMIT,
	EVENTS_DELETE_SUBMIT,
	EVENTS_WITH_RECORD,
	EVENTS_WITH_RECORDS,
} from "./events.js";
import {
	getAppId,
	getFieldCodes,
	getQueryCondition,
	getRecordId,
	getRecordsViaRest,
	getRecordViaJsApi,
	getRecordViaRest,
	getRequiredFields,
	isMobile,
	on,
	setRecordViaJsApi,
} from "./kintoneApi.js";
import { inspectStructure, probe } from "./serialize.js";
import {
	CURRENT_VALUE,
	type ResolvedCodes,
	SET_CASES,
	STRIP_ROW_IDS,
} from "./setCases.js";
import * as store from "./store.js";
import { ACTION } from "./testIds.js";
import {
	currentLabel,
	getLastError,
	renderCoverage,
	renderPanel,
} from "./ui.js";

const record = (
	event: string,
	source: store.Source,
	data: unknown,
	extra: Partial<store.Sample> = {},
): void => {
	store.add({
		event,
		source,
		label: currentLabel(),
		appId: getAppId(),
		recordId: getRecordId(),
		isMobile: isMobile(),
		at: new Date().toISOString(),
		data: probe(data),
		...extra,
	});
};

// ---------------------------------------------------------------------------
// event.record 側。ハンドラ内でしか採れない
// ---------------------------------------------------------------------------

/**
 * 次の submit で `error` を返して保存を止める。null なら止めない。
 *
 * `CreateSubmitEvent` / `EditSubmitEvent` の `error?: string` は
 * 「ハンドラの戻り値に設定すると保存を中断できる」という契約のために
 * optional で持たせているが、**採取時は常に event をそのまま返しており
 * 一度も確かめていなかった**。
 *
 * 保存前の検証は kintone カスタマイズの最頻用途の一つなので、
 * 型に書いてあるのに未実測という状態を残さない。
 */
let blockSubmitWith: string | null = null;

on(EVENTS_WITH_RECORD, (event) => {
	record(event.type, "event.record", event.record, {
		envelope: probe(event),
		structure: inspectStructure(event.record),
	});

	// submit 系は既定では event をそのまま返す。返さないと保存が止まる
	if (blockSubmitWith === null || !event.type.endsWith(".submit")) {
		return event;
	}

	const message = blockSubmitWith;
	blockSubmitWith = null;
	// 中断したこと自体を 1 件残す。あとから「本当に error を返したのか」を辿れるように
	record(`${event.type}.blocked`, "event.record", event.record, {
		envelope: probe({ ...event, error: message }),
	});
	return { ...event, error: message };
});

on(EVENTS_WITH_RECORDS, (event) => {
	record(event.type, "event.records", event.records, {
		envelope: probe(event),
	});
	return event;
});

on(EVENTS_AFTER_SUBMIT, (event) => {
	record(event.type, "event.record", event.record, {
		envelope: probe(event),
		structure: inspectStructure(event.record),
	});
	return event;
});

on(EVENTS_DELETE_SUBMIT, (event) => {
	// **record を持たないという想定が外れた。**
	// 実測では完全な Saved レコードを持っていたので、中身まで採る
	record(event.type, "event.record", event.record, {
		envelope: probe(event),
		structure: inspectStructure(event.record),
	});
	return event;
});

// ---------------------------------------------------------------------------
// ボタン起動側。kintone.app.record.get() と REST はここでしか採れない
// ---------------------------------------------------------------------------

type Screen =
	| "screen.create"
	| "screen.edit"
	| "screen.detail"
	| "screen.index";

/**
 * URL からの画面判定。イベント名が取れないときのフォールバック。
 *
 * kintone の編集画面は URL が /k/{app}/show#record=N&mode=edit で、
 * 詳細画面とパスが同じ。編集モードはハッシュにしか現れないため、
 * パスだけを見ると編集画面を詳細画面と誤判定する。
 */
const screenFromUrl = (): Screen => {
	const path = location.pathname;
	if (path.endsWith("/edit")) {
		return getRecordId() === null ? "screen.create" : "screen.edit";
	}
	if (path.includes("/show")) {
		return location.hash.includes("mode=edit")
			? "screen.edit"
			: "screen.detail";
	}
	return "screen.index";
};

/**
 * イベント名からの画面判定。URL より確実。
 *
 * ハッシュがいつ更新されるかは kintone の実装依存で、
 * app.record.edit.show の発火時点で mode=edit が入っている保証がない。
 */
const screenFromEvent = (type: string): Screen | undefined => {
	if (type.includes(".create.show")) return "screen.create";
	if (type.includes(".edit.show")) return "screen.edit";
	if (type.includes(".detail.show") || type.includes(".print.show")) {
		return "screen.detail";
	}
	if (type.includes(".index.show")) return "screen.index";
	return undefined;
};

/** boot 時に確定させる。ボタン起動の採取はこれを使う */
let currentScreen: Screen = screenFromUrl();

const screenName = (): Screen => currentScreen;

/**
 * サンプルのキーに使う画面名。
 *
 * **モバイルでは `mobile.` を付ける。** 付けないと PC と同じキーになり、
 * どちらの経路で採ったサンプルなのか区別できない。
 * モバイルの編集画面は record の形が PC と違う（2026-09-05 実測）ので、
 * 混ざったものは根拠にならない。
 *
 * 画面の判定そのもの（`screenName()`）は変えない。
 * ボタンの出し分けとパネルの `data-screen` がそれに依存している。
 */
const sampleScreen = (): string =>
	isMobile() ? `mobile.${screenName()}` : screenName();

const isIndex = (): boolean => currentScreen === "screen.index";

const captureJsApi = (): void => {
	// 一覧画面では kintone.app.record.get() が null を返す。
	// そのまま記録すると中身が undefined のサンプルが混ざって分析を汚すので採らない。
	if (isIndex()) {
		throw new Error(
			"一覧画面では kintone.app.record.get() は使えません（レコード画面で採取してください）",
		);
	}
	const value = getRecordViaJsApi();
	record(sampleScreen(), "kintone.app.record.get", value, {
		structure: inspectStructure(value),
	});
};

const captureRest = async (): Promise<void> => {
	const app = getAppId();
	if (app === null) throw new Error("アプリ ID を取得できません");

	// 一覧画面には「開いているレコード」が無いので getRecord は使えない。
	// 代わりに画面と同じ絞り込み条件で getRecords し、event.records と突き合わせる。
	if (isIndex()) {
		const value = await getRecordsViaRest(app, getQueryCondition());
		record(sampleScreen(), "rest.getRecords", value);
		return;
	}

	const id = getRecordId();
	if (id === null) {
		throw new Error(
			"REST 採取には保存済みレコードが必要です（作成画面では採れません）",
		);
	}
	const value = await getRecordViaRest(app, id);
	record(sampleScreen(), "rest.getRecord", value);
};

/**
 * set() で disabled / error を設定してから読み直す。
 *
 * 実測 (17 サンプル) では disabled / error が一度も現れなかったが、
 * 「そもそも存在しない」のか「設定すれば現れる」のかは読み取りだけでは分からない。
 * kintone-typeguard の Event 型は全フィールドにこの 2 つを optional で持たせているので、
 * その根拠の有無をここで確定させる。
 */
const captureAfterSet = (): void => {
	const before = getRecordViaJsApi() as
		| Record<
				string,
				{ type?: string; disabled?: boolean; error?: string | null }
		  >
		| undefined;
	if (before === undefined) {
		throw new Error("レコードを取得できません");
	}

	const target = Object.keys(before).find(
		(code) => before[code]?.type === "SINGLE_LINE_TEXT",
	);
	if (target === undefined) {
		throw new Error("対象にできる SINGLE_LINE_TEXT が見つかりません");
	}

	const field = before[target];
	if (field === undefined) throw new Error("フィールドを取得できません");
	field.disabled = true;
	field.error = "実測用のエラーメッセージ";
	setRecordViaJsApi(before);

	const after = getRecordViaJsApi();
	record(`${sampleScreen()}.afterSet`, "kintone.app.record.get", after, {
		structure: inspectStructure(after),
	});
};

// ---------------------------------------------------------------------------
// set() の受け入れ挙動（#14）
// ---------------------------------------------------------------------------

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
			const first = Array.isArray(field.value) ? field.value[0] : undefined;
			// 中身のある FILE でないと 4 キーを渡すケースが作れない
			if (typeof first === "object" && first !== null) {
				file = { code, first: first as Record<string, unknown> };
			}
		}
	}
	return { byType, subtable, file };
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

		if (copy.value === STRIP_ROW_IDS) {
			const rows = Array.isArray(current) ? current : [];
			copy.value = rows.map((row) => {
				const { id: _dropped, ...rest } = row as { id?: unknown };
				return rest;
			});
		}
		out[code] = copy;
	}
	return out;
};

/**
 * `SET_CASES` を順に `set()` へ渡して、結果を記録する。
 *
 * ## 1 ケースずつ前を読み直す
 *
 * 前のケースの `set()` が画面を書き換えているので、
 * `before` はケースごとに `get()` し直す。
 * 最初に 1 回だけ読むと、2 件目以降の `before` が実態とずれる。
 *
 * ## 例外で止めない
 *
 * 途中のケースで落ちても残りを続ける。
 * 「どのケースで落ちたか」を知るために測っているので、
 * 1 件目で止まると何も分からない。
 */
const captureSetBehavior = (): void => {
	for (const setCase of SET_CASES) {
		const screen = sampleScreen();
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
			store.addSetCase({
				...base,
				threw: false,
				skipped: "レコードを取得できません",
			});
			continue;
		}

		const codes = resolveCodes(before);
		const patch = setCase.build(codes);
		if (patch === undefined) {
			store.addSetCase({
				...base,
				threw: false,
				skipped: "この画面に対象のフィールドが無い",
			});
			continue;
		}

		const sent = materialize(patch, before);
		const watched = setCase.watch?.(codes) ?? Object.keys(sent);
		const pick = (
			rec: Record<string, { type?: unknown; value?: unknown }> | undefined,
		): unknown =>
			Object.fromEntries(watched.map((code) => [code, rec?.[code]]));

		const beforeWatched = pick(before);
		let threw = false;
		let message: string | undefined;
		try {
			setRecordViaJsApi(sent);
		} catch (error) {
			threw = true;
			message = error instanceof Error ? error.message : String(error);
		}

		// 例外が出ても読み直す。「投げたが値は変わっていた」を見逃さないため
		const after = getRecordViaJsApi() as
			| Record<string, { type?: unknown; value?: unknown }>
			| undefined;

		store.addSetCase({
			...base,
			sent: probe(sent),
			threw,
			...(message === undefined ? {} : { message }),
			before: probe(beforeWatched),
			after: probe(pick(after)),
		});
	}
};

/**
 * これまでに観測した change イベントの数。
 *
 * set() が change を発火するかを測るために、呼び出し前後で比較する。
 * サンプル件数ではなく専用のカウンタにするのは、
 * 採取の失敗（record() の例外）とイベントの発火を混同しないため。
 */
let changeEventCount = 0;

/**
 * change ハンドラの登録が済んだか。
 *
 * registerChangeEvents は getFieldCodes を待つので非同期。
 * 登録前に captureSetValue を押すと、発火していても件数が 0 のままになり
 * 「set() は change を発火しない」という**誤った結論**が出る。
 * 測定の前提が整っていないことを、静かに通さず明示的に止める。
 */
let changeEventsRegistered = false;

/**
 * 実際に登録した change イベント名。
 *
 * 「飛ばなかった」と結論する前に「聞いていた」ことを示せる必要がある。
 * 登録漏れを発火しなかったことと取り違えると、実測が嘘になる。
 * 実際、行の削除で change が飛ばないという観測をしたとき、
 * テーブルのコードのハンドラを登録していたかを確認できていなかった。
 */
let registeredChangeEvents: string[] = [];

/**
 * 測定中に発火したイベント名。
 *
 * 件数だけでは何が飛んだか分からず、前後のサンプルの時系列から
 * 推測することになる。推測を実測として扱わないために名前を控える。
 */
let firedDuringMeasure: string[] | undefined;

/**
 * set() で「値」を変えたとき change イベントが発火するかを測る。
 *
 * captureAfterSet は disabled / error しか設定していないため、
 * この問いには答えられていなかった（値を変えていないので change が飛ぶ道理がない）。
 *
 * 一般には「set() は change を発火しない」と言われるが、このプロジェクトは
 * 推測で決めない。結果は e2e の設計を左右する:
 *   発火する → probe にボタンを1つ足すだけで済み、kintone の DOM 依存がゼロになる
 *   発火しない → Playwright がフィールドへ実際に入力するしかない
 */
const captureSetValue = async (): Promise<void> => {
	if (!changeEventsRegistered) {
		throw new Error(
			"change ハンドラの登録がまだ終わっていません。数秒待ってから押してください",
		);
	}

	const before = getRecordViaJsApi() as
		| Record<string, { type?: string; value?: unknown }>
		| undefined;
	if (before === undefined) throw new Error("レコードを取得できません");

	// ルックアップのキーフィールドも type は SINGLE_LINE_TEXT なので除く。
	// ルックアップは値の設定に固有の振る舞いがあり、通常のフィールドの
	// 測定結果として扱えない。confirmed / recordId の有無で判別する（実測）
	const target = Object.keys(before).find((code) => {
		const field = before[code];
		if (field === undefined || field.type !== "SINGLE_LINE_TEXT") return false;
		return !("confirmed" in field) && !("recordId" in field);
	});
	if (target === undefined) {
		throw new Error(
			"対象にできる SINGLE_LINE_TEXT（ルックアップ以外）が見つかりません",
		);
	}

	const targetField = before[target];
	if (targetField === undefined) throw new Error("フィールドを取得できません");

	// 時刻を混ぜない。定期ライブ検証は前回の採取結果との diff で
	// 「kintone が変わったか」を見るので、こちらが毎回違う値を書き込むと
	// 本物の変化が埋もれる。画面名を混ぜるのは、編集画面で作成画面と
	// 同じ値を再設定してしまい change が飛ばなくなるのを避けるため
	if (targetField.type === undefined) {
		// set() は type を省略できない（実測）。ここで止めないと
		// 「type が不正です」という原因の分かりにくい失敗になる
		throw new Error(`${target} に type がありません`);
	}

	const newValue = `${sampleScreen()}-setValue`;
	if (targetField.value === newValue) {
		throw new Error(
			`${target} は既に ${newValue} です。値が変わらないと change は発火せず、測定になりません`,
		);
	}

	// 部分更新。変えたいフィールドだけ渡す。
	// type は省略できない。省くと「type が不正です」で実行時に落ちる（実測）
	await measureSet(
		"setValue",
		target,
		{ [target]: { type: targetField.type, value: newValue } },
		newValue,
	);
};

/**
 * 多重登録を防ぐための進行中プロミス。
 *
 * boot は detail.show / edit.show など画面イベントごとに走る。
 * kintone は詳細→編集をページ再読み込みなしで遷移するため、
 * 素朴に呼ぶと**遷移のたびにハンドラが増える**。
 * 実測では編集画面で完全に同一の change サンプルが 2 件記録され、
 * 凍結フィクスチャでも同じ重複が起きていた（edit.change が全て偶数件）。
 *
 * 真偽値のフラグでは足りない。getFieldCodes を待つ間に 2 回目の boot が
 * 走ると、どちらもフラグを見る前に通過してしまう。
 * 呼び出しそのものを 1 つのプロミスに畳む。
 */
let changeRegistration: Promise<void> | undefined;

const doRegisterChangeEvents = async (): Promise<void> => {
	const app = getAppId();
	if (app === null) return;
	const codes = await getFieldCodes(app);
	const events = buildChangeEvents(codes);
	registeredChangeEvents = events;
	on(events, (event) => {
		changeEventCount += 1;
		firedDuringMeasure?.push(event.type);
		// changes.field は record 内のフィールドと同一オブジェクトへの参照なので、
		// event 全体を 1 回で辿ると循環参照として畳まれて形が見えない。
		// changes だけを別に辿ることで、field と row の実際の形を採る。
		record(event.type, "event.record", event.record, {
			envelope: probe(event),
			changes: probe(event.changes),
		});
		return event;
	});
	changeEventsRegistered = true;
};

/**
 * set() でサブテーブル内のセルを変更する。
 *
 * change イベントのうち `changes.row` が null にならない唯一のケースが
 * サブテーブル内の変更で、`ChangeEvent` 型の row を支える唯一の根拠になる。
 *
 * 行を追加するのではなく既存の行を書き換えるのは、
 * 新規行に渡すべき id の形（null か省略か）が未測定だから。
 * kintone は作成画面のサブテーブルに空行を 1 つ用意するので、それを使う。
 */
type LooseRow = {
	id?: string | null;
	value: Record<string, { type?: string; value?: unknown }>;
};

/**
 * 画面のレコードからサブテーブルを取り出す。
 *
 * 行操作の測定は「セルを変える」「行を足す」「行を消す」の 3 つあり、
 * 入口の処理が同じ。3 回書くとどれかだけ直してずれる。
 */
const takeSubtable = (): { tableCode: string; rows: LooseRow[] } => {
	if (!changeEventsRegistered) {
		throw new Error(
			"change ハンドラの登録がまだ終わっていません。数秒待ってから押してください",
		);
	}
	const record = getRecordViaJsApi() as
		| Record<string, { type?: string; value?: unknown }>
		| undefined;
	if (record === undefined) throw new Error("レコードを取得できません");

	const tableCode = Object.keys(record).find(
		(code) => record[code]?.type === "SUBTABLE",
	);
	if (tableCode === undefined) throw new Error("SUBTABLE が見つかりません");

	const table = record[tableCode];
	if (table === undefined || !Array.isArray(table.value)) {
		throw new Error("SUBTABLE の値が配列ではありません");
	}
	return { tableCode, rows: table.value as LooseRow[] };
};

/** 画面のレコードから表の行数を数える。set() の効果の確認に使う */
const countRows = (record: unknown, tableCode: string): number => {
	const table = (record as Record<string, { value?: unknown }> | undefined)?.[
		tableCode
	];
	return Array.isArray(table?.value) ? table.value.length : -1;
};

/**
 * set() の前後で change イベントを測り、結果を 1 件記録する。
 *
 * 「値を変える」「行を足す」「行を消す」で測る内容が同じなので 1 箇所にまとめる。
 * 別々に書くとどれかだけ直してずれ、比較できない結果が並ぶ。
 */
const measureSet = async (
	label: string,
	targetCode: string,
	patch: Record<string, { type: string; value: unknown }>,
	note: string,
	/**
	 * set() が意図した効果を持ったかの検証。
	 *
	 * **set() は不正な入力でも例外を投げない。** kintone がエラーを表示するだけで、
	 * 呼び出し側からは成功に見える（実測: セルの `value` キーを省いたとき）。
	 * 効果を確かめずに記録すると、空振りが実測として残る。
	 */
	verify?: (after: unknown) => string | undefined,
): Promise<void> => {
	const countBefore = changeEventCount;
	firedDuringMeasure = [];
	setRecordViaJsApi(patch);
	const countAfterSync = changeEventCount;

	// 同期で飛ばない場合に備えてタスクキューを 1 周させる
	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
	const countAfterTick = changeEventCount;
	const firedEvents = firedDuringMeasure ?? [];
	firedDuringMeasure = undefined;

	const after = getRecordViaJsApi();
	const problem = verify?.(after);
	if (problem !== undefined) {
		throw new Error(`set() が期待した効果を持ちませんでした: ${problem}`);
	}

	record(`${sampleScreen()}.${label}`, "kintone.app.record.get", after, {
		structure: inspectStructure(after),
		setValueProbe: {
			targetCode,
			newValue: note,
			countBefore,
			countAfterSync,
			countAfterTick,
			firedEvents,
			watchedCount: registeredChangeEvents.length,
		},
	});
};

/**
 * サブテーブルに行を追加する。**雛形の行を全セルそのまま複製する。**
 *
 * ## 全セルを渡す理由
 *
 * 行の一部のセルだけを渡すと kintone が拒否する（実測 2026-08-31）。
 *
 * ```
 * event.record['subtable'].value[1]['t_multiLineText'] is invalid.
 * ```
 *
 * セルそのものが不正と言われる（`value` を省いたときは `.value` が不正と言われる）。
 * 行を渡すなら、その表の全セルを揃えなければならない。
 *
 * ## 値を変えない理由
 *
 * 値を入れた行を足すと、飛んだ change が「行が増えたから」なのか
 * 「セルに値が入ったから」なのか区別できない。
 * 実際それで「`set()` の行追加は表内フィールドの change を発火する」という
 * 誤った結論を出した。飛んでいたのは値のせいだった。
 *
 * **作成画面では初期の行が空**なので、その複製は値の変化を伴わない純粋な行追加になる。
 * 編集画面では雛形に値が入っているため、結果に値の影響が混ざる。
 * 経路の比較は作成画面の結果で行う。
 */
const captureAddRow = async (): Promise<void> => {
	const { tableCode, rows } = takeSubtable();
	const template = rows[0];
	if (template === undefined) throw new Error("雛形にする行がありません");

	// 全セルを渡す。value キーは undefined でも必ず付ける（省くと拒否される）
	const value: LooseRow["value"] = {};
	for (const [code, cell] of Object.entries(template.value)) {
		if (cell.type === undefined) {
			throw new Error(`表内の ${code} に type がありません`);
		}
		value[code] = { type: cell.type, value: cell.value };
	}

	const before = rows.length;
	// id は渡さない。渡さなくてよいことは実測済み
	await measureSet(
		"addRow",
		tableCode,
		{ [tableCode]: { type: "SUBTABLE", value: [...rows, { value }] } },
		"雛形の行を値ごと複製（id なし）",
		(after) => {
			const now = countRows(after, tableCode);
			return now === before + 1
				? undefined
				: `行が ${before} → ${now} 件（${before + 1} 件を期待）`;
		},
	);
};

/**
 * サブテーブルの末尾の行を削除する。
 *
 * 追加と同じく、どのイベント名の change が飛ぶかを見る。
 * 追加では飛ぶが削除では飛ばない、ということもありうるので別に測る。
 */
const captureRemoveRow = async (): Promise<void> => {
	const { tableCode, rows } = takeSubtable();
	if (rows.length < 2) {
		throw new Error(
			`行が ${rows.length} 件しかありません。先に「行を追加」を押してください`,
		);
	}
	const before = rows.length;
	await measureSet(
		"removeRow",
		tableCode,
		{ [tableCode]: { type: "SUBTABLE", value: rows.slice(0, -1) } },
		"末尾の行を削除",
		(after) => {
			const now = countRows(after, tableCode);
			return now === before - 1
				? undefined
				: `行が ${before} → ${now} 件（${before - 1} 件を期待）`;
		},
	);
};

const captureSetRow = async (): Promise<void> => {
	const { tableCode, rows } = takeSubtable();
	const row = rows[0];
	if (row === undefined) {
		throw new Error(
			"サブテーブルに行がありません（作成画面なら空行が 1 つあるはず）",
		);
	}

	const cellCode = Object.keys(row.value).find(
		(code) => row.value[code]?.type === "SINGLE_LINE_TEXT",
	);
	if (cellCode === undefined) {
		throw new Error("表内に SINGLE_LINE_TEXT が見つかりません");
	}
	const cell = row.value[cellCode];
	if (cell === undefined) throw new Error("セルを取得できません");

	const newValue = `${sampleScreen()}-setRow`;
	if (cell.value === newValue) {
		throw new Error(
			`${cellCode} は既に ${newValue} です。値が変わらないと change は発火しません`,
		);
	}

	cell.value = newValue;
	// 表そのものを丸ごと渡す。セルだけを渡す形は未測定
	await measureSet(
		"setRow",
		`${tableCode}.${cellCode}`,
		{ [tableCode]: { type: "SUBTABLE", value: rows } },
		newValue,
	);
};

/**
 * 保存できる状態にするため、未入力の必須フィールドを埋める。
 *
 * kintone のフィールド入力欄には accessible name が無いので、
 * Playwright から `getByRole` で入力できない（実測）。
 * `.gaia-*` などの内部セレクタは使用禁止なので、DOM 経由の入力を諦めて
 * set() で埋める。set() が値の変更を反映することは実測済み。
 *
 * 型ごとに入れる値を決め打ちにするのは、必須の種別が増えたときに
 * 静かに埋め損なうより、埋められないと分かるほうが良いため。
 */
const fillRequired = async (): Promise<void> => {
	const app = getAppId();
	if (app === null) throw new Error("アプリ ID を取得できません");

	const record = getRecordViaJsApi() as
		| Record<string, { type?: string; value?: unknown }>
		| undefined;
	if (record === undefined) throw new Error("レコードを取得できません");

	const required = await getRequiredFields(app);
	const patch: Record<string, { type: string; value: unknown }> = {};
	const skipped: string[] = [];

	for (const { code, type } of required) {
		const field = record[code];
		// 画面に無い必須フィールド（作成画面のシステムフィールド等）は触らない
		if (field === undefined) continue;
		// ルックアップのキーは値を入れても解決されないので触らない
		if ("confirmed" in field || "recordId" in field) continue;

		const current = field.value;
		const isEmpty =
			current === undefined ||
			current === null ||
			current === "" ||
			(Array.isArray(current) && current.length === 0);
		if (!isEmpty) continue;

		const value = ((): unknown => {
			switch (type) {
				case "SINGLE_LINE_TEXT":
				case "MULTI_LINE_TEXT":
				case "RICH_TEXT":
					return `e2e-required-${code}`;
				case "NUMBER":
					return "1";
				case "LINK":
					return "https://example.com";
				case "DATE":
					return "2026-01-01";
				case "TIME":
					return "12:00";
				case "DATETIME":
					return "2026-01-01T03:00:00Z";
				default:
					return undefined;
			}
		})();

		if (value === undefined) {
			skipped.push(`${code}(${type})`);
			continue;
		}
		patch[code] = { type, value };
	}

	if (skipped.length > 0) {
		throw new Error(
			`埋め方の分からない必須フィールドがあります: ${skipped.join(", ")}`,
		);
	}

	if (Object.keys(patch).length > 0) setRecordViaJsApi(patch);
};

const registerChangeEvents = (): Promise<void> => {
	changeRegistration ??= doRegisterChangeEvents();
	return changeRegistration;
};

const boot = (event: { type?: string }): unknown => {
	currentScreen =
		(event.type === undefined ? undefined : screenFromEvent(event.type)) ??
		screenFromUrl();

	// 画面によって採れる経路が違うので、押せるボタンを画面ごとに変える。
	// 押しても失敗するボタンを出すと、採取漏れなのか仕様なのか分からなくなる。
	const captureActions = (() => {
		switch (screenName()) {
			// 一覧には「開いているレコード」が無い。getRecord の代わりに
			// 画面と同じ絞り込みで getRecords し、event.records と突き合わせる
			case "screen.index":
				return [{ id: ACTION.rest, text: "REST 一覧で採取", run: captureRest }];
			// 作成画面のレコードはまだ保存されていないので REST からは取れない
			case "screen.create":
				return [
					{ id: ACTION.jsApi, text: "JS API で採取", run: captureJsApi },
					{
						id: ACTION.setFlags,
						text: "set() して再取得",
						run: captureAfterSet,
					},
					{
						id: ACTION.setValue,
						text: "set() で値を変更",
						run: captureSetValue,
					},
					{
						id: ACTION.setRow,
						text: "set() で表を変更",
						run: captureSetRow,
					},
					{
						id: ACTION.addRow,
						text: "set() で行を追加",
						run: captureAddRow,
					},
					{
						id: ACTION.removeRow,
						text: "set() で行を削除",
						run: captureRemoveRow,
					},
					{
						id: ACTION.fillRequired,
						text: "必須を埋める",
						run: fillRequired,
					},
					{
						// **最後に置く。** 読み取り専用フィールドや不正な値を渡すので、
						// 画面が汚れる。ほかの採取を先に済ませてから押す
						id: ACTION.setBehavior,
						text: "set() の受け入れを測る",
						run: captureSetBehavior,
					},
				];
			// set() は作成 / 編集画面でしか動かない
			case "screen.edit":
				return [
					{ id: ACTION.jsApi, text: "JS API で採取", run: captureJsApi },
					{ id: ACTION.rest, text: "REST で採取", run: captureRest },
					{
						id: ACTION.both,
						text: "両方採取",
						run: async () => {
							captureJsApi();
							await captureRest();
						},
					},
					{
						id: ACTION.setFlags,
						text: "set() して再取得",
						run: captureAfterSet,
					},
					{
						id: ACTION.setValue,
						text: "set() で値を変更",
						run: captureSetValue,
					},
					{
						id: ACTION.setRow,
						text: "set() で表を変更",
						run: captureSetRow,
					},
					{
						id: ACTION.addRow,
						text: "set() で行を追加",
						run: captureAddRow,
					},
					{
						id: ACTION.removeRow,
						text: "set() で行を削除",
						run: captureRemoveRow,
					},
					{
						id: ACTION.fillRequired,
						text: "必須を埋める",
						run: fillRequired,
					},
					{
						// **最後に置く。** 読み取り専用フィールドや不正な値を渡すので、
						// 画面が汚れる。ほかの採取を先に済ませてから押す
						id: ACTION.setBehavior,
						text: "set() の受け入れを測る",
						run: captureSetBehavior,
					},
				];
			default:
				return [
					{ id: ACTION.jsApi, text: "JS API で採取", run: captureJsApi },
					{ id: ACTION.rest, text: "REST で採取", run: captureRest },
					{
						id: ACTION.both,
						text: "両方採取",
						run: async () => {
							captureJsApi();
							await captureRest();
						},
					},
				];
		}
	})();

	renderPanel(
		[
			...captureActions,
			{ id: ACTION.coverage, text: "カバレッジ", run: renderCoverage },
			{ id: ACTION.export, text: "エクスポート", run: store.exportToFile },
			{
				// e2e は confirm を挟まない window API 側（__kintoneRecordProbe.clear）を使う。
				// このボタンは手作業のときだけのもの
				id: ACTION.clear,
				text: "クリア",
				run: () => {
					if (confirm("採取済みデータを全て削除します。よろしいですか?"))
						store.clear();
				},
			},
		],
		screenName(),
	);
	void registerChangeEvents();
	return event;
};

on(
	[
		"app.record.create.show",
		"app.record.edit.show",
		"app.record.detail.show",
		"app.record.print.show",
		"app.record.index.show",
		"mobile.app.record.create.show",
		"mobile.app.record.edit.show",
		"mobile.app.record.detail.show",
		"mobile.app.record.index.show",
	],
	boot,
);

/**
 * Playwright から使う口。
 *
 * ボタンのクリックは `data-testid` で行い、
 * 状態の確認とデータの取り出しはここから行う。
 *
 * ブラウザのダウンロードを介さないのは、
 * ファイルの落ちる先や名前が環境に依存するため。
 */
(window as unknown as Record<string, unknown>).__kintoneRecordProbe = {
	export: store.exportToString,
	clear: store.clear,
	count: store.count,
	coverage: store.coverage,
	/**
	 * change ハンドラの登録が済んだか。
	 *
	 * 登録は getFieldCodes を待つので非同期。
	 * これを待たずに set() 系を実行すると、発火していても件数が 0 になり
	 * 誤った測定結果が出る。固定時間の待機ではなくこれをポーリングする。
	 */
	ready: (): boolean => changeEventsRegistered,
	/** 直近の操作の失敗メッセージ。成功していれば null */
	lastError: getLastError,
	/**
	 * 実際に登録した change イベント名。
	 *
	 * 「このイベントは飛ばなかった」と言う前に、聞いていたことを確かめるため。
	 * 登録漏れと発火しなかったことを取り違えると実測が嘘になる。
	 */
	changeEvents: (): string[] => registeredChangeEvents,
	/** 判定された画面。ボタンの出し分けがこれに依存している */
	screen: (): string => screenName(),

	/**
	 * UI 操作の前後で発火した change イベントを拾うための口。
	 *
	 * `set()` と UI 操作では発火するイベントが違う。
	 * UI 側はパネルのボタンでは起こせないので、Playwright が kintone の
	 * ボタンを押す。その前後をこの 2 つで挟んで、飛んだイベント名を採る。
	 *
	 * 掴むのは役割と名前で特定できるボタンだけ（`Add row` / `Delete this row`）。
	 * 内部セレクタは使わない。
	 */
	beginWatch: (): void => {
		firedDuringMeasure = [];
	},
	/** 監視中に今までに飛んだイベント名。発火を待つためにポーリングする */
	watched: (): string[] => firedDuringMeasure ?? [],
	endWatch: (label: string): void => {
		const firedEvents = firedDuringMeasure ?? [];
		firedDuringMeasure = undefined;
		const after = getRecordViaJsApi();
		record(`${sampleScreen()}.${label}`, "kintone.app.record.get", after, {
			structure: inspectStructure(after),
			setValueProbe: {
				targetCode: "(UI 操作)",
				newValue: label,
				countBefore: changeEventCount - firedEvents.length,
				countAfterSync: changeEventCount,
				countAfterTick: changeEventCount,
				firedEvents,
				watchedCount: registeredChangeEvents.length,
			},
		});
	},

	/**
	 * 次の submit で error を返して保存を止める。
	 *
	 * 保存を止める挙動は e2e から起こす必要がある。
	 * パネルのボタンでは保存そのものを起こせないため。
	 */
	blockNextSubmit: (message: string): void => {
		blockSubmitWith = message;
	},

	/**
	 * 最初のサブテーブルの行数。
	 *
	 * UI 操作は非同期に反映されるので、固定時間で待たずにこれをポーリングする。
	 */
	rowCount: (): number => {
		const rec = getRecordViaJsApi() as
			| Record<string, { type?: string; value?: unknown }>
			| undefined;
		if (rec === undefined) return -1;
		const code = Object.keys(rec).find((k) => rec[k]?.type === "SUBTABLE");
		const table = code === undefined ? undefined : rec[code];
		return Array.isArray(table?.value) ? table.value.length : -1;
	},
};
