/**
 * kintone のレコードフィールド型。
 *
 * すべて実測に基づく。根拠は fixtures/measured.json（e2e が実 kintone から採る）。
 * 実測の裏づけが無いものは書かない。推測で書かれた型が正しくないことが
 * このプロジェクトの出発点であるため。
 *
 * ## 文脈を 3 つに分ける理由
 *
 * 同じフィールドでも、どこから取得したかで value の型が違う（2026-08-30 実測）。
 *
 * | type        | Saved         | Editing                   | Rest          |
 * | ----------- | ------------- | ------------------------- | ------------- |
 * | SINGLE_LINE_TEXT | string   | string \| undefined       | string        |
 * | DATE        | string \| null | string \| null \| undefined | string \| null |
 * | DROP_DOWN   | string        | string \| undefined       | string \| null |
 *
 * - **Saved** ... 詳細画面 / 一覧画面 / `edit.show` / `submit.success` の event.record。
 *   サーバから来た正規化済みのレコード。undefined は 84 サンプル中 1 件も現れない
 * - **Editing** ... 作成・編集画面の `kintone.app.record.get()` と
 *   `change.*` / `submit` の event.record。クライアント側のレコードモデルで、
 *   **値が一度も設定されたことのないフィールドが undefined になる**
 * - **Rest** ... `@kintone/rest-api-client` の型と一致することを実測で確認済み。
 *   DROP_DOWN だけ null を返す点が Saved と違う
 *
 * 同一レコード・同一画面でも `edit.show` は undefined なし、その 3 秒後の
 * `edit.change` は undefined あり、という観測が Editing と Saved を分ける根拠。
 *
 * ## disabled / error を持たない理由
 *
 * 84 サンプル、全画面・全経路で 1 件も現れなかった。
 * `kintone.app.record.set()` で設定した直後の `get()` でも現れない。
 * 読み取りには存在しない書き込み専用のプロパティなので、Set 型にだけ置く。
 */

/** フィールドの骨格。type と value だけを持つ */
export type FieldOf<Type extends string, Value> = {
	type: Type;
	value: Value;
};

/** ユーザー / 組織 / グループの共通形 */
export type Entity = {
	code: string;
	name: string;
};

/** 添付ファイル。JS API と REST のどちらも同じ形を返す（実測） */
export type FileInformation = {
	contentType: string;
	fileKey: string;
	name: string;
	size: string;
};

// ---------------------------------------------------------------------------
// Saved — 詳細画面 / 一覧画面 / edit.show / submit.success
// ---------------------------------------------------------------------------

/**
 * サーバから来た正規化済みのレコードのフィールド。
 *
 * 未入力は空文字 / null / 空配列で表現され、undefined にはならない。
 */
export namespace Saved {
	export type RecordNumber = FieldOf<"RECORD_NUMBER", string>;
	export type Id = FieldOf<"__ID__", string>;
	export type Revision = FieldOf<"__REVISION__", string>;
	export type Creator = FieldOf<"CREATOR", Entity>;
	export type Modifier = FieldOf<"MODIFIER", Entity>;
	export type CreatedTime = FieldOf<"CREATED_TIME", string>;
	export type UpdatedTime = FieldOf<"UPDATED_TIME", string>;
	export type Status = FieldOf<"STATUS", string>;
	export type StatusAssignee = FieldOf<"STATUS_ASSIGNEE", Entity[]>;
	export type Category = FieldOf<"CATEGORY", string[]>;

	export type SingleLineText = FieldOf<"SINGLE_LINE_TEXT", string>;
	export type MultiLineText = FieldOf<"MULTI_LINE_TEXT", string>;
	export type RichText = FieldOf<"RICH_TEXT", string>;
	export type Number = FieldOf<"NUMBER", string>;
	export type Calc = FieldOf<"CALC", string>;
	export type Link = FieldOf<"LINK", string>;
	export type CheckBox = FieldOf<"CHECK_BOX", string[]>;
	export type RadioButton = FieldOf<"RADIO_BUTTON", string>;
	export type MultiSelect = FieldOf<"MULTI_SELECT", string[]>;
	/** Saved では null にならない。REST は null を返すので Rest.Dropdown と型が違う */
	export type Dropdown = FieldOf<"DROP_DOWN", string>;
	export type Date = FieldOf<"DATE", string | null>;
	export type Time = FieldOf<"TIME", string | null>;
	export type DateTime = FieldOf<"DATETIME", string>;
	export type File = FieldOf<"FILE", FileInformation[]>;
	export type UserSelect = FieldOf<"USER_SELECT", Entity[]>;
	export type OrganizationSelect = FieldOf<"ORGANIZATION_SELECT", Entity[]>;
	export type GroupSelect = FieldOf<"GROUP_SELECT", Entity[]>;

	/**
	 * ルックアップのキーフィールド。
	 *
	 * JS API と event.record では confirmed / recordId を持つ（実測・全画面で一貫）。
	 * REST には現れない。
	 * type は元フィールドの型そのもの（SINGLE_LINE_TEXT や NUMBER）なので、
	 * type だけでは通常のフィールドと区別できず、キーの有無で判別する。
	 */
	export type Lookup<Type extends string = "SINGLE_LINE_TEXT" | "NUMBER"> =
		FieldOf<Type, string> & {
			confirmed: boolean;
			recordId: string | null;
		};

	/** サブテーブルに入れられるフィールド */
	export type InSubtable =
		| SingleLineText
		| MultiLineText
		| RichText
		| Number
		| Calc
		| Link
		| CheckBox
		| RadioButton
		| MultiSelect
		| Dropdown
		| Date
		| Time
		| DateTime
		| File
		| UserSelect
		| OrganizationSelect
		| GroupSelect;

	export type SubtableRow<
		T extends { [fieldCode: string]: InSubtable } = {
			[fieldCode: string]: InSubtable;
		},
	> = {
		/** Saved では必ず文字列。Editing の作成画面では null になる */
		id: string;
		value: T;
	};

	export type Subtable<
		T extends { [fieldCode: string]: InSubtable } = {
			[fieldCode: string]: InSubtable;
		},
	> = FieldOf<"SUBTABLE", SubtableRow<T>[]>;

	export type OneOf =
		| RecordNumber
		| Id
		| Revision
		| Creator
		| Modifier
		| CreatedTime
		| UpdatedTime
		| Status
		| StatusAssignee
		| Category
		| InSubtable
		| Subtable;
}

// ---------------------------------------------------------------------------
// Editing — 作成・編集画面の get() と change / submit の event.record
// ---------------------------------------------------------------------------

/**
 * クライアント側のレコードモデルのフィールド。
 *
 * **値が一度も設定されたことのないフィールドは undefined になる。**
 * 作成画面で入力するたびに undefined のフィールドが減っていくこと、
 * REST で作った未入力フィールドが編集画面で undefined になることを実測で確認済み。
 *
 * 配列を値に持つフィールド（CHECK_BOX / FILE / USER_SELECT 等）は
 * 未設定でも空配列であり、undefined にはならない。
 */
export namespace Editing {
	export type RecordNumber = Saved.RecordNumber;
	export type Id = Saved.Id;
	export type Revision = Saved.Revision;
	export type Creator = Saved.Creator;
	export type Modifier = Saved.Modifier;
	export type CreatedTime = Saved.CreatedTime;
	export type UpdatedTime = Saved.UpdatedTime;
	export type Status = Saved.Status;
	export type StatusAssignee = Saved.StatusAssignee;
	export type Category = Saved.Category;

	export type SingleLineText = FieldOf<"SINGLE_LINE_TEXT", string | undefined>;
	export type MultiLineText = FieldOf<"MULTI_LINE_TEXT", string | undefined>;
	/** 実測では常に文字列。kintone が初期値を入れるため undefined にならない */
	export type RichText = FieldOf<"RICH_TEXT", string>;
	export type Number = FieldOf<"NUMBER", string | undefined>;
	/** 計算結果は常に入っている */
	export type Calc = FieldOf<"CALC", string>;
	export type Link = FieldOf<"LINK", string | undefined>;
	export type CheckBox = Saved.CheckBox;
	/** 選択肢の既定値があるため常に文字列 */
	export type RadioButton = Saved.RadioButton;
	export type MultiSelect = Saved.MultiSelect;
	export type Dropdown = FieldOf<"DROP_DOWN", string | undefined>;
	export type Date = FieldOf<"DATE", string | null | undefined>;
	export type Time = FieldOf<"TIME", string | null | undefined>;
	export type DateTime = FieldOf<"DATETIME", string | undefined>;
	export type File = Saved.File;
	export type UserSelect = Saved.UserSelect;
	export type OrganizationSelect = Saved.OrganizationSelect;
	export type GroupSelect = Saved.GroupSelect;

	export type Lookup<Type extends string = "SINGLE_LINE_TEXT" | "NUMBER"> =
		FieldOf<Type, string | undefined> & {
			confirmed: boolean;
			recordId: string | null;
		};

	export type InSubtable =
		| SingleLineText
		| MultiLineText
		| RichText
		| Number
		| Calc
		| Link
		| CheckBox
		| RadioButton
		| MultiSelect
		| Dropdown
		| Date
		| Time
		| DateTime
		| File
		| UserSelect
		| OrganizationSelect
		| GroupSelect;

	/**
	 * 行 id は作成画面では null。
	 * 編集画面で行を追加した直後も null になりうる（実測: EDIT_LIVE で null と string の両方）。
	 */
	export type SubtableRow<
		T extends { [fieldCode: string]: InSubtable } = {
			[fieldCode: string]: InSubtable;
		},
	> = {
		id: string | null;
		value: T;
	};

	export type Subtable<
		T extends { [fieldCode: string]: InSubtable } = {
			[fieldCode: string]: InSubtable;
		},
	> = FieldOf<"SUBTABLE", SubtableRow<T>[]>;

	export type OneOf =
		| RecordNumber
		| Id
		| Revision
		| Creator
		| Modifier
		| CreatedTime
		| UpdatedTime
		| Status
		| StatusAssignee
		| Category
		| InSubtable
		| Subtable;
}
