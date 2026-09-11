import type { LooseField, LooseRecord } from "../types/loose.js";
import { isSubtableRows } from "../types/loose.js";
import { isExcludedOnWrite, UI_ONLY_PROPERTIES } from "./fieldTypes.js";

/**
 * JS API / event.record / REST のレコードを、
 * REST の addRecord / updateRecord に渡せる形に変換する。
 *
 * ## 同期の純粋関数である
 *
 * `getFormFields` を呼ばないしフィールドメタ情報も受け取らない。
 * 当初はルックアップのコピー先を判別するためにメタが要ると設計したが、
 * 実測でコピー先を含めても**黙って無視される**ことが分かり、判別が不要になった。
 *
 * async にしないのは、一括更新のループ内で呼ばれると
 * レコード数だけ API を叩くことになり kintone の上限に当たるため。
 *
 * ## 何をするか
 *
 * 1. 書き込みが拒否される type を除く（除かないと必ずエラーになる）
 * 2. `$id` / `$revision` を分離して id / revision として返す
 * 3. UI 専用プロパティ（disabled / error / confirmed / recordId）を除く
 * 4. サブテーブルは**行の id を保持したまま**再帰処理する
 *
 * 3 と 4 のうち 3 は整形であって必須ではない（渡しても無視される）。
 * **4 は必須**。id を除くと既存の行が置き換わり、新しい id が振られてデータが壊れる。
 */

export type RestWriteRecord = {
	[fieldCode: string]: { value: unknown };
};

export type RestWriteParams = {
	/** addRecord / updateRecord の record パラメータ */
	record: RestWriteRecord;
	/** $id があれば取り出したもの。updateRecord の id に渡す */
	id?: string;
	/** $revision があれば取り出したもの。updateRecord の revision に渡す */
	revision?: string;
};

const uiOnly = new Set<string>(UI_ONLY_PROPERTIES);

const convertValue = (field: LooseField): unknown => {
	if (field.type !== "SUBTABLE") return field.value;
	if (!isSubtableRows(field.value)) return field.value;

	return field.value.map((row) => {
		const inner: RestWriteRecord = {};
		for (const [code, cell] of Object.entries(row.value)) {
			const converted = convertField(cell);
			if (converted !== undefined) inner[code] = converted;
		}
		// id は保持する。除くと行が置き換わってデータが壊れる（実測）。
		// ただし null（作成画面の新規行）のときは渡さない。
		return row.id === undefined || row.id === null
			? { value: inner }
			: { id: row.id, value: inner };
	});
};

/**
 * フィールド 1 つを変換する。除くべきものは undefined を返す。
 *
 * サブテーブルの行だけを変換したいときのために公開する。
 * 一括変換しか無いと、テーブル 1 行だけを扱うコードが書けない。
 */
export const convertField = (
	field: LooseField,
): { value: unknown } | undefined => {
	if (isExcludedOnWrite(field.type)) return undefined;
	return { value: convertValue(field) };
};

/**
 * レコード全体を変換する。
 *
 * ```ts
 * const { record, id, revision } = toRestWrite(event.record);
 * await client.record.updateRecord({ app, id, revision, record });
 * ```
 */
export const toRestWrite = (record: LooseRecord): RestWriteParams => {
	const out: RestWriteRecord = {};
	let id: string | undefined;
	let revision: string | undefined;

	for (const [code, field] of Object.entries(record)) {
		if (field === undefined || field === null) continue;

		if (field.type === "__ID__") {
			id = typeof field.value === "string" ? field.value : undefined;
			continue;
		}
		if (field.type === "__REVISION__") {
			revision = typeof field.value === "string" ? field.value : undefined;
			continue;
		}

		const converted = convertField(field);
		if (converted === undefined) continue;

		// 値が設定されたことのないフィールド（Editing の undefined）は送らない
		if (converted.value === undefined) continue;

		out[code] = converted;
	}

	return {
		record: out,
		...(id === undefined ? {} : { id }),
		...(revision === undefined ? {} : { revision }),
	};
};

/**
 * 読み取り方向の正規化。UI のレコードを REST 相当の形にする。
 *
 * UI 専用プロパティと、値が未設定のフィールドを除く。
 * REST の型（Canonical）として扱えるようにするのが目的で、
 * 書き込みには toRestWrite を使う。
 */
export const toRest = (record: LooseRecord): { [code: string]: unknown } => {
	const out: { [code: string]: unknown } = {};

	for (const [code, field] of Object.entries(record)) {
		if (field === undefined || field === null) continue;
		if (field.value === undefined) continue;

		const cleaned: { [key: string]: unknown } = {};
		for (const [key, value] of Object.entries(field)) {
			if (uiOnly.has(key)) continue;
			cleaned[key] = value;
		}
		cleaned.value = convertValue(field);
		out[code] = cleaned;
	}

	return out;
};

/**
 * updateRecord にそのまま渡せるパラメータを作る。
 *
 * `toRestWrite` の戻りを分解して `updateRecord` に渡そうとすると、
 * `revision` が `string | undefined` になって
 * `exactOptionalPropertyTypes` の下では代入できない。
 * その煩わしさを利用者に押し付けないための補助。
 *
 * ```ts
 * await client.record.updateRecord(toUpdateParams(app, event.record));
 * ```
 *
 * `$id` を持たないレコード（作成画面など）を渡すと例外を投げる。
 * 更新先が決まらないまま呼ばれているので、続けても意味がない。
 */
export const toUpdateParams = <App extends string | number>(
	app: App,
	record: LooseRecord,
): {
	app: App;
	id: string;
	record: RestWriteRecord;
	revision?: string;
} => {
	const { record: converted, id, revision } = toRestWrite(record);
	if (id === undefined) {
		throw new Error(
			"レコードに $id がありません。更新対象を特定できないため、id を明示して updateRecord を呼んでください。",
		);
	}
	return {
		app,
		id,
		record: converted,
		...(revision === undefined ? {} : { revision }),
	};
};

/** addRecord にそのまま渡せるパラメータを作る */
export const toAddParams = <App extends string | number>(
	app: App,
	record: LooseRecord,
): { app: App; record: RestWriteRecord } => ({
	app,
	record: toRestWrite(record).record,
});
