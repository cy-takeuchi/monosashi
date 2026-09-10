/**
 * ビルド成果物（dist）を利用者と同じ立場から型検査する。
 *
 * ## なぜ src のテストでは足りないか
 *
 * `.d.ts` への出力は型推論とは別の処理で、**推論結果を保てないことがある**。
 * 実際 TypeScript 7 へ上げたとき、`field.subtableRow` の戻り値から
 * `id?: never` が落ち、`row.id` が読めなくなった。
 * src に対する tsc も vitest の型テストも全て通ったまま、
 * パッケージを入れた利用者側だけが壊れる状態だった。
 *
 * ここは `pnpm run build` の一部として走る（build:check）。
 * dist が無いと落ちるので、通常の tsconfig からは除外してある。
 */

// グローバル拡張はこの副作用 import でのみ有効になる
import "../../dist/kintone";
import {
	type EditingRecordWithMeta,
	field,
	guard,
	type LooseRecord,
	type Rest,
	type RestRecord,
	type RestWriteRecord,
	type SavedRecord,
	type SavedRecordWithMeta,
	setValue,
	toAddParams,
	toRestWrite,
	toUpdateParams,
} from "../../dist/index";

// --- 構築 ---
const num: { type: "NUMBER"; value: string } = field.number(12.5);
const text: { type: "SINGLE_LINE_TEXT"; value: string } =
	field.singleLineText("a");

// サブテーブルの行は id を読めること。
// TS 7 の宣言出力でここが壊れた
const newRow = field.subtableRow({ n: num });
const existingRow = field.subtableRow({ n: num }, "42");
const rowId: string | undefined = newRow.id;
const table = field.subtable([newRow, existingRow]);

// --- 変換 ---
// REST のレコード型もサブパスから読める
declare const restRecord: RestRecord;

const record: LooseRecord = {
	$id: { type: "__ID__", value: "1" },
	text,
	table,
};
const { record: converted, id, revision } = toRestWrite(record);
const update: { app: string; id: string } = toUpdateParams("1", record);
const add: { app: string } = toAddParams("1", record);

// $id / $revision を保証する型は .d.ts の出力でも交差型が保たれること。
// ここが崩れると $id.value が 28 種別の合併型に戻り、
// 利用者側でだけ updateRecord に渡せなくなる（#34）
declare const savedWithMeta: SavedRecordWithMeta;
declare const editingWithMeta: EditingRecordWithMeta;
const savedId: string = savedWithMeta.$id.value;
const savedRevision: string = savedWithMeta.$revision.value;
const editingId: string = editingWithMeta.$id.value;
const editingRevision: string = editingWithMeta.$revision.value;

// 手書きのリテラルが余剰プロパティで弾かれないこと（#33）。
// field.*() を経由するかどうかで結果が変わらない
const writeRecord: RestWriteRecord = {
	viaBuilder: field.file([{ fileKey: "x" }]),
	byHand: { type: "FILE", value: [{ fileKey: "x" }] },
	valueOnly: { value: "x" },
};

// --- 代入 ---
setValue(record, "text", "b");

// --- ガード ---
// SavedRecord のような素性のわかるレコードでは value まで絞り込まれる
declare const saved: SavedRecord;
const cell = saved.n;
if (guard.isNumber(cell)) {
	const v: string = cell.value;
	console.log(v);
}
// 緩いレコードでは type だけが絞り込まれ、value は unknown のまま。
// 何のフィールドか型から決まらないので、これが正しい挙動
const loose = record.text;
if (guard.isSingleLineText(loose) && guard.hasValue(loose)) {
	const t: string = loose.type;
	console.log(t);
}

// --- 3 文脈の名前空間が揃っていること ---
// Rest も本体から出る。自前で持っているので外部依存は要らない
declare const restNumber: Rest.Number;
declare const restDropdown: Rest.SingleLineText;
console.log(restNumber.value, restDropdown.value);

// --- グローバル宣言は明示的に取り込んだときだけ効く ---
// index を import しただけでは kintone グローバルは生えない（意図的）。
// サーバサイドで toRestWrite だけ使う利用者に、実行時に存在しないものを
// 型で保証してしまわないため。
kintone.events.on("app.record.detail.show", (event) => {
	const recordId: number = event.recordId;
	console.log(recordId, event.record);
	return event;
});

console.log(rowId, converted, id, revision, update, add, restRecord);

console.log(
	savedId,
	savedRevision,
	editingId,
	editingRevision,
	Object.keys(writeRecord),
);
