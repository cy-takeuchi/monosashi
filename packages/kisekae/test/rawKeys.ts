/**
 * `Raw` の各型が持つキーの一覧。
 *
 * ## なぜ表が要るのか
 *
 * 型は実行時に消えるので、**実測データと型を直接突き合わせられない。**
 * 表を挟んで 3 点を縛る。
 *
 * ```
 * Raw の型  ←→  この表  ←→  fixtures/form/definition.json
 *        rawKeys.test-d.ts   rawFixture.test.ts
 * ```
 *
 * 表だけを直しても `rawKeys.test-d.ts` が落ちる。
 * 型だけを直しても同じ。実測が変わったら `rawFixture.test.ts` が落ちる。
 * **3 つのうち 2 つが一致していても通らない**ので、写し間違いが残らない。
 *
 * tsumekae の `test/fieldTypes.ts` + `coverage.test.ts` / `coverage.test-d.ts` と
 * 同じ手口。あちらは 28 種別を 4 箇所に書き下すことを縛っている。
 *
 * ## ルックアップだけ type で引けない
 *
 * ルックアップのキーフィールドの `type` は `"SINGLE_LINE_TEXT"` か `"NUMBER"` で、
 * 通常のフィールドと同じ値。`type` では区別できないので `LOOKUP` という
 * 別のキーで持ち、判定は `"lookup" in property` で行う。
 */

/** `getFormFields` の `properties` に現れるフィールドのキー */
export const PROPERTY_KEYS = {
	RECORD_NUMBER: ["type", "code", "label", "noLabel"],
	CREATOR: ["type", "code", "label", "noLabel"],
	CREATED_TIME: ["type", "code", "label", "noLabel"],
	MODIFIER: ["type", "code", "label", "noLabel"],
	UPDATED_TIME: ["type", "code", "label", "noLabel"],
	CATEGORY: ["type", "code", "label", "enabled"],
	STATUS: ["type", "code", "label", "enabled"],
	STATUS_ASSIGNEE: ["type", "code", "label", "enabled"],
	SINGLE_LINE_TEXT: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"unique",
		"minLength",
		"maxLength",
		"expression",
		"hideExpression",
	],
	NUMBER: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"unique",
		"minValue",
		"maxValue",
		"digit",
		"displayScale",
		"unit",
		"unitPosition",
	],
	CALC: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"expression",
		"hideExpression",
		"format",
		"displayScale",
		"unit",
		"unitPosition",
	],
	MULTI_LINE_TEXT: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
	],
	RICH_TEXT: ["type", "code", "label", "noLabel", "required", "defaultValue"],
	LINK: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"unique",
		"minLength",
		"maxLength",
		"protocol",
	],
	CHECK_BOX: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"options",
		"align",
	],
	RADIO_BUTTON: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"options",
		"align",
	],
	DROP_DOWN: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"options",
	],
	MULTI_SELECT: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"options",
	],
	FILE: ["type", "code", "label", "noLabel", "required", "thumbnailSize"],
	DATE: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"unique",
		"defaultNowValue",
	],
	TIME: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"defaultNowValue",
	],
	DATETIME: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"unique",
		"defaultNowValue",
	],
	USER_SELECT: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"entities",
	],
	ORGANIZATION_SELECT: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"entities",
	],
	GROUP_SELECT: [
		"type",
		"code",
		"label",
		"noLabel",
		"required",
		"defaultValue",
		"entities",
	],
	GROUP: ["type", "code", "label", "noLabel", "openGroup"],
	REFERENCE_TABLE: ["type", "code", "label", "noLabel", "referenceTable"],
	SUBTABLE: ["type", "code", "label", "noLabel", "fields"],
	/** `type` では引けない。判定は `"lookup" in property` */
	LOOKUP: ["type", "code", "label", "noLabel", "required", "lookup"],
} as const satisfies Record<string, readonly string[]>;

/**
 * `getFormLayout` の行の中に現れる要素のキー。
 *
 * 多くは `type` / `code` / `size` だが、4 つだけ違う。
 *
 * | | 違い |
 * |---|---|
 * | `REFERENCE_TABLE` | `size` を持たない |
 * | `LABEL` | `code` を持たず `label` と `elementId` を持つ |
 * | `HR` | `code` を持たず `elementId` を持つ |
 * | `SPACER` | `code` を持たず `elementId` を持つ |
 *
 * `LABEL` / `HR` の `elementId` は**実測**（公式の型は宣言していない）。
 */
export const LAYOUT_ELEMENT_KEYS = {
	RECORD_NUMBER: ["type", "code", "size"],
	CREATOR: ["type", "code", "size"],
	CREATED_TIME: ["type", "code", "size"],
	MODIFIER: ["type", "code", "size"],
	UPDATED_TIME: ["type", "code", "size"],
	SINGLE_LINE_TEXT: ["type", "code", "size"],
	NUMBER: ["type", "code", "size"],
	CALC: ["type", "code", "size"],
	MULTI_LINE_TEXT: ["type", "code", "size"],
	RICH_TEXT: ["type", "code", "size"],
	LINK: ["type", "code", "size"],
	CHECK_BOX: ["type", "code", "size"],
	RADIO_BUTTON: ["type", "code", "size"],
	DROP_DOWN: ["type", "code", "size"],
	MULTI_SELECT: ["type", "code", "size"],
	FILE: ["type", "code", "size"],
	DATE: ["type", "code", "size"],
	TIME: ["type", "code", "size"],
	DATETIME: ["type", "code", "size"],
	USER_SELECT: ["type", "code", "size"],
	ORGANIZATION_SELECT: ["type", "code", "size"],
	GROUP_SELECT: ["type", "code", "size"],
	REFERENCE_TABLE: ["type", "code"],
	LABEL: ["type", "label", "elementId", "size"],
	HR: ["type", "elementId", "size"],
	SPACER: ["type", "elementId", "size"],
} as const satisfies Record<string, readonly string[]>;

/** `size` の中身。`innerHeight` が付くのは 2 種だけ */
export const LAYOUT_SIZE_KEYS = {
	default: ["width"],
	MULTI_LINE_TEXT: ["width", "innerHeight"],
	RICH_TEXT: ["width", "innerHeight"],
	SPACER: ["width", "height"],
} as const satisfies Record<string, readonly string[]>;

/** レイアウトのコンテナのキー */
export const LAYOUT_CONTAINER_KEYS = {
	ROW: ["type", "fields"],
	SUBTABLE: ["type", "code", "fields"],
	GROUP: ["type", "code", "layout"],
} as const satisfies Record<string, readonly string[]>;
