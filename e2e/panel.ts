import { expect, type Page } from "@playwright/test";
import { type ActionId, PANEL, testId } from "../src/probe/testIds";
import { CUSTOMIZE_ERROR, SAVE_BUTTON } from "./labels";

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
