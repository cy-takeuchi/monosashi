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
	field,
	guard,
	type LooseRecord,
	type SavedRecord,
	setValue,
	toAddParams,
	toRestWrite,
	toUpdateParams,
} from "../../dist/index";
import type { Rest, RestRecord } from "../../dist/rest";

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
// Rest は本体ではなく kintone-record/rest にある。
// 型しか使わない利用者に @kintone/rest-api-client を背負わせないため
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
