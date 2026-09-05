/**
 * kintone-record
 *
 * 実測に基づく kintone レコードの型・変換関数・構築 API。
 *
 * 型は `fixtures/measured.json` の実測に基づく。
 * これは e2e（`e2e/collect.spec.ts`）が実 kintone から採り、
 * `pnpm run fixture:build` が正規化したもので、**毎回採り直せる**。
 * REST API の型は `kintone-record/rest` から読む（本体には含まれない）。
 * 変換の挙動は REST への書き込み 20 ケースの実測に基づく
 * （`fixtures/write-behavior.md`）。
 * 実測の裏づけが無いものは JSDoc に明記してある。
 */

// --- 型 ---
// REST API の型（`Rest` / `RestRecord` / `RestRecordWithMeta`）は
// `kintone-record/rest` にある。**本体からは出さない。**
// あそこだけが @kintone/rest-api-client を必要とするので、
// 型しか使わない利用者に実行時依存を背負わせないため（理由は src/rest.ts）。
// --- 構築・代入 ---
export { field } from "./build/field";
export {
	canSetValue,
	FieldValueError,
	setRowValue,
	setValue,
} from "./build/setValue";
// --- 変換 ---
export {
	IGNORED_ON_WRITE,
	isDroppedOnWrite,
	isRejectedOnWrite,
	REJECTED_ON_WRITE,
	UI_ONLY_PROPERTIES,
} from "./convert/fieldTypes";
export type {
	RestWriteParams,
	RestWriteRecord,
} from "./convert/toRestWrite";
export {
	convertField,
	toAddParams,
	toRest,
	toRestWrite,
	toUpdateParams,
} from "./convert/toRestWrite";
// --- 型ガード ---
export * as guard from "./guard/record";
export type {
	ChangeEvent,
	CreateShowEvent,
	CreateSubmitEvent,
	DeleteSubmitEvent,
	DetailShowEvent,
	EditChangeEvent,
	EditShowEvent,
	EditSubmitEvent,
	EventOf,
	IndexEditChangeEvent,
	IndexEditSubmitEvent,
	IndexShowEvent,
	KintoneEventMap,
	KintoneEventName,
	PlainEvent,
	ProcessProceedEvent,
	SubmitSuccessEvent,
	UnknownKintoneEvent,
} from "./types/event";
// 型のみの名前空間なので type 付きで再エクスポートする
export type {
	Editing,
	Entity,
	FieldOf,
	FileInformation,
	Saved,
} from "./types/field";
// 変換・代入・ガードの入力型。3 文脈のどのレコードも受け取れる緩い型で、
// 自前のヘルパを書くときに同じ骨格を再定義しなくて済むよう公開する
export type {
	LooseField,
	LooseRecord,
	LooseSubtableRow,
} from "./types/loose";
export type {
	CreateRecord,
	EditingRecord,
	SavedRecord,
} from "./types/record";
