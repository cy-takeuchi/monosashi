/**
 * 文脈を問わないレコードの緩い型。
 *
 * `Saved` / `Editing` / `Rest` は value の型が違うが、
 * **`type` を持ち `value` を持つ**という骨格だけは 3 文脈で共通（実測）。
 * 変換・代入・ガードはその骨格しか必要としないので、
 * 入力をここまで緩めることで 3 文脈のどのレコードでも受け取れる。
 *
 * 各所で同じ形を書き下すと、片方だけ直したときに静かにずれる。
 * 実際この 3 つは convert / build / guard に別々に定義されていた。
 */

/** type と value を持つもの。フィールドの最小の骨格 */
export type LooseField = {
	type: string;
	value: unknown;
};

/** フィールドコードからフィールドを引けるもの */
export type LooseRecord = {
	[fieldCode: string]: LooseField;
};

/**
 * サブテーブルの行。
 *
 * `id` は Saved では string、Editing の新規行では null、
 * 自前で組み立てたときは無い、の 3 通りがありうる（実測）。
 */
export type LooseSubtableRow = {
	id?: string | null;
	value: LooseRecord;
};

/**
 * サブテーブルの行の配列か。
 *
 * **同じ実装が `toRestWrite.ts` と `toSetRecord.ts` にあった。**
 * あの 2 本は「除くべきものが実測で違う」ので実装を使い回さない
 * （CLAUDE.md「書き込みは REST と `set()` で要件が違う」）。
 * ただしそれは**除外の方針**の話で、この判定は方針ではなく
 * 「`LooseSubtableRow[]` として読めるか」という型の骨格の確認。
 * 骨格はまさにこのファイルが 1 箇所に持つと決めたもの。
 */
export const isSubtableRows = (value: unknown): value is LooseSubtableRow[] =>
	Array.isArray(value) &&
	value.every(
		(row) =>
			typeof row === "object" && row !== null && "value" in (row as object),
	);
