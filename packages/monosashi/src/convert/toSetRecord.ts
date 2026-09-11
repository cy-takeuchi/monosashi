import type { LooseField, LooseRecord } from "../types/loose.js";
import { isSubtableRows } from "../types/loose.js";
import type { SetRecord } from "../types/record.js";
import { isExcludedOnSet } from "./setFieldTypes.js";

/**
 * `kintone.app.record.set()` に渡せる形に変換する。
 *
 * ```ts
 * // REST で取ったレコードを画面に反映する
 * const { record } = await client.record.getRecord({ app, id });
 * kintone.app.record.set({ record: toSetRecord(record) });
 *
 * // 画面のレコードを読んで書き戻す
 * const got = kintone.app.record.get();
 * if (got !== null) {
 *   kintone.app.record.set({ record: toSetRecord(got.record) });
 * }
 * ```
 *
 * ## `toRestWrite` と同じ実装を使い回せない
 *
 * どちらも「書き込み」だが**除くべきものが違う**（`fixtures/set-behavior.md`）。
 *
 * | | REST `updateRecord` | `set()` |
 * |---|---|---|
 * | 読み取り専用 8 種別 | **全部拒否**（除くのは必須） | `CATEGORY` だけ拒否 |
 * | 行 id を除く | **行が置き換わりデータが壊れる** | id が保たれる |
 * | `type` の省略 | REST は `{ value }` だけで通る | **拒否される** |
 *
 * 片方の結果を流用すると、緩すぎるか厳しすぎるかのどちらかになる。
 *
 * ## 必須要件は 2 つだけ
 *
 * 1. **`CATEGORY` を除く** — 唯一エラーになる種別
 * 2. **`type` を付ける** — 省くと拒否される（実測 2026-08-30）
 *
 * ほかに除いているものは**整形**で、
 * 残っていてもエラーにならず黙って無視される。
 * それでも除くのは、型の上で「`set()` に渡せる形」を表せるようにするため。
 *
 * ## 触らないもの
 *
 * | | 理由 |
 * |---|---|
 * | `FILE` の値 | 4 キー（`contentType` / `fileKey` / `name` / `size`）のままで通る |
 * | サブテーブルの行 `id` | 除いても保たれる。REST とは逆 |
 * | `null` の値 | 受け入れられ、値が未入力になる。**変換は要らない** |
 *
 * `null` を渡せることが `REST` → `set()` の要点。
 * REST の未入力（`DROP_DOWN` が `null`）をそのまま渡すと、
 * 画面側の未入力（`undefined`）になる。**意味が正しく対応する。**
 */
export const toSetRecord = (record: LooseRecord): SetRecord => {
	const out: SetRecord = {};

	for (const [code, field] of Object.entries(record)) {
		if (field === undefined || field === null) continue;
		if (isExcludedOnSet(field.type)) continue;

		out[code] = convertFieldForSet(field);
	}

	return out;
};

/**
 * フィールド 1 つを `set()` に渡せる形にする。
 *
 * サブテーブルの行だけを扱いたいときのために公開する
 * （`convertField` が `toRestWrite` に対して果たしているのと同じ役割）。
 *
 * **除くべきかの判定は含まない。** 呼ぶ側が `isExcludedOnSet` で判断する。
 * 判定を混ぜると「1 行だけ変換する」用途で使えなくなる。
 */
export const convertFieldForSet = (field: LooseField): SetRecord[string] => {
	// **`type` は必ず付ける。** 省くと実行時に落ちる（実測 2026-08-30）
	if (field.type !== "SUBTABLE" || !isSubtableRows(field.value)) {
		return { type: field.type, value: field.value };
	}

	return {
		type: field.type,
		value: field.value.map((row) => {
			const inner: SetRecord = {};
			for (const [code, cell] of Object.entries(row.value)) {
				if (isExcludedOnSet(cell.type)) continue;
				inner[code] = convertFieldForSet(cell);
			}
			// **行 id は除いても保たれる**（実測）。
			// それでも渡すのは、REST から来た行をそのまま扱えるようにするため。
			// null（作成画面の新規行）のときは渡さない
			return row.id === undefined || row.id === null
				? { value: inner }
				: { id: row.id, value: inner };
		}),
	};
};
