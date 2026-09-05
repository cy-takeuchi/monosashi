/**
 * 実測に必ず含まれていなければならない (イベント, 経路) の組。
 *
 * ## なぜ必要か
 *
 * 型の主張の中には、**特定の採取が存在すること**に依存しているものがある。
 * ところが既存のテストの多くは全称型（「どのサンプルにも undefined は無い」）で、
 * サンプルが減っても素通りで通る。
 *
 * 例: `disabled` / `error` が読み取りに存在しないという主張の根拠は
 * `screen.*.afterSet` の 2 サンプルだけ。これを採り忘れても
 * 「どのサンプルにも disabled は無い」は通ってしまい、
 * **テストは全部緑のまま根拠だけが消える**。
 *
 * この一覧が、採取（今後は e2e）が満たすべき下限を定める。
 * `OBSERVED_FIELD_TYPES` がフィールド種別に対してやっていることを、採取文脈に対してやる。
 */

/**
 * `event` の照合方法。
 *
 * change イベントは名前にフィールドコードが埋まる
 * （`app.record.edit.change.singleLineText`）。
 * どのフィールドを触るかは採取スクリプトの都合で決まるもので、
 * kintone の仕様ではない。そこまで固定すると採取側を不必要に縛るので、
 * change だけは接頭辞で要求する。
 */
export type ContextRequirement = {
	match: "exact" | "prefix";
	event: string;
	source: string;
	/** この採取が無いと、どの主張の根拠が消えるか */
	why: string;
};

export const REQUIRED_CONTEXTS: readonly ContextRequirement[] = [
	// --- 作成画面 ---
	{
		match: "exact",
		event: "app.record.create.show",
		source: "event.record",
		why: "CreateShowEvent の reuse / recordId を持たないこと / システムフィールドが無いこと",
	},
	{
		match: "exact",
		event: "app.record.create.submit",
		source: "event.record",
		why: "CreateSubmitEvent が recordId を持たないこと（edit.submit との違い）",
	},
	{
		match: "exact",
		event: "app.record.create.submit.success",
		source: "event.record",
		why: "SubmitSuccessEvent の recordId が string であること（show 系は number）",
	},
	{
		match: "exact",
		event: "screen.create",
		source: "kintone.app.record.get",
		why: "Editing の undefined。値が一度も設定されていないフィールドの存在",
	},
	{
		match: "exact",
		event: "screen.create.afterSet",
		source: "kintone.app.record.get",
		why: "set() で disabled / error を設定しても get() では返らないこと",
	},

	// --- 詳細画面 ---
	{
		match: "exact",
		event: "app.record.detail.show",
		source: "event.record",
		why: "Saved に undefined が現れないこと。DetailShowEvent の recordId が number",
	},
	{
		match: "exact",
		event: "screen.detail",
		source: "kintone.app.record.get",
		why: "詳細画面の get() が返すレコードの形",
	},
	{
		match: "exact",
		event: "screen.detail",
		source: "rest.getRecord",
		why: "Rest 文脈。DROP_DOWN が null になりうること",
	},

	// --- プロセス管理 ---
	{
		match: "exact",
		event: "app.record.detail.process.proceed",
		source: "event.record",
		why: "ProcessProceedEvent の action / status / nextStatus / recordId。型に書いてあるが実測が無かった",
	},

	// --- 印刷画面 ---
	{
		match: "exact",
		event: "app.record.print.show",
		source: "event.record",
		why: "印刷画面でもカスタマイズが動き、詳細画面と同じ Saved レコードを持つこと。パネルを載せるヘッダが無いので event.record だけが採れる",
	},

	// --- 編集画面 ---
	{
		match: "exact",
		event: "app.record.edit.show",
		source: "event.record",
		why: "edit.show の record がまだサーバ由来（Saved）であること",
	},
	{
		match: "exact",
		event: "app.record.edit.submit",
		source: "event.record",
		why: "EditSubmitEvent が recordId: number を持つこと",
	},
	{
		match: "exact",
		event: "app.record.edit.submit.success",
		source: "event.record",
		why: "更新時の submit.success も record と recordId を持つこと",
	},
	{
		match: "exact",
		event: "screen.edit",
		source: "kintone.app.record.get",
		why: "編集画面の get() が Editing を返すこと",
	},
	{
		match: "exact",
		event: "screen.edit",
		source: "rest.getRecord",
		why: "同一レコードを JS API と REST で採り、両者の差を確定させる",
	},
	{
		match: "exact",
		event: "screen.edit.afterSet",
		source: "kintone.app.record.get",
		why: "編集画面でも set() の disabled / error が get() に現れないこと",
	},

	// --- 一覧画面 ---
	{
		match: "exact",
		event: "app.record.index.show",
		source: "event.records",
		why: "IndexShowEvent の viewName / offset / size / date。手書き型には無かったキー",
	},
	{
		match: "exact",
		event: "screen.index",
		source: "rest.getRecords",
		why: "getRecords が返す複数レコードの形",
	},

	// --- 一覧のインライン編集 ---
	// 一覧にしか無いイベント。型には最初から書いてあったが根拠が無かった
	{
		match: "exact",
		event: "app.record.index.edit.show",
		source: "event.record",
		why: "IndexEditShowEvent の recordId / record の形。一覧から開いた編集が詳細画面の編集と同じ形か",
	},
	{
		match: "prefix",
		event: "app.record.index.edit.change.",
		source: "event.record",
		why: "インライン編集でも change イベントが飛び、changes を持つこと",
	},
	{
		match: "exact",
		event: "app.record.index.edit.submit",
		source: "event.record",
		why: "IndexEditSubmitEvent が recordId を持つこと",
	},
	{
		match: "exact",
		event: "app.record.index.edit.submit.success",
		source: "event.record",
		why: "インライン編集の保存完了イベントも record と recordId を持つこと",
	},

	// --- モバイル ---
	// mobile.* のイベントはモバイル画面でしか飛ばない。
	// PC と同形として型を書いているので、その根拠がここに要る
	{
		match: "exact",
		event: "mobile.app.record.index.show",
		source: "event.records",
		why: "モバイルの一覧も event.records を持ち、PC と同じ形であること",
	},
	{
		match: "exact",
		event: "mobile.app.record.create.show",
		source: "event.record",
		why: "モバイルの作成画面も Editing のレコードを持つこと",
	},
	{
		match: "exact",
		event: "mobile.app.record.detail.show",
		source: "event.record",
		why: "モバイルの詳細画面も Saved のレコードを持つこと",
	},
	{
		match: "exact",
		event: "mobile.app.record.edit.show",
		source: "event.record",
		why: "**モバイルの編集画面の record は Editing**（PC は Saved）。この差の唯一の根拠",
	},
	{
		match: "exact",
		event: "mobile.app.record.create.submit.success",
		source: "event.record",
		why: "モバイルの保存完了イベントの形",
	},
	{
		match: "exact",
		event: "mobile.app.record.edit.submit.success",
		source: "event.record",
		why: "モバイルの更新完了イベントの形",
	},
	{
		match: "prefix",
		event: "mobile.app.record.create.change.",
		source: "event.record",
		why: "モバイルの作成画面でも change が飛び、changes を持つこと",
	},
	{
		match: "prefix",
		event: "mobile.app.record.edit.change.",
		source: "event.record",
		why: "モバイルの編集画面でも change が飛ぶこと",
	},
	{
		match: "exact",
		event: "mobile.app.record.detail.process.proceed",
		source: "event.record",
		why: "モバイルのプロセス管理。PC と同形かどうかの根拠",
	},
	{
		match: "exact",
		event: "mobile.screen.detail",
		source: "kintone.app.record.get",
		why: "モバイルの get() が返すレコードの形。PC と混ざらないよう probe がキーに mobile. を付けている",
	},
	{
		match: "exact",
		event: "mobile.screen.edit",
		source: "kintone.app.record.get",
		why: "モバイルの編集画面の get()。event.record が Editing だったので get() も確かめる",
	},

	// --- 値の変更 ---
	{
		match: "prefix",
		event: "app.record.create.change.",
		source: "event.record",
		why: "作成画面の ChangeEvent。record が CreateRecord であること",
	},
	{
		match: "prefix",
		event: "app.record.edit.change.",
		source: "event.record",
		why: "編集画面の ChangeEvent。changes.field が record 内と同一オブジェクト参照であること",
	},
	// 行の追加・削除の採取。新規行の id の扱いと、
	// set() での行削除が change を発火しないことの根拠になる
	{
		match: "exact",
		event: "screen.edit.addRow",
		source: "kintone.app.record.get",
		why: "保存済みレコードで id を渡さずに行を追加でき、その行の id が null になること",
	},
	{
		match: "exact",
		event: "screen.edit.removeRow",
		source: "kintone.app.record.get",
		why: "set() での行削除が change イベントを発火しないこと",
	},

	// 保存の中断。error を返すと保存が止まることの根拠になる
	{
		match: "exact",
		event: "app.record.create.submit.blocked",
		source: "event.record",
		why: "submit の戻り値に error を設定すると保存が中断されること",
	},
	{
		match: "exact",
		event: "app.record.edit.submit.blocked",
		source: "event.record",
		why: "更新時も同じく error で中断できること",
	},

	// UI 経由の値変更。set() と同じイベント名であることの根拠になる
	{
		match: "exact",
		event: "screen.edit.uiSetValue",
		source: "kintone.app.record.get",
		why: "UI での表外フィールドの値変更が set() と同じイベント名で飛ぶこと",
	},
	{
		match: "exact",
		event: "screen.edit.uiSetCell",
		source: "kintone.app.record.get",
		why: "UI での表内セルの値変更が set() と同じイベント名で飛ぶこと",
	},

	// UI 経由の行操作。set() とはイベント名が違うことの根拠になる
	{
		match: "exact",
		event: "screen.edit.uiAddRow",
		source: "kintone.app.record.get",
		why: "UI での行追加が change.<テーブルのコード> を発火すること（set() とは違う）",
	},
	{
		match: "exact",
		event: "screen.edit.uiRemoveRow",
		source: "kintone.app.record.get",
		why: "UI での行削除が change.<テーブルのコード> を発火すること（set() では発火しない）",
	},

	// サブテーブル内の変更は「イベント名」では要求できない。
	// 実測（2026-08-30）でイベント名は**表内フィールドのコード**
	// （app.record.create.change.t_singleLineText）であり、
	// テーブルのコードではなかった。当初はテーブルのコードだと考えて
	// exact で要求していたが、その前提が誤っていた。
	//
	// 表内フィールドのコードはアプリ定義に依存するので、名前で要求すると
	// 検証アプリの構成に縛られる。代わりに
	// 「changes.row が非 null のサンプルが存在すること」を
	// coverage.test.ts で直接要求する。守りたいのは名前ではなく根拠のほう。
];

export const matchesContext = (
	requirement: ContextRequirement,
	event: string,
	source: string,
): boolean =>
	source === requirement.source &&
	(requirement.match === "exact"
		? event === requirement.event
		: event.startsWith(requirement.event));
