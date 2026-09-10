/**
 * 書き込み時に扱いを変える必要があるフィールド種別。
 *
 * すべて実測に基づく（fixtures/write-behavior.md）。
 * 「除くべき」を仕様の推測で決めず、実際に REST へ投げた結果で決めている。
 */

/**
 * REST の addRecord / updateRecord に渡すとエラーになる type。
 *
 * | type | エラーコード |
 * | --- | --- |
 * | RECORD_NUMBER / CREATOR / CREATED_TIME / MODIFIER / UPDATED_TIME | GAIA_UN10 |
 * | STATUS / STATUS_ASSIGNEE | GAIA_UN10 |
 * | GROUP | GAIA_UN10 |
 * | CATEGORY | GA_UO01（「APIでは次の操作はできません：カテゴリーの値の編集」） |
 *
 * 除かないと必ず失敗するので、変換の必須要件。
 */
export const REJECTED_ON_WRITE = [
	"RECORD_NUMBER",
	"CREATOR",
	"CREATED_TIME",
	"MODIFIER",
	"UPDATED_TIME",
	"STATUS",
	"STATUS_ASSIGNEE",
	"CATEGORY",
	"GROUP",
] as const;

/**
 * 渡してもエラーにならないが、書き込んでも意味がない type。
 *
 * CALC は計算結果なので送っても無視される（実測）。
 * 除くのは正しさの要件ではなく整形。
 */
export const IGNORED_ON_WRITE = ["CALC", "__ID__", "__REVISION__"] as const;

/** UI 専用で、REST では意味を持たないプロパティ */
export const UI_ONLY_PROPERTIES = [
	// set() で設定できるが get() では返らない書き込み専用プロパティ（実測）
	"disabled",
	"error",
	// ルックアップのキーフィールドが JS API 側でだけ持つ（実測）
	"confirmed",
	"recordId",
] as const;

const rejected = new Set<string>(REJECTED_ON_WRITE);
const ignored = new Set<string>(IGNORED_ON_WRITE);

/**
 * REST への書き込みで除くべき type かどうか。
 *
 * `record[code]?.type` をそのまま渡せるよう undefined も受け取る。
 */
export const isExcludedOnWrite = (type: string | undefined): boolean =>
	type !== undefined && (rejected.has(type) || ignored.has(type));

/**
 * 除かないと REST がエラーを返す type かどうか。
 *
 * ```ts
 * for (const [code, field] of Object.entries(record)) {
 *   if (isRejectedOnWrite(field.type)) continue;
 * }
 * ```
 */
export const isRejectedOnWrite = (type: string | undefined): boolean =>
	type !== undefined && rejected.has(type);
