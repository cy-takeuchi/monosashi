import { expect, type Locator, type Page } from "@playwright/test";
import { type ActionId, PANEL, testId } from "../src/probe/testIds";
import {
	CUSTOMIZE_ERROR,
	EDIT_RECORD,
	PROCESS_CONFIRM,
	SAVE_BUTTON,
} from "./labels";

/**
 * 採取パネルの操作。
 *
 * kintone 内部の DOM には触らない。触るのはパネル（我々が足した要素）と、
 * 保存 / 編集など役割で特定できる標準的な要素だけ。
 *
 * set() が change イベントを発火すると実測で分かったため、
 * フィールドへの入力を Playwright が行う必要がなくなった。
 * 入力の代わりに probe のボタンを押す。
 */

type ProbeApi = {
	export: () => string;
	clear: () => void;
	count: () => number;
	coverage: () => { key: string; n: number }[];
	ready: () => boolean;
	lastError: () => string | null;
	screen: () => string;
	changeEvents: () => string[];
	beginWatch: () => void;
	watched: () => string[];
	endWatch: (label: string) => void;
	rowCount: () => number;
	blockNextSubmit: (message: string) => void;
};

/**
 * probe の API はブラウザ側にしか無い。
 *
 * `page.evaluate` の戻り値は JSON 直列化されるので、
 * API オブジェクトをそのまま返しても関数は落ちて空になる。
 * 呼び出しはすべてブラウザ側で完結させ、結果の値だけを受け取る。
 */

/** パネルが描画され、change ハンドラの登録が終わるまで待つ */
export const waitForPanel = async (
	page: Page,
	expectedScreen: string,
): Promise<void> => {
	const panel = page.locator(`[data-testid="${PANEL}"]`);
	await panel.waitFor({ state: "visible" });

	// ボタンの出し分けが画面判定に依存している。
	// 想定と違う画面のまま採取が進むと、採れないものを採ったつもりになる
	await expect(panel).toHaveAttribute("data-screen", expectedScreen);

	// change ハンドラの登録は getFieldCodes を待つので非同期。
	// 待たずに set() 系を実行すると、発火していても件数が 0 になり
	// 「change は飛ばない」という誤った測定結果が出る。
	// 固定時間の待機ではなく、状態が真になるまで待つ
	await page.waitForFunction(
		() =>
			(
				window as unknown as { __kintoneRecordProbe?: ProbeApi }
			).__kintoneRecordProbe?.ready() === true,
	);
};

/**
 * パネルのボタンを押し、完了と成功を確かめる。
 *
 * 押しただけでは成功したか分からない。probe は失敗を画面の文字に出すだけなので、
 * 機械可読な data-result と lastError() で確認する。
 * ここを省くと「静かに空振りした採取」がそのまま基準データになる。
 */
/**
 * kintone がカスタマイズの実行時エラーを表示していないことを確かめる。
 *
 * `set()` に不正な値を渡しても例外は飛ばず、この表示が出るだけ（実測）。
 * 「例外が出ていない」を成功と見なすと、誤った実測がそのまま基準データになる。
 * 実際それで「value を省くと静かに無視される」という誤った結論を出しかけた。
 */
export const assertNoCustomizeError = async (
	page: Page,
	context: string,
): Promise<void> => {
	await expect(
		page.getByText(CUSTOMIZE_ERROR),
		`${context} の時点で kintone がカスタマイズのエラーを表示している。この先の採取結果は信用できない`,
	).toHaveCount(0);
};

export const click = async (page: Page, action: ActionId): Promise<void> => {
	const button = page.locator(`[data-testid="${testId(action)}"]`);
	await button.click();

	// 実行中は disabled になる。押せる状態に戻ったら完了
	await expect(button).toBeEnabled();

	// **kintone のエラー表示を最初に見る。**
	// 一度これが出ると後続の set() も失敗するので、あとに回すと
	// 「原因を作った操作」ではなく「巻き込まれた操作」で落ちる。
	// probe は例外を捕まえられないため、これが唯一の検出手段。
	await assertNoCustomizeError(page, `採取 ${action}`);

	// data-result より先に lastError を見る。
	// 逆にすると「ok を期待したが error だった」としか出ず、
	// probe が投げた理由が失敗メッセージに載らない
	const error = await page.evaluate(() =>
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.lastError(),
	);
	expect(error, `採取 ${action} が失敗した`).toBeNull();

	await expect(button).toHaveAttribute("data-result", "ok");
};

export const clearSamples = async (page: Page): Promise<void> => {
	await page.evaluate(() => {
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.clear();
	});
};

/**
 * 採取結果を取り出す。
 *
 * ブラウザのダウンロードを使わない。落ちる先とファイル名が環境に依存し、
 * CI とローカルで挙動が変わるため。
 */
export const exportSamples = async (page: Page): Promise<string> =>
	page.evaluate(() =>
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.export(),
	);

/**
 * 指定した (イベント, 経路) が採れるまで待つ。
 *
 * 印刷画面にはヘッダが無くパネルが出ないので `waitForPanel` が使えない。
 * 代わりに採取そのものが済んだことを待つ。
 *
 * 固定時間の待機にしないのは、待ち足りなければ採取漏れを
 * 「その画面では採れない」と誤って結論づけてしまうため。
 *
 * `event` が `.` で終わっていれば前方一致で待つ。change イベントは
 * 名前にフィールドコードが埋まり、どのフィールドを触るかは probe の都合で
 * 決まるので、そこまで固定すると採取側を不必要に縛る
 * （`REQUIRED_CONTEXTS` の prefix と同じ考え方）。
 */
export const waitForSample = (
	page: Page,
	event: string,
	source: string,
	timeout?: number,
): Promise<unknown> => {
	const prefix = event.endsWith(".");
	return page.waitForFunction(
		({ key, byPrefix }) =>
			(
				window as unknown as { __kintoneRecordProbe?: ProbeApi }
			).__kintoneRecordProbe
				?.coverage()
				.some((entry) =>
					byPrefix ? entry.key.startsWith(key) : entry.key === key,
				) === true,
		{ key: prefix ? event : `${event} / ${source}`, byPrefix: prefix },
		timeout === undefined ? undefined : { timeout },
	);
};

export const sampleCount = (page: Page): Promise<number> =>
	page.evaluate(() =>
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.count(),
	);

/**
 * 実際に登録された change イベント名を取り出す。
 *
 * 「このイベントは飛ばなかった」という観測は、聞いていたことを示せて初めて
 * 意味を持つ。登録漏れと発火しなかったことを取り違えると実測が嘘になる。
 */
export const registeredChangeEvents = (page: Page): Promise<string[]> =>
	page.evaluate(() =>
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.changeEvents(),
	);

/**
 * kintone の UI を操作し、その間に発火した change イベントを採る。
 *
 * `set()` と UI 操作では発火するイベントが違う（実測）。
 * UI 側はパネルのボタンでは起こせないので、kintone のボタンを直接押す。
 * 掴むのは役割と名前で特定できるものだけで、内部セレクタは使わない。
 *
 * ## 完了をどう判定するか
 *
 * **行数の変化では足りない。** change イベントは行数が反映されたあとに飛ぶため、
 * 行数の変化で監視を閉じると**イベントを 1 つずつ後ろの操作に取り違える**。
 * 実際それで「追加では飛ばず削除で飛ぶ」という誤った結果を得た（実測 2026-08-31）。
 *
 * そこで 2 段階で待つ。
 *
 * 1. 行数が変わること（操作が実際に起きたことの確認）
 * 2. イベントが飛ぶこと
 *
 * 2 は**上限付きで待つ**。「飛ばなかった」を確かめるには、
 * どれだけ待ったかを決めるしかない。上限に達したら「発火なし」として記録する。
 * ここだけは固定の上限を置く。無いと絶対に終わらない。
 */
export const measureUiRowChange = async (
	page: Page,
	label: string,
	button: RegExp,
	delta: 1 | -1,
): Promise<void> => {
	const before = await rowCount(page);

	await beginWatch(page);
	await page.getByRole("button", { name: button }).first().click();

	// 期待どおりに行数が変わるまで待つ。変わらなければ空振りなので、
	// タイムアウトで落として空振りを実測として残さない
	await page.waitForFunction(
		(expected) =>
			(
				window as unknown as { __kintoneRecordProbe: ProbeApi }
			).__kintoneRecordProbe.rowCount() === expected,
		before + delta,
	);

	try {
		await page.waitForFunction(
			() =>
				(
					window as unknown as { __kintoneRecordProbe: ProbeApi }
				).__kintoneRecordProbe.watched().length > 0,
			undefined,
			{ timeout: UI_EVENT_TIMEOUT_MS },
		);
	} catch {
		// 上限まで待っても飛ばなかった。それ自体が測定結果なので記録に進む
	}

	await waitForCalculations(page);
	await endWatch(page, label);
	await assertNoCustomizeError(page, label);
};

/**
 * UI 操作の change イベントを待つ上限。
 *
 * 実測では行数の反映から 40ms ほどで飛ぶ。余裕を見てこの値にしてある。
 * 「飛ばなかった」という観測はこの上限に依存するので、値を変えたら
 * 過去の観測と比較できなくなることに注意する。
 */
const UI_EVENT_TIMEOUT_MS = 3000;

/**
 * kintone が計算フィールドを計算し終えるまで待つ。
 *
 * **UI で行を追加した直後、追加された行の計算フィールドがまだ計算されていない
 * ことがある。** 実測 2026-09-05、`screen.edit.uiAddRow` の
 * `t_calc` がある実行では `undefined`、別の実行では `"0"` になり、
 * 同じ操作なのに基準データに差分が出た。動いている対象を採っていた。
 *
 * 最初は「2 回続けて同じ結果」を条件にしたが、それでは弱かった。
 * 再計算が始まる前の**安定した undefined** を拾ってしまい、まだ揺れた。
 * 待つべきものが分かった以上、そちらを直接の条件にする。
 *
 * `set()` で足した行の計算フィールドは `undefined` のままで正しい
 * （`screen.edit.addRow`。実測で毎回そうなる）。この待ちは UI 操作の
 * 測定にだけ置いてあるので、そちらには影響しない。
 *
 * `kintone.app.record.get()` を直接呼ぶ。probe を経由しないのは、
 * ここに手を入れるためだけにカスタマイズを再デプロイしたくないため。
 * 公開 API なので内部実装には触れていない。
 */
const waitForCalculations = async (page: Page): Promise<void> => {
	try {
		await page.waitForFunction(
			() => {
				const get = (
					window as unknown as {
						kintone?: {
							app?: { record?: { get?: () => { record?: unknown } | null } };
						};
					}
				).kintone?.app?.record?.get;
				if (get === undefined) return true;

				const record = get()?.record;
				if (record === null || typeof record !== "object") return true;

				type Cell = { type?: string; value?: unknown };
				const pending = (fields: object): boolean =>
					Object.values(fields).some((cell: Cell) => {
						if (cell?.type === "CALC") return cell.value === undefined;
						if (cell?.type !== "SUBTABLE") return false;
						const rows = cell.value;
						if (!Array.isArray(rows)) return false;
						return rows.some((row: { value?: object }) =>
							row?.value === undefined ? false : pending(row.value),
						);
					});

				return !pending(record);
			},
			undefined,
			{ timeout: UI_EVENT_TIMEOUT_MS },
		);
	} catch {
		// 計算が終わらなかった。基準データの差分として現れるので、そこで気づく
	}
};

const beginWatch = (page: Page): Promise<void> =>
	page.evaluate(() => {
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.beginWatch();
	});

const endWatch = (page: Page, label: string): Promise<void> =>
	page.evaluate((name) => {
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.endWatch(name);
	}, label);

export const rowCount = (page: Page): Promise<number> =>
	page.evaluate(() =>
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.rowCount(),
	);

/**
 * ラベルから、そのフィールドの入力欄を掴む。
 *
 * kintone のフィールド入力欄には accessible name が無いので
 * `getByRole("textbox", { name })` では取れない（実測）。
 * 内部セレクタ（`.gaia-*`）は使えないので、**ラベル文字列を起点に**たどる。
 * ラベルは `tools/fixture-app/fields.ts` で我々が決めたもので、
 * kintone の内部実装ではないし環境の言語でも変わらない。
 *
 * 祖先を 1 段ずつ登り、**入力欄がちょうど 1 件になった段**を使う。
 * 「2 段上」と決め打ちにすると、kintone が入れ子を 1 段変えただけで壊れる。
 * 実測では 2 段上だが、そこに依存しない形にしてある。
 */
export const fieldInput = async (page: Page, label: string) => {
	const anchor = page.getByText(label, { exact: true });
	let path = "..";
	for (let depth = 1; depth <= 5; depth += 1) {
		const box = anchor.locator(path).getByRole("textbox");
		if ((await box.count()) === 1) return box.first();
		path = `${path}/..`;
	}
	throw new Error(
		`ラベル「${label}」から入力欄を一意に特定できません（5 段上まで探索）`,
	);
};

/**
 * UI でフィールドに入力し、その間に発火した change イベントを採る。
 *
 * 値の変更は**フォーカスを外したときに**反映される（開発者による手動確認）。
 * そのため入力後に blur してからイベントを待つ。
 */
export const measureUiFieldChange = async (
	page: Page,
	label: string,
	fieldLabel: string,
	value: string,
): Promise<void> => {
	const input = await fieldInput(page, fieldLabel);

	await beginWatch(page);
	await input.fill(value);
	await input.blur();

	try {
		await page.waitForFunction(
			() =>
				(
					window as unknown as { __kintoneRecordProbe: ProbeApi }
				).__kintoneRecordProbe.watched().length > 0,
			undefined,
			{ timeout: UI_EVENT_TIMEOUT_MS },
		);
	} catch {
		// 上限まで待っても飛ばなかった。それ自体が測定結果
	}

	await waitForCalculations(page);
	await endWatch(page, label);
	await assertNoCustomizeError(page, label);
};

/**
 * サブテーブルのセルの入力欄を、列ヘッダーのラベルから掴む。
 *
 * 表外のフィールドと違い、ラベル（列ヘッダー）から祖先をたどると
 * 表全体に着いてしまい、列を特定できない（実測: 入力欄が 17 件）。
 * そこで列ヘッダーの位置を求め、行の同じ位置のセルを取る。
 * 使うのは ARIA の標準ロール（table / columnheader / row / cell）だけで、
 * kintone 固有のセレクタは使わない。
 *
 * ヘッダー行の位置は決め打ちにせず、**入力欄を持つ最初の行**を探す。
 * 「1 行目が本文」と決めると、表の構造が変わったときに黙って別の行を触る。
 */
export const subtableCellInput = async (page: Page, header: string) => {
	const table = page
		.getByRole("table")
		.filter({ has: page.getByText(header, { exact: true }) })
		.first();

	const headers = await table.getByRole("columnheader").allTextContents();
	const index = headers.findIndex((text) => text.trim() === header);
	if (index < 0) {
		throw new Error(`列ヘッダー「${header}」が見つかりません`);
	}

	const rows = table.getByRole("row");
	const count = await rows.count();
	for (let nth = 0; nth < count; nth += 1) {
		const box = rows.nth(nth).getByRole("cell").nth(index).getByRole("textbox");
		if ((await box.count()) === 1) return box.first();
	}
	throw new Error(
		`列「${header}」に入力欄を持つ行がありません（${count} 行を確認）`,
	);
};

/**
 * UI で表内のセルに入力し、その間に発火した change イベントを採る。
 */
export const measureUiCellChange = async (
	page: Page,
	label: string,
	header: string,
	value: string,
): Promise<void> => {
	const input = await subtableCellInput(page, header);

	await beginWatch(page);
	await input.fill(value);
	await input.blur();

	try {
		await page.waitForFunction(
			() =>
				(
					window as unknown as { __kintoneRecordProbe: ProbeApi }
				).__kintoneRecordProbe.watched().length > 0,
			undefined,
			{ timeout: UI_EVENT_TIMEOUT_MS },
		);
	} catch {
		// 上限まで待っても飛ばなかった。それ自体が測定結果
	}

	await waitForCalculations(page);
	await endWatch(page, label);
	await assertNoCustomizeError(page, label);
};

/**
 * submit ハンドラの戻り値に `error` を設定して、保存が止まるかを測る。
 *
 * `CreateSubmitEvent` / `EditSubmitEvent` の `error?: string` は
 * 「保存を中断できる」という契約のために持たせているが、
 * **採取時は常に event をそのまま返しており一度も確かめていなかった**。
 *
 * ## 止まったことをどう判定するか
 *
 * 「画面が遷移しないこと」では判定できない。遷移しないのを待つには
 * 時間を決めるしかなく、遅い遷移と区別がつかない。
 *
 * 代わりに **`submit.success` が飛んでいないこと**と
 * **パネルがまだ編集中の画面を指していること**の 2 つで見る。
 * 前者は probe が採ったサンプルで分かり、後者は data-screen で分かる。
 */
export const measureBlockedSubmit = async (
	page: Page,
	message: string,
	expectedScreen: string,
): Promise<void> => {
	await page.evaluate((text) => {
		(
			window as unknown as { __kintoneRecordProbe: ProbeApi }
		).__kintoneRecordProbe.blockNextSubmit(text);
	}, message);

	await page.getByRole("button", { name: SAVE_BUTTON }).click();

	// kintone が error を画面に出すまで待つ。
	// これが出れば保存は止まっている（成功なら詳細画面へ遷移してしまう）
	await expect(page.getByText(message)).toBeVisible();

	// 画面が変わっていないことを確かめる。パネルは画面ごとに描き直されるので、
	// data-screen が編集中の画面のままなら遷移していない
	await expect(page.locator(`[data-testid="${PANEL}"]`)).toHaveAttribute(
		"data-screen",
		expectedScreen,
	);

	await assertNoCustomizeError(page, "保存の中断");
};

/**
 * プロセス管理のアクションを実行する。
 *
 * **押しただけでは実行されない。** 次のステータスと作業者を示すダイアログが
 * 開き、確定して初めてイベントが飛ぶ（実測 2026-09-05。PC・モバイル共通）。
 *
 * アクションの掴み方だけが画面で違うので、呼ぶ側から渡してもらう。
 *  - PC: role を持たない `<span title="処理開始">`
 *  - モバイル: 本物の button。名前は「処理開始 (Proceed status)」で、
 *    アクション名のあとに kintone の説明が付く
 */
export const proceedProcess = async (
	page: Page,
	action: Locator,
): Promise<void> => {
	await action.click();
	await page.getByRole("button", { name: PROCESS_CONFIRM }).click();
};

/**
 * 一覧のインライン編集を測る。
 *
 * 一覧にしか無いイベント（`app.record.index.edit.*`）の唯一の採取経路。
 * 型には最初から書いてあるのに、根拠が無いままだった。
 *
 * ## パネルのボタンでは起こせない
 *
 * インライン編集は kintone の UI からしか開けない。
 * 行の右端の「編集」ボタンには `aria-label` があるので、
 * 内部セレクタを使わずに役割と名前で掴める（実測 2026-09-05）。
 *
 * ## どの行を触るか
 *
 * **先頭行と決め打ちにしない。** 並び順は一覧の設定で変わる。
 * この実行で作ったレコードへのリンクを持つ行を選ぶ。
 * 掴みどころは `href` の中の `record=<id>` で、これは URL なので
 * 環境の言語では変わらない（編集画面へ URL で直接遷移するのと同じ考え方）。
 *
 * 自分で作ったレコードだけを触るので、検証アプリのテストレコードは汚れない。
 *
 * ## 触れない列がある
 *
 * インライン編集では、一覧に出ている列でも入力欄にならないものがある
 * （関連レコード一覧の「表示するレコードの条件」に指定されたフィールド。
 * 実測 2026-09-05）。呼び出す側が編集できる列を選ぶ。
 *
 * `fieldCode` は `header` の列に対応するフィールドコード。
 * change イベント名にフィールドコードが埋まるので、
 * 「その change が飛んだか」を待つために要る。
 */
export const measureInlineEdit = async (
	page: Page,
	recordId: string,
	header: string,
	value: string,
	fieldCode: string,
): Promise<void> => {
	const row = page
		.getByRole("row")
		.filter({ has: page.locator(`a[href*="record=${recordId}&"]`) });
	await expect(
		row,
		`レコード ${recordId} の行が一覧で一意に決まらない`,
	).toHaveCount(1);

	await row.getByRole("button", { name: EDIT_RECORD }).click();
	// 開いたことをイベントで確かめる。入力欄を探しに行くのはそのあと
	await waitForSample(page, "app.record.index.edit.show", "event.record");

	const input = await inlineCellInput(page, row, header);
	await input.fill(value);
	await input.blur();

	// **保存の前に change を待つ。** 待たずに保存すると、change が飛ばなかったのか
	// 保存に巻き込まれて採れなかったのかを区別できない。
	// 上限に達したら「発火なし」として先へ進む（`measureUiRowChange` と同じ考え方）
	try {
		await waitForSample(
			page,
			`app.record.index.edit.change.${fieldCode}`,
			"event.record",
			UI_EVENT_TIMEOUT_MS,
		);
	} catch {
		// 上限まで待っても飛ばなかった。それ自体が測定結果なので保存に進む。
		// 採れていなければ REQUIRED_CONTEXTS の検査が落とす
	}

	// 保存ボタンは開いてから現れる。行の中に限って掴む
	await row.getByRole("button", { name: SAVE_BUTTON }).click();
	await waitForSample(
		page,
		"app.record.index.edit.submit.success",
		"event.record",
	);

	await assertNoCustomizeError(page, "一覧のインライン編集");
};

/**
 * インライン編集中の行から、列ヘッダーのラベルでセルの入力欄を掴む。
 *
 * サブテーブルと同じ考え方（`subtableCellInput`）。列ヘッダーの位置を求め、
 * 行の同じ位置のセルを取る。使うのは ARIA の標準ロールだけ。
 */
const inlineCellInput = async (
	page: Page,
	row: Locator,
	header: string,
): Promise<Locator> => {
	const table = page
		.getByRole("table")
		.filter({ has: page.getByText(header, { exact: true }) })
		.first();

	const headers = await table.getByRole("columnheader").allTextContents();
	const index = headers.findIndex((text) => text.trim() === header);
	if (index < 0) {
		throw new Error(
			`列ヘッダー「${header}」が一覧にありません（${headers.length} 列）`,
		);
	}

	const box = row.getByRole("cell").nth(index).getByRole("textbox");
	const count = await box.count();
	if (count !== 1) {
		// **どの列に入力欄があったかを出す。**
		// これが無いと「列の対応がずれた」のか「その列は編集できない」のかを
		// エラーから切り分けられず、実物を見に行くことになる（実測でそうなった）
		const editable: string[] = [];
		for (const [nth, name] of headers.entries()) {
			const cell = row.getByRole("cell").nth(nth);
			if ((await cell.getByRole("textbox").count()) > 0) {
				editable.push(`${nth}:${name.trim() === "" ? "(無題)" : name.trim()}`);
			}
		}
		throw new Error(
			`列「${header}」(${index} 列目) の入力欄が ${count} 件で一意に決まりません。` +
				`入力欄を持つ列: ${editable.length === 0 ? "なし" : editable.join(", ")}。` +
				`列の対応がずれているか、この列がインライン編集できないかのどちらか`,
		);
	}
	return box.first();
};
