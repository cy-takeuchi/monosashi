/**
 * 採取パネルの要素識別子。**probe と e2e の唯一の出どころ**。
 *
 * Playwright 側でリテラルを書くと、probe を直したときに黙ってずれる。
 * このプロジェクトで何度も塞いできた形なので、最初から 1 箇所にする。
 *
 * kintone 内部のセレクタは使用禁止だが、パネルは我々が足した要素なので
 * `data-testid` を使ってよい（e2e-test-kit の規約）。
 * 表示文言で要素を探すと、文言を変えた瞬間に採取が壊れる。
 */

export const PANEL = "krp-panel";
export const LABEL = "krp-label";
export const STATUS = "krp-status";

/** ボタンの識別子。`data-testid` は `krp-` を前置したもの */
export const ACTION = {
	/** kintone.app.record.get() で採取 */
	jsApi: "jsapi",
	/** REST で採取。一覧画面では getRecords になる */
	rest: "rest",
	/** JS API と REST を続けて採取 */
	both: "both",
	/** set() で disabled / error を設定してから読み直す */
	setFlags: "set-flags",
	/** set() で値を変更する。change が発火するかの測定を兼ねる */
	setValue: "set-value",
	/** set() でサブテーブル内のセルを変更する。changes.row の根拠になる */
	setRow: "set-row",
	/** set() でサブテーブルに行を追加する。行追加時の change と新規行の id を測る */
	addRow: "add-row",
	/** set() でサブテーブルの末尾の行を削除する */
	removeRow: "remove-row",
	/** 未入力の必須フィールドを set() で埋める。保存できる状態にするため */
	fillRequired: "fill-required",
	coverage: "coverage",
	export: "export",
	clear: "clear",
} as const;

export type ActionId = (typeof ACTION)[keyof typeof ACTION];

/** `data-testid` の値を作る。Playwright 側もこれを使う */
export const testId = (action: ActionId): string => `krp-${action}`;
