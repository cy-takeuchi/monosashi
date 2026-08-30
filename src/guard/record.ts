import type { Editing, Saved } from "../types/field";
import type { LooseField } from "../types/loose";

/**
 * レコードのフィールドを絞り込む型ガード。
 *
 * ## 3 文脈をまたいで使える理由
 *
 * `Saved` / `Editing` / `Rest` は value の型が違うが、`type` の値は同じ。
 * ガードの入力を「type と value を持つもの」に広げ、
 * 絞り込み先を入力の型から決めることで、どの文脈のレコードにも使える。
 *
 * kintone-typeguard は 4 つの名前空間の直積を
 * `FFF<A, B, C, D>` という型合成で扱おうとしていたが、
 * ホバー表示とエラーメッセージが読めなくなっていた。
 * ここではジェネリクスで入力の型をそのまま保つ。
 *
 * ## ルックアップだけは type で判別できない
 *
 * ルックアップのキーフィールドの `type` は
 * 元フィールドの型そのもの（`SINGLE_LINE_TEXT` や `NUMBER`）で、
 * 通常のフィールドと区別がつかない。
 * JS API 側だけが持つ `confirmed` / `recordId` の有無で判別する（実測）。
 */

/**
 * 入力の型を保ったまま、指定した type のものに絞り込む。
 *
 * ユニオンから該当メンバーを取り出すのが基本だが、
 * 入力が `{ type: string }` のような緩い型のときは Extract が never になり
 * 絞り込みが機能しなくなる。プラグインのコードでは
 * 緩い型のレコードを扱う場面が多いので、その場合は交差型に倒す。
 */
type Narrow<T, Type extends string> = [Extract<T, { type: Type }>] extends [
	never,
]
	? T & { type: Type }
	: Extract<T, { type: Type }>;

const is =
	<Type extends string>(type: Type) =>
	<T extends LooseField>(
		field: T | undefined | null,
	): field is Narrow<T, Type> =>
		field !== undefined && field !== null && field.type === type;

export const isRecordNumber = is("RECORD_NUMBER");
export const isId = is("__ID__");
export const isRevision = is("__REVISION__");
export const isCreator = is("CREATOR");
export const isModifier = is("MODIFIER");
export const isCreatedTime = is("CREATED_TIME");
export const isUpdatedTime = is("UPDATED_TIME");
export const isStatus = is("STATUS");
export const isStatusAssignee = is("STATUS_ASSIGNEE");
export const isCategory = is("CATEGORY");

export const isSingleLineText = is("SINGLE_LINE_TEXT");
export const isMultiLineText = is("MULTI_LINE_TEXT");
export const isRichText = is("RICH_TEXT");
export const isNumber = is("NUMBER");
export const isCalc = is("CALC");
export const isLink = is("LINK");
export const isCheckBox = is("CHECK_BOX");
export const isRadioButton = is("RADIO_BUTTON");
export const isMultiSelect = is("MULTI_SELECT");
export const isDropdown = is("DROP_DOWN");
export const isDate = is("DATE");
export const isTime = is("TIME");
export const isDateTime = is("DATETIME");
export const isFile = is("FILE");
export const isUserSelect = is("USER_SELECT");
export const isOrganizationSelect = is("ORGANIZATION_SELECT");
export const isGroupSelect = is("GROUP_SELECT");
export const isSubtable = is("SUBTABLE");

/**
 * ルックアップのキーフィールドかどうか。
 *
 * `type` では判別できないので `confirmed` と `recordId` の有無で見る。
 * REST から取得したレコードでは常に false になる（これらのキーが無いため）。
 *
 * ```ts
 * if (isLookup(record.顧客コード)) {
 *   record.顧客コード.confirmed;  // boolean
 *   record.顧客コード.recordId;   // string | null
 * }
 * ```
 */
export const isLookup = (
	field: LooseField | undefined | null,
): field is Saved.Lookup | Editing.Lookup =>
	field !== undefined &&
	field !== null &&
	"confirmed" in field &&
	"recordId" in field;

/**
 * 値が設定されたことのあるフィールドかどうか。
 *
 * `Editing`（作成・編集画面の get() と change / submit）では
 * 一度も値が設定されていないフィールドの value が undefined になる（実測）。
 * これを絞り込むためのガード。
 *
 * ```ts
 * const field = record[code];
 * if (isSingleLineText(field) && hasValue(field)) {
 *   field.value.trim();  // string に絞り込まれる
 * }
 * ```
 */
export const hasValue = <T extends LooseField>(
	field: T | undefined | null,
): field is T & { value: Exclude<T["value"], undefined> } =>
	field !== undefined && field !== null && field.value !== undefined;
