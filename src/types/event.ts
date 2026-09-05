import type { Editing } from "./field";
import type { CreateRecord, EditingRecord, SavedRecord } from "./record";

/**
 * kintone のイベント型。
 *
 * `kintone.events.on` のハンドラ引数は dts-gen では `any` で、
 * そのため調査したプラグイン群では 6 つのプラグインが
 * イベント型を手書きで重複させていた（内容もそれぞれ違う）。
 * イベント名リテラルから event の形を引けるようにして、その重複をなくす。
 *
 * ## 実測の裏づけがあるもの / ないもの
 *
 * レコード系イベント（`app.record.*`）と、モバイルの
 * `create.show` / `edit.show` / `detail.show` / `index.show` は
 * `fixtures/measured.json` の実測に基づく（e2e で毎回採り直す）。
 *
 * モバイルの submit / change / process も実測済み。
 * ポータル、スペース、グラフ、削除イベントは**実測していない**。
 * 公式ドキュメント準拠で、各型の JSDoc に明記する。
 *
 * ## 「PC と同形」は当てにならない
 *
 * 実測するまで、モバイルも一覧のインライン編集もプロセス管理も
 * 「PC と同形」として書いていた。2026-09-05 の実測でどれも外れた。
 *
 * - `mobile.app.record.edit.show` の record は Saved ではなく Editing
 * - `app.record.index.edit.*` は `appId` / `recordId` が文字列で来る
 * - `app.record.detail.process.proceed` は `appId` も `recordId` も持たない
 * - `mobile.*.submit.success` は `appId` が文字列
 *
 * 同形だと**思える**ことは根拠にならない。採ってから書く。
 * 一方で `mobile` の submit / change / process は実際に PC と同形だった。
 * 「違うはずだ」も同じく根拠にならない。
 *
 * ## 条件型について
 *
 * フィールド型を文脈でパラメータ化する条件型は採らない方針だが
 * （ホバーとエラーメッセージが壊れるため）、
 * ここでの `EventOf` は 1 段のインデックスアクセスで、
 * 解決結果が具体的な event 型になるため可読性を損なわない。
 */

// ---------------------------------------------------------------------------
// event の骨格
// ---------------------------------------------------------------------------

/** すべてのイベントが持つ。appId は実測上どのイベントでも number */
type Base<Type extends string> = {
	type: Type;
	appId: number;
};

/**
 * 詳細画面の表示。
 * record はサーバ由来で正規化済み（実測: undefined が 1 件も現れない）。
 */
export type DetailShowEvent<Type extends string> = Base<Type> & {
	recordId: number;
	record: SavedRecord;
};

/**
 * 編集画面の表示。
 * この時点の record はまだサーバ由来。
 * 画面を触ったあとに `kintone.app.record.get()` で取ると Editing になる。
 *
 * **モバイルは違う。** `RecordShape` を差し替えられるようにしてあるのは
 * そのため。詳細は `mobile.app.record.edit.show` の JSDoc を見ること。
 */
export type EditShowEvent<
	Type extends string,
	RecordShape = SavedRecord,
	RecordId = number,
> = Base<Type> & {
	recordId: RecordId;
	record: RecordShape;
};

/**
 * 作成画面の表示。
 *
 * - recordId を持たない
 * - record はシステムフィールドを持たない（実測: 作成画面 28 / 他 37 フィールド）
 * - `reuse` は「再利用して作成」かどうか。dts-gen にも既存の手書き型にも無い
 */
export type CreateShowEvent<Type extends string> = Base<Type> & {
	record: CreateRecord;
	reuse: boolean;
};

/**
 * 一覧画面の表示。
 *
 * `viewName` / `offset` / `size` / `date` は実測で見つかったもので、
 * 調査した手書き型は `viewType` / `viewId` しか持っていなかった。
 */
export type IndexShowEvent<Type extends string> = Base<Type> & {
	viewId: number;
	viewName: string;
	viewType: "list" | "calendar" | "custom";
	records: SavedRecord[];
	offset: number;
	size: number;
	/** カレンダービューの表示月。リストビューでは null（実測） */
	date: string | null;
};

/**
 * 値の変更。
 *
 * `changes.field` はレコード内のフィールドと**同一オブジェクトへの参照**で、
 * コピーではない（実測: シリアライザが循環参照として検出した）。
 * 片方を書き換えるともう片方も変わる。
 *
 * ## 表を操作したとき、どちらのイベントが飛ぶか
 *
 * サブテーブルには 2 つのイベント名がある。**同時には飛ばない。**
 *
 * - `change.<テーブルのコード>` … 例 `app.record.edit.change.subtable`
 * - `change.<表内フィールドのコード>` … 例 `app.record.edit.change.t_singleLineText`
 *
 * 実測 2026-08-31。UI 操作と `kintone.app.record.set()` の両方を、
 * 作成画面・編集画面の両方で測定。両画面で一致した。
 *
 * | 操作 | 経路 | `change.<テーブルのコード>` | `change.<表内フィールドのコード>` |
 * | --- | --- | --- | --- |
 * | セルの値を変える | UI | 飛ばない | **飛ぶ** |
 * | セルの値を変える | `set()` | 飛ばない | **飛ぶ** |
 * | 行を追加する | UI | **飛ぶ** | 飛ばない |
 * | 行を追加する | `set()` | 飛ばない | 飛ばない |
 * | 行を削除する | UI | **飛ぶ** | 飛ばない |
 * | 行を削除する | `set()` | 飛ばない | 飛ばない |
 *
 * まとめるとこうなる。
 *
 * - **`set()` は行の増減では何も発火しない。** 発火するのはセルの値が変わったときだけ
 * - **UI は行の増減で `change.<テーブルのコード>` を発火する**
 *
 * したがって `set()` で表を書き換えるプラグインは、
 * 自分の変更を change イベントで捕まえることを期待できない。
 *
 * なお値を入れた行を `set()` で足すと `change.<表内フィールドのコード>` が飛ぶが、
 * それは**セルに値が入ったため**で、行が増えたからではない。
 * 空の行（`value: ""`）を足すと何も飛ばないことで確認した。
 *
 * 表の外のフィールドは経路によらず `change.<フィールドコード>` が飛ぶ。
 * UI での値変更は**フォーカスを外したとき**に飛ぶ。
 *
 * 「飛ばない」の根拠: ハンドラを 270 件（両方のイベント名を含む）登録した状態で測り、
 * 発火した change サンプル 15 件のうち 14 件が各操作に対応した。
 * 残る 1 件は計測窓を使っていない操作（必須項目の入力）のもので、取りこぼしは無い。
 *
 * `changes.field` は SUBTABLE 全体ではなく**変更されたセルそのもの**が入る。
 * `changes.row` が非 null かどうかが、表内の変更かどうかの判別になる。
 */
export type ChangeEvent<Type extends string, Record> = Base<Type> & {
	record: Record;
	changes: ChangeBody;
};

/** change イベントが共通で持つ変更内容 */
type ChangeBody = {
	field: Editing.OneOf;
	row: Editing.SubtableRow | null;
};

/**
 * 編集画面の change。
 *
 * **作成画面とは違い `recordId` を持つ**（2026-09-05 実測）。
 * 当初は作成画面と同じ型を使っていたが、実測では
 * `create.change.*` に `recordId` が無く、`edit.change.*` にはあった。
 */
export type EditChangeEvent<Type extends string, Record> = Base<Type> & {
	recordId: number;
	record: Record;
	changes: ChangeBody;
};

/**
 * 一覧のインライン編集の change。
 *
 * **`appId` も `recordId` も文字列**（2026-09-05 実測）。
 * 編集画面の change はどちらも number なので、`Base` を継承できない。
 */
export type IndexEditChangeEvent<Type extends string> = {
	type: Type;
	appId: string;
	recordId: string;
	record: EditingRecord;
	changes: ChangeBody;
};

/**
 * 作成時の保存の直前。
 *
 * record は編集中のフォームの値なので Editing 系。
 * **recordId を持たない**（実測: create.submit には appId しか無い）。
 *
 * ## error は受け取る側には無い。返す側で使う
 *
 * 受け取る event に `error` キーは**存在しない**（実測: `type` / `appId` / `record` のみ）。
 * ハンドラの戻り値に設定すると**保存が中断される**（実測 2026-08-31）。
 *
 * ```ts
 * kintone.events.on("app.record.create.submit", (event) => {
 *   if (だめな条件) return { ...event, error: "保存できません" };
 *   return event;
 * });
 * ```
 *
 * 中断すると `submit.success` は飛ばず、メッセージが画面に表示される。
 * 中断したあと、そのまま再度保存すれば通る（`submit` が再び飛ぶ）。
 */
export type CreateSubmitEvent<Type extends string> = Base<Type> & {
	record: CreateRecord;
	error?: string;
};

/**
 * 更新時の保存の直前。
 *
 * **recordId を持つ（number）**。作成時との違い（実測）。
 * record にはシステムフィールドと $id / $revision も含まれる。
 *
 * `error` の扱いは `CreateSubmitEvent` と同じ。
 * 受け取る event にキーは無く（実測: `type` / `appId` / `recordId` / `record` のみ）、
 * 戻り値に設定すると保存が中断される（実測 2026-08-31）。
 */
export type EditSubmitEvent<Type extends string> = Base<Type> & {
	recordId: number;
	record: EditingRecord;
	error?: string;
};

/**
 * 保存の完了。
 *
 * 当初「record を持たない（url だけ）」と想定していたが実測では誤りだった。
 * record も recordId も持ち、$id / $revision やシステムフィールドまで揃っている。
 * 一方 `url` キーは存在しない。
 *
 * **recordId は string**。show 系や submit は number なので、ここだけ型が違う（実測）。
 */
export type SubmitSuccessEvent<Type extends string, AppId = number> = {
	type: Type;
	/**
	 * **モバイルでは文字列で来る**（2026-09-05 実測）。
	 * PC は number。`Base` を継承していないのはこのため
	 */
	appId: AppId;
	recordId: string;
	record: SavedRecord;
};

/**
 * 一覧のインライン編集の保存直前。
 *
 * `EditSubmitEvent` と分けてあるのは、**`appId` まで文字列で来る**ため
 * （2026-09-05 実測）。`Base` は `appId: number` を主張するので継承できない。
 * kintone 側の一貫性の無さで、こちらの都合で揃えるわけにいかない。
 */
export type IndexEditSubmitEvent<Type extends string> = {
	type: Type;
	appId: string;
	recordId: string;
	record: EditingRecord;
	/** 設定すると保存を中断できる */
	error?: string;
};

/** 削除の直前。record を持たない */
export type DeleteSubmitEvent<Type extends string> = Base<Type> & {
	recordId: number;
};

/**
 * プロセス管理のアクション実行。
 *
 * **他のレコードイベントと形が違う**（2026-09-05 実測）。
 *
 * - `appId` も `recordId` も**持たない**。envelope のキーは
 *   `type` / `action` / `status` / `nextStatus` / `record` の 5 つだけ
 * - `action` / `status` / `nextStatus` は文字列ではなく
 *   **`{ value: string }` のオブジェクト**
 * - `status` は遷移**前**、`nextStatus` が遷移**後**
 *   （実測値: `status.value = "未処理"` / `nextStatus.value = "処理中"`）
 *
 * 当初は `Base` を継承し、3 つとも `string` として書いていた。
 * どれも実測で否定された。
 *
 * なお UI からアクションを実行すると、次のステータスと作業者を示す
 * ポップアップが開き、そこで確定して初めてこのイベントが飛ぶ。
 */
export type ProcessProceedEvent<Type extends string> = {
	type: Type;
	record: SavedRecord;
	/** 実行したアクション名 */
	action: { value: string };
	/** 遷移前のステータス名 */
	status: { value: string };
	/** 遷移後のステータス名 */
	nextStatus: { value: string };
	/**
	 * 設定すると遷移を中断できる（公式ドキュメント準拠）。
	 * submit の error と違い、こちらは未実測
	 */
	error?: string;
};

/** レコードを持たない画面イベント。実測なし・公式ドキュメント準拠 */
export type PlainEvent<Type extends string> = {
	type: Type;
};

// ---------------------------------------------------------------------------
// イベント名 → event 型のマップ
// ---------------------------------------------------------------------------

/** PC 版とモバイル版の両方を作る */
type WithMobile<T extends string> = T | `mobile.${T}`;

type ShowEvents = {
	[K in WithMobile<"app.record.detail.show">]: DetailShowEvent<K>;
} & {
	"app.record.edit.show": EditShowEvent<"app.record.edit.show">;
	/**
	 * モバイルの編集画面。
	 *
	 * **PC と record の形が違う**（2026-09-05 実測）。
	 * PC はサーバ由来で、値の無いフィールドが `""` や `null` になる。
	 * モバイルは**値が設定されていないフィールドが `undefined`** で、
	 * 作成画面と同じ形をしている。
	 *
	 * 読み込み途中を拾ったのではない。同じ待ち方で採った
	 * `mobile.app.record.detail.show` は PC と同形（`""` / `null`）だった。
	 */
	"mobile.app.record.edit.show": EditShowEvent<
		"mobile.app.record.edit.show",
		EditingRecord
	>;
} & {
	[K in WithMobile<"app.record.create.show">]: CreateShowEvent<K>;
} & {
	[K in WithMobile<"app.record.index.show">]: IndexShowEvent<K>;
} & {
	/**
	 * 印刷画面。PC のみ。
	 *
	 * 2026-09-02 実測。`type` 以外は詳細画面と完全に一致した
	 * （envelope のキーは `type` / `appId` / `recordId` / `record`、
	 * `recordId` は number、`record` は同一の Saved レコード）。
	 */
	"app.record.print.show": DetailShowEvent<"app.record.print.show">;
};

type SubmitEvents = {
	[K in WithMobile<"app.record.create.submit">]: CreateSubmitEvent<K>;
} & {
	[K in WithMobile<"app.record.edit.submit">]: EditSubmitEvent<K>;
} & {
	/**
	 * 保存完了。
	 *
	 * **モバイルは `appId` が文字列**（2026-09-05 実測）。PC は number。
	 * `recordId` はどちらも文字列で、show 系（number）と違う。
	 */
	"app.record.create.submit.success": SubmitSuccessEvent<"app.record.create.submit.success">;
	"mobile.app.record.create.submit.success": SubmitSuccessEvent<
		"mobile.app.record.create.submit.success",
		string
	>;
	"app.record.edit.submit.success": SubmitSuccessEvent<"app.record.edit.submit.success">;
	"mobile.app.record.edit.submit.success": SubmitSuccessEvent<
		"mobile.app.record.edit.submit.success",
		string
	>;
} & {
	/**
	 * 一覧のインライン編集の保存。PC のみ。
	 *
	 * **編集画面と同形ではなかった**（2026-09-05 実測）。
	 * `app.record.edit.submit` は `appId` も `recordId` も number だが、
	 * こちらは**どちらも文字列**で来る。
	 */
	"app.record.index.edit.submit": IndexEditSubmitEvent<"app.record.index.edit.submit">;
	/**
	 * 一覧のインライン編集の保存完了。PC のみ。
	 *
	 * 2026-09-05 実測。`appId` は number、`recordId` は string で、
	 * 詳細画面から保存したときの `submit.success` と同形だった。
	 */
	"app.record.index.edit.submit.success": SubmitSuccessEvent<"app.record.index.edit.submit.success">;
};

/**
 * 値の変更イベント。イベント名にフィールドコードが埋まる。
 *
 * **表内フィールドのコードでも発火する**（実測 2026-08-30）。
 * テンプレートリテラルで受けているので、表内・表外のどちらのコードも通る。
 */
type ChangeEvents = {
	[K in `app.record.create.change.${string}`]: ChangeEvent<K, CreateRecord>;
} & {
	[K in `mobile.app.record.create.change.${string}`]: ChangeEvent<
		K,
		CreateRecord
	>;
} & {
	[K in `app.record.edit.change.${string}`]: EditChangeEvent<K, EditingRecord>;
} & {
	/**
	 * モバイルの編集画面の change。
	 *
	 * 2026-09-05 実測。PC と同形で、`recordId: number` を持つ。
	 * `create.change` が `recordId` を持たないのも PC と同じだった。
	 */
	[K in `mobile.app.record.edit.change.${string}`]: EditChangeEvent<
		K,
		EditingRecord
	>;
} & {
	/**
	 * 一覧のインライン編集の change。PC のみ。
	 *
	 * 2026-09-05 実測。`appId` / `recordId` がどちらも文字列で、
	 * 編集画面の change（どちらも number）とは形が違う。
	 */
	[K in `app.record.index.edit.change.${string}`]: IndexEditChangeEvent<K>;
};

type OtherRecordEvents = {
	[K in WithMobile<"app.record.detail.delete.submit">]: DeleteSubmitEvent<K>;
} & {
	[K in WithMobile<"app.record.detail.process.proceed">]: ProcessProceedEvent<K>;
} & {
	"app.record.index.delete.submit": DeleteSubmitEvent<"app.record.index.delete.submit">;
	/**
	 * 一覧のインライン編集を開いたとき。PC のみ。
	 *
	 * 2026-09-05 実測。`record` は編集画面と同じくサーバ由来（Saved）だが、
	 * **`recordId` は string**（`app.record.edit.show` は number）。
	 */
	"app.record.index.edit.show": EditShowEvent<
		"app.record.index.edit.show",
		SavedRecord,
		string
	>;
};

/** レコードを扱わない画面。実測なし・公式ドキュメント準拠 */
type NonRecordEvents = {
	[K in WithMobile<"portal.show">]: PlainEvent<K>;
} & {
	[K in WithMobile<"space.portal.show">]: PlainEvent<K>;
} & {
	"app.report.show": PlainEvent<"app.report.show">;
};

export type KintoneEventMap = ShowEvents &
	SubmitEvents &
	ChangeEvents &
	OtherRecordEvents &
	NonRecordEvents;

export type KintoneEventName = keyof KintoneEventMap;

/**
 * マップに無いイベント名を渡したときの型。
 *
 * 閉じたマップだけにすると、kintone が新しいイベントを追加した瞬間に
 * このライブラリの更新を待たないと使えなくなる。
 * 型付けの利得と引き換えに利用者をブロックする側に回るので、退避口を用意する。
 */
export type UnknownKintoneEvent = {
	type: string;
	appId?: number;
	recordId?: number | string;
	record?: EditingRecord;
	records?: SavedRecord[];
	[key: string]: unknown;
};

/** イベント名から event 型を引く。マップに無ければ退避口の型になる */
export type EventOf<Name> = Name extends KintoneEventName
	? KintoneEventMap[Name]
	: UnknownKintoneEvent;
