/**
 * 実測でレコードに現れたフィールド種別の一覧。**この一覧が唯一の基準**。
 *
 * ## なぜテスト側に置くのか
 *
 * `Saved` / `Editing` の型、`VALUE_SHAPE`、ガード、構築子は、
 * それぞれが全種別を書き下している。読みやすさを優先して
 * 条件型で導出しない方針を採っているので、この重複は意図的なもの（DECISIONS Q3）。
 *
 * 代わりに、ずれたら落ちる仕掛けをここに置く。
 * この一覧を軸に「フィクスチャ ↔ 一覧 ↔ 実装」の 3 方向を突き合わせるので、
 * kintone に種別が増えたときは
 *
 *   1. フィクスチャを採り直す → coverage.test.ts が「一覧に無い」で落ちる
 *   2. この一覧に足す → 型テストと網羅テストが「実装に無い」で落ちる
 *   3. 型 / VALUE_SHAPE / ガード / 構築子を足す
 *
 * の順に必ず気づける。
 *
 * GROUP と REFERENCE_TABLE は含まない。フォーム定義には存在するが
 * レコードには一度も現れないため（実測・field.test.ts で検証済み）。
 */
export const OBSERVED_FIELD_TYPES = [
	// システムフィールド
	"RECORD_NUMBER",
	"__ID__",
	"__REVISION__",
	"CREATOR",
	"MODIFIER",
	"CREATED_TIME",
	"UPDATED_TIME",
	"STATUS",
	"STATUS_ASSIGNEE",
	"CATEGORY",
	// 入力フィールド
	"SINGLE_LINE_TEXT",
	"MULTI_LINE_TEXT",
	"RICH_TEXT",
	"NUMBER",
	"CALC",
	"LINK",
	"CHECK_BOX",
	"RADIO_BUTTON",
	"MULTI_SELECT",
	"DROP_DOWN",
	"DATE",
	"TIME",
	"DATETIME",
	"FILE",
	"USER_SELECT",
	"ORGANIZATION_SELECT",
	"GROUP_SELECT",
	"SUBTABLE",
] as const;

export type ObservedFieldType = (typeof OBSERVED_FIELD_TYPES)[number];
