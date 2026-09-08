/**
 * `kintone.app.record.set()` で扱いを変える必要があるフィールド種別。
 *
 * すべて実測に基づく（`fixtures/set-behavior.md`・22 ケース）。
 * 「落とすべき」を仕様の推測で決めず、実際に渡した結果で決めている。
 *
 * **REST 版（`fieldTypes.ts`）と同じにしてはいけない。**
 * どちらも「書き込み」だが要件が違う（同ファイルの表）。
 */

/**
 * `set()` に渡すとエラーになる type。
 *
 * **`CATEGORY` だけ。** 別の値を渡すと kintone が
 * 「カスタマイズ用の JavaScript の実行時にエラーが発生しました」を表示する。
 *
 * REST は読み取り専用 8 種別すべてを拒否するが、
 * `set()` は**このひとつだけ**（実測 2026-09-08）。
 * 落とさないと必ず失敗するので、変換の必須要件。
 */
export const REJECTED_ON_SET = ["CATEGORY"] as const;

/**
 * 渡してもエラーにならないが、書き込んでも意味がない type。
 *
 * 別の値を渡しても**変化しなかった**種別（実測 2026-09-08）。
 * REST が拒否する 8 種別のうち `CATEGORY` を除いた 7 つと、
 * `$id` / `$revision` / `CALC`。
 *
 * 落とすのは正しさの要件ではなく整形。
 * 残っていても黙って無視されるので、落とし漏れがあっても壊れない。
 */
export const IGNORED_ON_SET = [
	"RECORD_NUMBER",
	"CREATOR",
	"CREATED_TIME",
	"MODIFIER",
	"UPDATED_TIME",
	"STATUS",
	"STATUS_ASSIGNEE",
	"__ID__",
	"__REVISION__",
	"CALC",
] as const;

const rejected = new Set<string>(REJECTED_ON_SET);
const ignored = new Set<string>(IGNORED_ON_SET);

/**
 * `set()` への書き込みで落とすべき type かどうか。
 *
 * `record[code]?.type` をそのまま渡せるよう undefined も受け取る。
 */
export const isDroppedOnSet = (type: string | undefined): boolean =>
	type !== undefined && (rejected.has(type) || ignored.has(type));

/**
 * 落とさないと `set()` がエラーを出す type かどうか。
 *
 * ```ts
 * for (const [code, field] of Object.entries(record)) {
 *   if (isRejectedOnSet(field.type)) continue;
 * }
 * ```
 */
export const isRejectedOnSet = (type: string | undefined): boolean =>
	type !== undefined && rejected.has(type);
