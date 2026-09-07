/**
 * レコードのフィールド値を型安全に書き換える。
 *
 * ## なぜ必要か
 *
 * kintone-typeguard の Record 型は書き込みを一切検査していない。
 * 以下はすべて `tsc --strict` を通ってしまう（実測）。
 *
 * ```ts
 * r["数値"].value = ["これは", "配列"];        // NUMBER に配列
 * r["チェックボックス"].value = "配列であるべき"; // CHECK_BOX に文字列
 * r["数値"] = { type: "CHECK_BOX", value: [] }; // 型ごと差し替え
 * ```
 *
 * TypeScript はユニオン型のプロパティ書き込みを
 * 「いずれかのメンバーに合えば可」で通すため、
 * フィールド種別をまたいだ代入が全部素通りする。
 * これは「as が必要で不便」なのではなく「何も検査していない」状態。
 *
 * 代入をこの関数に通せば、値の型がフィールドの実際の種別と照合される。
 *
 * ## 実行時に検査する理由
 *
 * フィールドコードが `string` の動的なケースでは、
 * 型だけでは何のフィールドか決まらない。
 * プラグイン設定でフィールドコードを受け取る実装では
 * これが常態なので、実行時の照合が要る。
 */

import type { LooseRecord } from "../types/loose.js";

/** フィールド種別ごとに許される値の形 */
const VALUE_SHAPE: {
	[type: string]:
		| "string"
		| "nullableString"
		| "stringArray"
		| "entity"
		| "entityArray"
		| "fileArray"
		| "rows";
} = {
	SINGLE_LINE_TEXT: "string",
	MULTI_LINE_TEXT: "string",
	RICH_TEXT: "string",
	NUMBER: "string",
	LINK: "string",
	CALC: "string",
	RADIO_BUTTON: "string",
	DATETIME: "string",
	RECORD_NUMBER: "string",
	STATUS: "string",
	CREATED_TIME: "string",
	UPDATED_TIME: "string",
	__ID__: "string",
	__REVISION__: "string",
	CREATOR: "entity",
	MODIFIER: "entity",
	DROP_DOWN: "nullableString",
	DATE: "nullableString",
	TIME: "nullableString",
	CHECK_BOX: "stringArray",
	MULTI_SELECT: "stringArray",
	CATEGORY: "stringArray",
	USER_SELECT: "entityArray",
	ORGANIZATION_SELECT: "entityArray",
	GROUP_SELECT: "entityArray",
	STATUS_ASSIGNEE: "entityArray",
	FILE: "fileArray",
	SUBTABLE: "rows",
};

const isEntityLike = (value: unknown): boolean =>
	typeof value === "object" && value !== null && "code" in value;

const isFileLike = (value: unknown): boolean =>
	typeof value === "object" && value !== null && "fileKey" in value;

const isRowLike = (value: unknown): boolean =>
	typeof value === "object" && value !== null && "value" in value;

const matches = (shape: string, value: unknown): boolean => {
	switch (shape) {
		case "string":
			return typeof value === "string";
		case "nullableString":
			return typeof value === "string" || value === null;
		case "stringArray":
			return Array.isArray(value) && value.every((v) => typeof v === "string");
		case "entity":
			return isEntityLike(value);
		case "entityArray":
			return Array.isArray(value) && value.every(isEntityLike);
		case "fileArray":
			return Array.isArray(value) && value.every(isFileLike);
		case "rows":
			return Array.isArray(value) && value.every(isRowLike);
		default:
			return true;
	}
};

export class FieldValueError extends Error {
	constructor(
		readonly fieldCode: string,
		readonly fieldType: string,
		readonly received: unknown,
	) {
		super(
			`フィールド ${fieldCode}（${fieldType}）に ${describe(received)} は代入できません`,
		);
		this.name = "FieldValueError";
	}
}

const describe = (value: unknown): string => {
	if (value === null) return "null";
	if (value === undefined) return "undefined";
	if (Array.isArray(value)) return `配列(${value.length}件)`;
	return typeof value;
};

/**
 * 値を代入する。フィールド種別と合わない値は例外を投げる。
 *
 * ```ts
 * setValue(record, "数値", "123");        // OK
 * setValue(record, "数値", ["配列"]);      // FieldValueError
 * setValue(record, "存在しない", "x");     // FieldValueError
 * ```
 */
export const setValue = (
	record: LooseRecord,
	fieldCode: string,
	value: unknown,
): void => {
	const field = record[fieldCode];
	if (field === undefined) {
		throw new FieldValueError(fieldCode, "(存在しない)", value);
	}

	const shape = VALUE_SHAPE[field.type];
	// 未知の type は素通しする。kintone が新しい種別を追加したときに
	// このライブラリが利用者をブロックしないため
	if (shape !== undefined && !matches(shape, value)) {
		throw new FieldValueError(fieldCode, field.type, value);
	}

	field.value = value;
};

/**
 * 代入できるかを判定する。例外を投げたくない場面向け。
 */
export const canSetValue = (
	record: LooseRecord,
	fieldCode: string,
	value: unknown,
): boolean => {
	const field = record[fieldCode];
	if (field === undefined) return false;
	const shape = VALUE_SHAPE[field.type];
	return shape === undefined || matches(shape, value);
};

/**
 * サブテーブルの行のセルに代入する。
 *
 * 実在のプラグインが `draft[tableField.code].value = initialValue` に
 * エラー抑制コメントを付けていた箇所に相当する。
 */
export const setRowValue = (
	row: { value: LooseRecord },
	fieldCode: string,
	value: unknown,
): void => {
	setValue(row.value, fieldCode, value);
};
