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
	EVENTS_WITH_RECORD,
	EVENTS_WITH_RECORDS,
	EVENTS_WITHOUT_RECORD,
} from "./events";
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
} from "./kintoneApi";
import { inspectStructure, probe } from "./serialize";
import * as store from "./store";
import { ACTION } from "./testIds";
import { currentLabel, getLastError, renderCoverage, renderPanel } from "./ui";

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

on(EVENTS_WITH_RECORD, (event) => {
	record(event.type, "event.record", event.record, {
		envelope: probe(event),
		structure: inspectStructure(event.record),
	});
	// submit 系は必ず event をそのまま返す。返さないと保存が止まる
	return event;
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

on(EVENTS_WITHOUT_RECORD, (event) => {
	// record を「持たない」ことの確認が目的なので envelope だけ採る
	record(event.type, "event.record", undefined, { envelope: probe(event) });
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
	record(screenName(), "kintone.app.record.get", value, {
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
		record(screenName(), "rest.getRecords", value);
		return;
	}

	const id = getRecordId();
	if (id === null) {
		throw new Error(
			"REST 採取には保存済みレコードが必要です（作成画面では採れません）",
		);
	}
	const value = await getRecordViaRest(app, id);
	record(screenName(), "rest.getRecord", value);
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
	record(`${screenName()}.afterSet`, "kintone.app.record.get", after, {
		structure: inspectStructure(after),
	});
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
	const newValue = `${screenName()}-setValue`;
	if (targetField.value === newValue) {
		throw new Error(
			`${target} は既に ${newValue} です。値が変わらないと change は発火せず、測定になりません`,
		);
	}

	const countBefore = changeEventCount;
	// 部分更新。変えたいフィールドだけ渡す。
	// type は省略できない。省くと「type が不正です」で実行時に落ちる（実測）
	setRecordViaJsApi({
		[target]: { type: targetField.type, value: newValue },
	});
	const countAfterSync = changeEventCount;

	// 同期で飛ばない場合に備えてタスクキューを1周させる。
	// 固定時間の待機ではなく、マクロタスクを1つ挟むだけ
	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
	const countAfterTick = changeEventCount;

	const after = getRecordViaJsApi();
	record(`${screenName()}.setValue`, "kintone.app.record.get", after, {
		structure: inspectStructure(after),
		setValueProbe: {
			targetCode: target,
			newValue,
			countBefore,
			countAfterSync,
			countAfterTick,
		},
	});
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
	on(buildChangeEvents(codes), (event) => {
		changeEventCount += 1;
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
const captureSetRow = async (): Promise<void> => {
	if (!changeEventsRegistered) {
		throw new Error(
			"change ハンドラの登録がまだ終わっていません。数秒待ってから押してください",
		);
	}

	const before = getRecordViaJsApi() as
		| Record<string, { type?: string; value?: unknown }>
		| undefined;
	if (before === undefined) throw new Error("レコードを取得できません");

	const tableCode = Object.keys(before).find(
		(code) => before[code]?.type === "SUBTABLE",
	);
	if (tableCode === undefined) {
		throw new Error("SUBTABLE が見つかりません");
	}
	const table = before[tableCode];
	if (table === undefined || !Array.isArray(table.value)) {
		throw new Error("SUBTABLE の値が配列ではありません");
	}
	const rows = table.value as {
		id?: string | null;
		value: Record<string, { type?: string; value?: unknown }>;
	}[];
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

	const newValue = `${screenName()}-setRow`;
	if (cell.value === newValue) {
		throw new Error(
			`${cellCode} は既に ${newValue} です。値が変わらないと change は発火しません`,
		);
	}

	const countBefore = changeEventCount;
	cell.value = newValue;
	// 表そのものを丸ごと渡す。セルだけを渡す形は未測定
	setRecordViaJsApi({ [tableCode]: { type: "SUBTABLE", value: rows } });
	const countAfterSync = changeEventCount;

	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
	const countAfterTick = changeEventCount;

	const after = getRecordViaJsApi();
	record(`${screenName()}.setRow`, "kintone.app.record.get", after, {
		structure: inspectStructure(after),
		setValueProbe: {
			targetCode: `${tableCode}.${cellCode}`,
			newValue,
			countBefore,
			countAfterSync,
			countAfterTick,
		},
	});
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
						id: ACTION.fillRequired,
						text: "必須を埋める",
						run: fillRequired,
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
						id: ACTION.fillRequired,
						text: "必須を埋める",
						run: fillRequired,
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
	/** 判定された画面。ボタンの出し分けがこれに依存している */
	screen: (): string => screenName(),
};
