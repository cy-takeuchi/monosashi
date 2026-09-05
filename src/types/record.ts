import type { Editing, Saved } from "./field";

/**
 * レコード型。
 *
 * ## Rest を Canonical に据える
 *
 * `@kintone/rest-api-client` の `KintoneRecordField` が実測と一致することを確認済み
 * （DROP_DOWN / DATE / TIME が `string | null`）。
 * 新しい正規形を作らず、既にあるものを Canonical と宣言する。
 *
 * kintone-typeguard の `Unified` namespace は同じことをしていたが、
 * 55 ファイル中 0 箇所でしか使われていなかった。
 * Canonical を「追加の選択肢」として置いても使われないので、既定の型に据える。
 *
 * ## インデックスシグネチャを交差型にしない
 *
 * kintone-typeguard は `{ $id?: ID } & { [key: string]: OneOf }` の交差型だが、
 * これはユニオンへの書き込みが無検査になるという問題を持つ
 * （`r["数値"].value = ["配列"]` が tsc --strict を通る）。
 * ここでは $id / $revision もインデックスシグネチャに含め、
 * 安全な書き込みは代入 API 側で担保する。
 */

/** 詳細画面 / 一覧画面 / edit.show / submit.success のレコード */
export type SavedRecord = {
	[fieldCode: string]: Saved.OneOf;
};

/** 作成・編集画面の get() と change / submit のレコード */
export type EditingRecord = {
	[fieldCode: string]: Editing.OneOf;
};

/**
 * 作成画面のレコード。
 *
 * システムフィールドを持たない（実測: 作成画面 28 フィールド / それ以外 37 フィールド）。
 * $id / $revision も存在しない。
 * ただしカテゴリーだけは作成画面にも存在する。
 */
export type CreateRecord = {
	[fieldCode: string]: Exclude<
		Editing.OneOf,
		| Editing.RecordNumber
		| Editing.Id
		| Editing.Revision
		| Editing.Creator
		| Editing.Modifier
		| Editing.CreatedTime
		| Editing.UpdatedTime
		| Editing.Status
		| Editing.StatusAssignee
	>;
};
