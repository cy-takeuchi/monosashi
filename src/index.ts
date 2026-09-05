/**
 * kintone-record
 *
 * 実測に基づく kintone レコードの型・変換関数・構築 API。
 *
 * 型は `fixtures/measured.json` の実測に基づく。
 * これは e2e（`e2e/collect.spec.ts`）が実 kintone から採り、
 * `pnpm run fixture:build` が正規化したもので、**毎回採り直せる**。
 * 変換の挙動は REST への書き込み 20 ケースの実測に基づく
 * （`fixtures/write-behavior.md`）。
 * 実測の裏づけが無いものは JSDoc に明記してある。
 */

// --- 型 ---
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
	Rest,
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
export type { RestRecord, RestRecordWithMeta } from "./types/rest";
