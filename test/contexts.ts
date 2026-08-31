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
