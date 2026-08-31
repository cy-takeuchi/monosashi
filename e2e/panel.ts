import { expect, type Page } from "@playwright/test";
import { type ActionId, PANEL, testId } from "../src/probe/testIds";

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
export const click = async (page: Page, action: ActionId): Promise<void> => {
	const button = page.locator(`[data-testid="${testId(action)}"]`);
	await button.click();

	// 実行中は disabled になる。押せる状態に戻ったら完了
	await expect(button).toBeEnabled();

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
