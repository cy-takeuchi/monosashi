import type { Entity, FileInformation } from "../types/field";

/**
 * フィールドを組み立てる。
 *
 * ## なぜ変換関数だけでは足りないのか
 *
 * 実在のプラグイン群のレコード入出力を全て洗った結果、
 * 変換でカバーできるのは一部だけだった。残りは「構築」と「代入」で、
 * そこが最も危険な領域だった（Q8）。
 *
 * ```ts
 * record[latField] = { value: lat.toString(), type: "NUMBER" } as kintoneRecordFieldEvent.Number;
 * } as kintoneRecordFieldSet.File,
 * ```
 *
 * これらの `as` は現行の型では**外しても通る**。
 * ただし通るのは型が正しいからではなく、
 * ユニオンへの書き込みを TypeScript が検査しないため。
 * 実際 `r["数値"].value = ["配列"]` も `tsc --strict` を通ってしまう。
 *
 * 構築子を通せば、値の型がフィールド種別と結びつくのでその穴が塞がる。
 */

export const field = {
	singleLineText: (value: string) =>
		({ type: "SINGLE_LINE_TEXT", value }) as const,

	multiLineText: (value: string) =>
		({ type: "MULTI_LINE_TEXT", value }) as const,

	richText: (value: string) => ({ type: "RICH_TEXT", value }) as const,

	/**
	 * 数値。
	 *
	 * kintone は数値フィールドも文字列で扱うため、number を渡せるようにする。
	 * `lat.toString()` を毎回書くのは間違いのもとで、
	 * 実際、調査したプラグイン群ではその形が `as` とセットで散在していた。
	 */
	number: (value: number | string) =>
		({ type: "NUMBER", value: String(value) }) as const,

	link: (value: string) => ({ type: "LINK", value }) as const,

	checkBox: (value: string[]) => ({ type: "CHECK_BOX", value }) as const,

	radioButton: (value: string) => ({ type: "RADIO_BUTTON", value }) as const,

	multiSelect: (value: string[]) => ({ type: "MULTI_SELECT", value }) as const,

	dropdown: (value: string | null) => ({ type: "DROP_DOWN", value }) as const,

	/** 日付。`YYYY-MM-DD` または null */
	date: (value: string | null) => ({ type: "DATE", value }) as const,

	/** 時刻。`HH:mm` または null */
	time: (value: string | null) => ({ type: "TIME", value }) as const,

	/** 日時。ISO8601 の UTC */
	dateTime: (value: string) => ({ type: "DATETIME", value }) as const,

	/**
	 * 添付ファイル。
	 *
	 * 書き込みは fileKey だけでよい。
	 * 読み取った FileInformation をそのまま渡しても kintone は受け付けるが
	 * （実測）、送信するものを最小限にするため fileKey だけを取る。
	 */
	file: (value: { fileKey: string }[] | FileInformation[]) =>
		({
			type: "FILE",
			value: value.map(({ fileKey }) => ({ fileKey })),
		}) as const,

	userSelect: (value: { code: string }[] | Entity[]) =>
		({
			type: "USER_SELECT",
			value: value.map(({ code }) => ({ code })),
		}) as const,

	organizationSelect: (value: { code: string }[] | Entity[]) =>
		({
			type: "ORGANIZATION_SELECT",
			value: value.map(({ code }) => ({ code })),
		}) as const,

	groupSelect: (value: { code: string }[] | Entity[]) =>
		({
			type: "GROUP_SELECT",
			value: value.map(({ code }) => ({ code })),
		}) as const,

	/**
	 * サブテーブルの行。
	 *
	 * id を渡すと既存の行の更新、省略すると新規行になる。
	 * **既存の行を更新するときに id を落とすと、その行は置き換わって
	 * 新しい id が振られる**（実測）。意図せず落とさないよう明示的に受け取る。
	 */
	subtableRow: <
		T extends { [fieldCode: string]: { type: string; value: unknown } },
	>(
		value: T,
		id?: string,
		// 戻り値の型は明示する。推論に任せると
		// `{ value: T; id?: never } | { id: string; value: T }` になり、
		// この形は tsc のバージョンによって .d.ts への出力が変わる。
		// 実際 TypeScript 7 は `id?: never` を落とすため、
		// ビルド後のパッケージでは row.id が読めなくなっていた。
		// 公開 API の形をコンパイラの推論に委ねない。
	): { id?: string; value: T } =>
		id === undefined ? { value } : { id, value },

	subtable: <
		T extends { [fieldCode: string]: { type: string; value: unknown } },
	>(
		rows: { id?: string; value: T }[],
	) => ({ type: "SUBTABLE", value: rows }) as const,
} as const;
