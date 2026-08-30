import { getAppId, getRecordId, headerElement } from "./kintoneApi";
import * as store from "./store";
import { type ActionId, LABEL, PANEL, STATUS, testId } from "./testIds";

const LABEL_KEY = "kintone-record-probe/label";

/**
 * 直近の操作が失敗したときのメッセージ。成功したら null に戻す。
 *
 * 採取が失敗しても画面上は文字が変わるだけで、
 * Playwright からは成功と区別がつかない。
 * 「静かに空振りした採取」を検出できるようにしておく。
 */
let lastError: string | null = null;

export const getLastError = (): string | null => lastError;

export const currentLabel = (): string =>
	localStorage.getItem(LABEL_KEY) ?? "unlabeled";

const styleButton = (button: HTMLButtonElement): void => {
	button.style.cssText = [
		"margin-right:4px",
		"padding:4px 10px",
		"font-size:12px",
		"cursor:pointer",
		"border:1px solid #999",
		"border-radius:3px",
		"background:#fff",
	].join(";");
};

/**
 * パネルの操作。
 *
 * `id` は Playwright が掴むための識別子で、`data-testid` になる。
 * 表示文言（`text`）で要素を探すと、文言を変えた瞬間に採取が壊れる。
 * kintone 内部のセレクタは使用禁止だが、**このパネルは我々が足した要素**なので
 * `data-testid` を使ってよい（e2e-test-kit の規約）。
 */
type Action = {
	id: ActionId;
	text: string;
	run: () => void | Promise<void>;
};

export const renderPanel = (actions: Action[], screen: string): void => {
	const header = headerElement();
	if (header === null) return;

	// 既存のパネルは消してから描き直す。
	// kintone は詳細画面から編集画面に移るときページを再読み込みしないため、
	// 「既にあれば何もしない」にすると詳細画面用のボタンが残り続け、
	// 編集画面でしか使えない操作が出てこない。
	document.getElementById("krp-panel")?.remove();

	const panel = document.createElement("div");
	panel.id = "krp-panel";
	panel.dataset.testid = PANEL;
	// どの画面と判定したかを機械可読にする。
	// ボタンの出し分けが画面判定に依存しているので、
	// 想定と違う画面のまま採取が進むことを防げる
	panel.dataset.screen = screen;
	panel.style.cssText =
		"display:inline-block;padding:6px 8px;border:1px solid #ccc;background:#fafafa;font-size:12px";

	const label = document.createElement("input");
	label.dataset.testid = LABEL;
	label.type = "text";
	label.value = currentLabel();
	label.placeholder = "ラベル (例: 未入力 / 入力済み)";
	label.style.cssText =
		"margin-right:8px;padding:3px 6px;font-size:12px;width:180px";
	label.addEventListener("input", () => {
		localStorage.setItem(LABEL_KEY, label.value);
	});
	panel.appendChild(label);

	const status = document.createElement("span");
	status.dataset.testid = STATUS;
	status.style.cssText = "margin-left:8px;color:#555";

	const refresh = (): void => {
		const appId = getAppId();
		const recordId = getRecordId();
		// 判定した画面を出す。ボタンの出し分けが画面判定に依存しているので、
		// 想定と違う画面だと分かった時点で気づけるようにする。
		status.textContent = `[${screen}] 採取 ${store.count()} 件 / app=${appId ?? "-"} record=${recordId ?? "-"}`;
	};

	for (const action of actions) {
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = action.text;
		button.dataset.testid = testId(action.id);
		styleButton(button);
		button.addEventListener("click", async () => {
			// 実行中は button.disabled が true になる。
			// Playwright は「押せる状態に戻ったこと」で完了を待てるので、
			// 固定時間の待機が要らない
			button.disabled = true;
			// 前回の結果を消す。押した直後に古い ok が残っていると、
			// Playwright が前回の成功を今回の成功と誤認する
			delete button.dataset.result;
			try {
				await action.run();
				button.dataset.result = "ok";
				lastError = null;
				refresh();
			} catch (error) {
				// 表示だけでなく機械可読にも残す。
				// 表示文字列の一致で判定させると文言変更で壊れる
				button.dataset.result = "error";
				lastError = String(error);
				status.textContent = `失敗: ${String(error)}`;
			} finally {
				button.disabled = false;
			}
		});
		panel.appendChild(button);
	}

	panel.appendChild(status);
	header.appendChild(panel);
	refresh();
};

export const renderCoverage = (): void => {
	const rows = store.coverage();
	console.table(rows);
};
