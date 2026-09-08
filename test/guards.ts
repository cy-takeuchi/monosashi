import * as guard from "../src/guard/record";
import type { LooseField } from "../src/types/loose";
import type { ObservedFieldType } from "./fieldTypes";

/**
 * 種別からガードを引く表。**28 種別を書き下す**。
 *
 * ## なぜ名前から導出しないのか
 *
 * ガードの名前は `type` から機械的に決まるので、
 * `SINGLE_LINE_TEXT` → `isSingleLineText` と文字列操作で引くこともできる。
 * 実際そう書いていたが、やめた。
 *
 * - **リポジトリの方針に反する。** 型 / `VALUE_SHAPE` / ガード / 構築子は
 *   全 28 種別を書き下している（DECISIONS Q3）。テストだけ導出する理由が無い
 * - **型検査が消える。** `guards[name]` は
 *   `{ [key: string]: unknown }` へのキャストが要る。
 *   ガードを消しても名前を変えても、**実行するまで気づけない**
 * - 例外が 4 つあり（`DROP_DOWN` → `isDropdown` など）、
 *   結局その表を持つことになる。だったら全部を表にするほうが短い
 *
 * `Record<ObservedFieldType, ...>` にしてあるので、
 * **種別を足して書き忘れると `tsc` が落ちる**。
 * 実行時ではなくコンパイル時に気づける。
 *
 * ## `isLookup` と `hasValue` が入っていない理由
 *
 * この 2 つは `type` で判定していないため。
 *
 * - `isLookup` ... ルックアップのキーフィールドの `type` は
 *   元フィールドの型そのもの（`SINGLE_LINE_TEXT` や `NUMBER`）で、
 *   **通常のフィールドと区別がつかない**。
 *   JS API 側だけが持つ `confirmed` / `recordId` の有無で判別する（実測）
 * - `hasValue` ... `value !== undefined` を見る。種別に紐づかない
 *
 * 種別ごとの検査の対象にならないので、個別にテストする。
 */
export const GUARD_OF: Record<
	ObservedFieldType,
	(field: LooseField | undefined | null) => boolean
> = {
	RECORD_NUMBER: guard.isRecordNumber,
	__ID__: guard.isId,
	__REVISION__: guard.isRevision,
	CREATOR: guard.isCreator,
	MODIFIER: guard.isModifier,
	CREATED_TIME: guard.isCreatedTime,
	UPDATED_TIME: guard.isUpdatedTime,
	STATUS: guard.isStatus,
	STATUS_ASSIGNEE: guard.isStatusAssignee,
	CATEGORY: guard.isCategory,
	SINGLE_LINE_TEXT: guard.isSingleLineText,
	MULTI_LINE_TEXT: guard.isMultiLineText,
	RICH_TEXT: guard.isRichText,
	NUMBER: guard.isNumber,
	CALC: guard.isCalc,
	LINK: guard.isLink,
	CHECK_BOX: guard.isCheckBox,
	RADIO_BUTTON: guard.isRadioButton,
	MULTI_SELECT: guard.isMultiSelect,
	DROP_DOWN: guard.isDropdown,
	DATE: guard.isDate,
	TIME: guard.isTime,
	DATETIME: guard.isDateTime,
	FILE: guard.isFile,
	USER_SELECT: guard.isUserSelect,
	ORGANIZATION_SELECT: guard.isOrganizationSelect,
	GROUP_SELECT: guard.isGroupSelect,
	SUBTABLE: guard.isSubtable,
};
