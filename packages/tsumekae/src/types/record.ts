import type { Editing, Saved } from "./field.js";

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
 * `$id` と `$revision` を必ず持つレコード。`RestRecordWithMeta` の Saved 版。
 *
 * ## なぜ要るか
 *
 * `SavedRecord` はインデックスシグネチャなので `record.$id.value` が
 * **28 種別の `value` の合併型**になり `string` に絞れない。
 * `updateRecord` の `id` に渡そうとすると型エラーになる。
 *
 * ```ts
 * declare const record: SavedRecordWithMeta;
 * await client.record.updateRecord({
 *   app, id: record.$id.value, revision: record.$revision.value, record: rest,
 * });
 * ```
 *
 * 詳細画面・一覧画面・`submit.success` のレコードは保存済みなので、
 * 実際には必ず持っている。**型がそれを表せていなかった。**
 *
 * ## 保存前のレコードには使えない
 *
 * 作成画面には `$id` / `$revision` が存在しない（`CreateRecord`）。
 * `change` / `submit` で保存前のレコードを扱うところでは使わない。
 */
export type SavedRecordWithMeta = SavedRecord & {
	$id: Saved.Id;
	$revision: Saved.Revision;
};

/**
 * `$id` と `$revision` を必ず持つ編集画面のレコード。
 *
 * 理由は `SavedRecordWithMeta` と同じ。
 * **編集画面（`edit.show` / `edit.change` / `edit.submit`）だけで使える。**
 * 作成画面の `event.record` も `EditingRecord` だが、そちらは
 * `$id` を持たないので、文脈を確かめずに付けると嘘になる。
 */
export type EditingRecordWithMeta = EditingRecord & {
	$id: Editing.Id;
	$revision: Editing.Revision;
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

/**
 * `kintone.app.record.set()` に渡せるレコード。
 *
 * 読み取り型と違い `disabled` と `error` を持てる。
 * 実測では set() で設定しても get() では返らないため、
 * これらは書き込み専用のプロパティとして扱う。
 *
 * 部分更新ができるので、変更したいフィールドだけを含めればよい。
 *
 * `tsumekae/kintone` を使わず、自前の `kintone.d.ts` を持つプロジェクトが
 * `set()` の引数だけを差し替えられるように、ルートから出している
 * （README の「`kintone` グローバル」）。
 */
export type SetRecord = {
	[fieldCode: string]: {
		/**
		 * **必須**。省略すると実行時に落ちる（実測 2026-08-30）。
		 *
		 * ```
		 * kintone.app.record.set({ record: { singleLineText: { value: "x" } } });
		 * → カスタマイズ用の JavaScript の実行時にエラーが発生しました。
		 *   event.record['singleLineText'].type が不正です。
		 * ```
		 *
		 * 当初は optional として宣言していたが、根拠が無かった。
		 * 実測で否定されたので必須にする。
		 */
		type: string;
		value?: unknown;
		disabled?: boolean;
		error?: string | null;
	};
};
