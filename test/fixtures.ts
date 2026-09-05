import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Probed } from "../src/probe/serialize";
import type { ProbeStore, Sample } from "../src/probe/store";

/**
 * 凍結した実測フィクスチャを読み、走査するための共通処理。
 *
 * 実 kintone には接続しない。フィクスチャに対してだけ走るので高速で、
 * PR ごとに回しても壊れない（Q6）。
 * ライブ検証は別立てで、そちらが差分を検出したらフィクスチャを更新する。
 */

export const loadSamples = (dir = "fixtures"): Sample[] =>
	readdirSync(dir)
		.filter((name) => name.endsWith(".json"))
		.flatMap((name) => {
			const store = JSON.parse(
				readFileSync(join(dir, name), "utf8"),
			) as ProbeStore;
			return store.samples;
		});

/** サーバから来た正規化済みのレコードを持つ文脈 */
export const isSavedContext = (sample: Sample): boolean => {
	const { event, source } = sample;
	if (source.startsWith("rest.")) return false;
	if (event.endsWith(".detail.show")) return true;
	if (event.endsWith(".index.show")) return true;
	// 削除イベントの record はサーバ由来（実測 2026-09-05）
	if (event.endsWith(".delete.submit")) return true;
	// **モバイルの編集画面だけ例外。** PC の編集画面はサーバ由来だが、
	// モバイルは値の無いフィールドが undefined になる（2026-09-05 実測）。
	// 同じ待ち方で採ったモバイルの詳細画面は PC と同形だったので、
	// 読み込み途中を拾ったわけではない
	if (event === "mobile.app.record.edit.show") return false;
	if (event.endsWith(".edit.show")) return true;
	if (event.endsWith(".submit.success")) return true;
	return event === "screen.detail" || event === "screen.index";
};

/** クライアント側のレコードモデルを持つ文脈 */
export const isEditingContext = (sample: Sample): boolean => {
	const { event, source } = sample;
	if (source.startsWith("rest.")) return false;
	if (event.includes(".change.")) return true;
	if (event.endsWith(".submit")) return true;
	if (event.endsWith(".create.show")) return true;
	// モバイルの編集画面は作成画面と同じ形（isSavedContext のコメント参照）
	if (event === "mobile.app.record.edit.show") return true;
	return event.startsWith("screen.create") || event.startsWith("screen.edit");
};

export const isRestContext = (sample: Sample): boolean =>
	sample.source.startsWith("rest.");

export type FieldEntry = { code: string; type: string; field: Probed };

/** レコードを走査してフィールドを列挙する。サブテーブル内も含む */
export const fieldsOf = (data: Probed): FieldEntry[] => {
	const out: FieldEntry[] = [];
	const walk = (node: Probed): void => {
		if (node.k === "array") {
			for (const item of node.items) walk(item);
			return;
		}
		if (node.k !== "object") return;
		for (const code of node.keys) {
			const field = node.props[code];
			if (field === undefined || field.k !== "object") continue;
			const typeProbe = field.props.type;
			if (typeProbe === undefined || typeProbe.k !== "string") continue;
			out.push({ code, type: typeProbe.v, field });

			if (typeProbe.v !== "SUBTABLE") continue;
			const rows = field.props.value;
			if (rows === undefined || rows.k !== "array") continue;
			for (const row of rows.items) {
				if (row.k !== "object") continue;
				const inner = row.props.value;
				if (inner !== undefined) walk(inner);
			}
		}
	};
	walk(data);
	return out;
};

export const fieldValue = (field: Probed): Probed | undefined =>
	field.k === "object" ? field.props.value : undefined;
