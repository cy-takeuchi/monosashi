import type { KintoneEventName } from "../types/event.js";

/**
 * 採取対象のイベント一覧。
 *
 * Q9 で決めた網羅範囲のうち「実測の裏付けを取る」レコード系イベント。
 * portal / space / report はレコードを持たないため採取対象外
 * （公式ドキュメント準拠で型を書き、JSDoc で根拠のレベルを区別する）。
 *
 * ## 型マップと結びつける
 *
 * 各リストは `KintoneEventName[]`。採取しているのに `KintoneEventMap` に
 * 無いイベントがあれば、ここでコンパイルエラーになる。
 * リテラル型を保つために both / pc を型引数付きにしてある。
 */

/** PC のみのイベント。リテラル型を保つための恒等関数 */
const pc = <T extends string>(name: T): T => name;
/** PC 版とモバイル版の組。`mobile.` 付きの名前もリテラルとして保つ */
const both = <T extends string>(name: T): [T, `mobile.${T}`] => [
	name,
	`mobile.${name}`,
];

/** event.record を1件持つイベント */
export const EVENTS_WITH_RECORD: KintoneEventName[] = [
	...both("app.record.create.show"),
	...both("app.record.edit.show"),
	...both("app.record.detail.show"),
	...both("app.record.create.submit"),
	...both("app.record.edit.submit"),
	...both("app.record.detail.process.proceed"),
	// 印刷画面は PC のみ
	pc("app.record.print.show"),
	// 一覧のインライン編集は PC のみ
	pc("app.record.index.edit.show"),
	pc("app.record.index.edit.submit"),
];

/** event.records を持つイベント */
export const EVENTS_WITH_RECORDS: KintoneEventName[] = [
	...both("app.record.index.show"),
];

/**
 * 保存完了イベント。
 *
 * 当初は「record を持たない（url だけ）」と想定していたが、実測では
 * record も recordId も持っていた。しかも recordId は string
 * （show 系や submit は number）。
 */
export const EVENTS_AFTER_SUBMIT: KintoneEventName[] = [
	...both("app.record.create.submit.success"),
	...both("app.record.edit.submit.success"),
	pc("app.record.index.edit.submit.success"),
];

/**
 * 削除イベント。
 *
 * 当初は「record を持たない」と想定して `undefined` を記録していたが、
 * **実測では完全な Saved レコードを持っていた**（2026-09-05。
 * 37 フィールド、空のフィールドは `""` / `null`、システムフィールドもある）。
 * 想定のほうが誤りだったので、record を採る側に直した。
 */
export const EVENTS_DELETE_SUBMIT: KintoneEventName[] = [
	...both("app.record.detail.delete.submit"),
	pc("app.record.index.delete.submit"),
];

/** イベント名にフィールドコードが埋まる動的イベント。実行時にフィールド一覧から組み立てる */
const changeEventPrefixes = [
	...both("app.record.create.change"),
	...both("app.record.edit.change"),
	pc("app.record.index.edit.change"),
];

/**
 * フィールドコードを埋めて change イベント名を組み立てる。
 *
 * 戻りが `KintoneEventName[]` になることで、
 * 型マップの `change.${string}` の枠と食い違えばここで落ちる。
 */
export const buildChangeEvents = (fieldCodes: string[]): KintoneEventName[] =>
	changeEventPrefixes.flatMap((prefix) =>
		fieldCodes.map((code): KintoneEventName => `${prefix}.${code}`),
	);
