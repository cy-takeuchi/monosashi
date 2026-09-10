import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { field, setValue, toRestWrite, toUpdateParams } from "../src/index";

/**
 * JS API で取得したレコードを REST API に渡す。
 * プラグイン開発で最も多い流れ。
 */

// --- 1. もっとも単純な形 -----------------------------------------------------

export const saveCurrentRecord = async (app: string) => {
	const client = new KintoneRestAPIClient();

	// events.on の中では get() が動かないので、ボタンのクリックなどから呼ぶ
	const got = kintone.app.record.get();
	if (got === null) return;

	// record は EditingRecord。未入力フィールドの value は undefined になりうる。
	// toUpdateParams が $id / $revision の取り出しまでやる
	await client.record.updateRecord(toUpdateParams(app, got.record));
};

// --- 2. 値を書き換えてから保存する -------------------------------------------

export const updatePosition = async (
	app: string,
	latField: string,
	lngField: string,
	lat: number,
	lng: number,
) => {
	const client = new KintoneRestAPIClient();
	const got = kintone.app.record.get();
	if (got === null) return;

	// 型と合わない値はここで止まる。
	// 現行の kintone-typeguard では ["配列"] を入れても tsc を通ってしまう
	setValue(got.record, latField, lat.toString());
	setValue(got.record, lngField, lng.toString());

	await client.record.updateRecord(toUpdateParams(app, got.record));
};

// --- 3. 一部のフィールドだけを送る（取得したレコードを使わない） --------------

export const updateSomeFields = async (
	app: string,
	id: string,
	latField: string,
	lat: number,
) => {
	const client = new KintoneRestAPIClient();

	// 構築 API を使えば as が要らない。
	// number を渡せるので lat.toString() を書く必要もない
	const { record } = toRestWrite({
		[latField]: field.number(lat),
	});

	await client.record.updateRecord({ app, id, record });
};

// --- 4. イベントのレコードをそのまま REST へ ---------------------------------

kintone.events.on("app.record.detail.show", (event) => {
	// event.record は SavedRecord。recordId は number
	const { record, id, revision } = toRestWrite(event.record);
	void { record, id, revision, appId: event.appId, recordId: event.recordId };
	return event;
});

// --- 5. 一括更新 -----------------------------------------------------------

export const updateAllPositions = async (
	app: string,
	pins: { recordId: string; revision: string; x: number; y: number }[],
	xField: string,
	yField: string,
) => {
	const client = new KintoneRestAPIClient();

	// toRestWrite は同期の純粋関数なので、ループ内で呼んでも API を叩かない
	const records = pins.map((pin) => ({
		id: pin.recordId,
		revision: pin.revision,
		record: toRestWrite({
			[xField]: field.number(Math.floor(pin.x)),
			[yField]: field.number(Math.floor(pin.y)),
		}).record,
	}));

	await client.record.updateAllRecords({ app, records });
};

// --- 6. サブテーブルの行を保ったまま更新 -------------------------------------

export const updateTableRow = async (
	app: string,
	tableCode: string,
	cellCode: string,
	value: string,
) => {
	const client = new KintoneRestAPIClient();
	const got = kintone.app.record.get();
	if (got === null) return;

	const table = got.record[tableCode];
	if (table?.type !== "SUBTABLE") return;

	// 行の value を書き換える。id は toRestWrite が保持するので、
	// 既存の行が置き換わってしまうことがない
	for (const row of table.value) {
		setValue(row.value, cellCode, value);
	}

	await client.record.updateRecord(toUpdateParams(app, got.record));
};
