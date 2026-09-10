/**
 * 生のフォーム定義。`getFormFields` と `getFormLayout` が返す形そのまま。
 *
 * ## なぜ自前で持つのか
 *
 * `@kintone/rest-api-client` を実行時依存にしないため。
 * 型のためだけに利用者へ 7MB と バージョンの制約を背負わせない
 * （`docs/DECISIONS.md`「4. 型の出どころ」）。
 *
 * この層は `toForm` の**入力の型**であり、そこが受け取れなくなることが
 * 唯一の破壊なので、公式の型との等価性を `raw.test-d.ts` が縛っている。
 *
 * ## 根拠は 2 つある
 *
 * | | 根拠 |
 * |---|---|
 * | 28 種のプロパティ型・レイアウト型 | **公式の型**（`@kintone/rest-api-client`）。実測と一致することを確認済み |
 * | `Label` / `HR` の `elementId` | **実測**。公式の型は宣言していない |
 *
 * 2026-09-10 に `fixtures/form/definition.json` と公式の型のキー集合を
 * 全件突き合わせた結果、**乖離は `elementId` の 1 種類だけ**だった。
 * 公式の型は正確で、`Lookup` が 6 プロパティしか持たないことも、
 * レイアウトの `REFERENCE_TABLE` が `size` を持たないことも、
 * `MULTI_LINE_TEXT` / `RICH_TEXT` の `size` に `innerHeight` が付くことも
 * すべて実測と一致した。
 *
 * **実測していない箇所はドキュメント（公式の型）を正とする。**
 * 実測した箇所は実測を正とする。乖離は `raw.test-d.ts` が式の中に書いて固定する。
 *
 * ## `Lookup` はここでは分けない
 *
 * `Lookup` の `type` は `"NUMBER" | "SINGLE_LINE_TEXT"` で、
 * 通常のフィールドと同じ値を取る。これは判別ユニオンを壊すが、
 * **`Raw` は `getFormFields` が返す形の写しなので、そのまま持つ。**
 *
 * 壊れるのは `Array.prototype.filter` の型述語推論だけで、
 * `switch` や `if` の絞り込みは効く。`toForm` の実装は後者しか使わない。
 * 利用者に渡す `Field` 側では種別ごとに分ける
 * （`docs/DECISIONS.md`「7. ルックアップ」）。
 */

/** 選択肢。キーが選択肢名で、`index` は文字列で来る */
export type Options = {
	[optionName: string]: {
		label: string;
		index: string;
	};
};

/** ルックアップ / 関連レコード一覧の参照先アプリ。`code` はスペース内アプリのコード */
export type RelatedApp = {
	app: string;
	code: string;
};

/**
 * `getFormFields` が返すフィールドの設定。
 *
 * 名前は公式（`KintoneFormFieldProperty`）に揃える。
 * 突き合わせるものと名前が違うと、どちらの話をしているのか読めなくなる。
 */
export namespace Property {
	export type RecordNumber = {
		type: "RECORD_NUMBER";
		code: string;
		label: string;
		noLabel: boolean;
	};

	export type Creator = {
		type: "CREATOR";
		code: string;
		label: string;
		noLabel: boolean;
	};

	export type CreatedTime = {
		type: "CREATED_TIME";
		code: string;
		label: string;
		noLabel: boolean;
	};

	export type Modifier = {
		type: "MODIFIER";
		code: string;
		label: string;
		noLabel: boolean;
	};

	export type UpdatedTime = {
		type: "UPDATED_TIME";
		code: string;
		label: string;
		noLabel: boolean;
	};

	/**
	 * カテゴリー。
	 *
	 * **設定が無効でも返る。** ただし `enabled` が設定を反映する（2026-09-10 実測）。
	 * プロセス管理・カテゴリーを設定していないアプリでは 3 種とも
	 * `enabled: false` で返り、設定済みのアプリでは `true` で返った。
	 */
	export type Category = {
		type: "CATEGORY";
		code: string;
		label: string;
		enabled: boolean;
	};

	export type Status = {
		type: "STATUS";
		code: string;
		label: string;
		enabled: boolean;
	};

	export type StatusAssignee = {
		type: "STATUS_ASSIGNEE";
		code: string;
		label: string;
		enabled: boolean;
	};

	export type SingleLineText = {
		type: "SINGLE_LINE_TEXT";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
		unique: boolean;
		minLength: string;
		maxLength: string;
		expression: string;
		hideExpression: boolean;
	};

	export type Number = {
		type: "NUMBER";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
		unique: boolean;
		minValue: string;
		maxValue: string;
		digit: boolean;
		displayScale: string;
		unit: string;
		unitPosition: "BEFORE" | "AFTER";
	};

	export type Calc = {
		type: "CALC";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		expression: string;
		hideExpression: boolean;
		format:
			| "NUMBER"
			| "NUMBER_DIGIT"
			| "DATETIME"
			| "DATE"
			| "TIME"
			| "HOUR_MINUTE"
			| "DAY_HOUR_MINUTE";
		displayScale: string;
		unit: string;
		unitPosition: "BEFORE" | "AFTER";
	};

	export type MultiLineText = {
		type: "MULTI_LINE_TEXT";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
	};

	export type RichText = {
		type: "RICH_TEXT";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
	};

	export type Link = {
		type: "LINK";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
		unique: boolean;
		minLength: string;
		maxLength: string;
		protocol: "WEB" | "CALL" | "MAIL";
	};

	export type CheckBox = {
		type: "CHECK_BOX";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string[];
		options: Options;
		align: "HORIZONTAL" | "VERTICAL";
	};

	export type RadioButton = {
		type: "RADIO_BUTTON";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
		options: Options;
		align: "HORIZONTAL" | "VERTICAL";
	};

	export type Dropdown = {
		type: "DROP_DOWN";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
		options: Options;
	};

	export type MultiSelect = {
		type: "MULTI_SELECT";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string[];
		options: Options;
	};

	export type File = {
		type: "FILE";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		thumbnailSize: "50" | "150" | "250" | "500";
	};

	export type Date = {
		type: "DATE";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
		unique: boolean;
		defaultNowValue: boolean;
	};

	export type Time = {
		type: "TIME";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
		defaultNowValue: boolean;
	};

	export type DateTime = {
		type: "DATETIME";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: string;
		unique: boolean;
		defaultNowValue: boolean;
	};

	/**
	 * ユーザー選択。
	 *
	 * `defaultValue` に `{ type: "FUNCTION", code: "LOGINUSER()" }` が入りうる。
	 * フォーム設定で「ログインユーザーを初期値にする」を選んだ場合、
	 * 具体的なユーザーではなく**関数名**が返る。
	 * 解決には別途ユーザー API か `kintone.getLoginUser()` が要るので、
	 * kisekae は解決しない（`docs/DECISIONS.md`「8. 初期値の生成は持たない」）。
	 */
	export type UserSelect = {
		type: "USER_SELECT";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: Array<
			| { code: string; type: "USER" | "GROUP" | "ORGANIZATION" }
			| { code: "LOGINUSER()"; type: "FUNCTION" }
		>;
		entities: Array<{ code: string; type: "USER" | "GROUP" | "ORGANIZATION" }>;
	};

	export type OrganizationSelect = {
		type: "ORGANIZATION_SELECT";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: Array<
			| { code: string; type: "ORGANIZATION" }
			| { code: "PRIMARY_ORGANIZATION()"; type: "FUNCTION" }
		>;
		entities: Array<{ code: string; type: "ORGANIZATION" }>;
	};

	/** グループ選択。**`FUNCTION` は無い**（公式の型の主張。実測でも現れていない） */
	export type GroupSelect = {
		type: "GROUP_SELECT";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		defaultValue: Array<{ code: string; type: "GROUP" }>;
		entities: Array<{ code: string; type: "GROUP" }>;
	};

	/**
	 * グループ（折りたたみ）。
	 *
	 * **中のフィールドを持たない。** `properties` にはグループ自身と、
	 * グループ内のフィールドが**平坦に並ぶ**。入れ子で持つのはレイアウト側だけ。
	 * `SUBTABLE` とはここが違う（あちらは `fields` を持つ）。
	 */
	export type Group = {
		type: "GROUP";
		code: string;
		label: string;
		noLabel: boolean;
		openGroup: boolean;
	};

	export type ReferenceTable = {
		type: "REFERENCE_TABLE";
		code: string;
		label: string;
		noLabel: boolean;
		referenceTable: {
			relatedApp: RelatedApp;
			condition: {
				field: string;
				relatedField: string;
			};
			filterCond: string;
			displayFields: string[];
			sort: string;
			size: "1" | "3" | "5" | "10" | "20" | "30" | "40" | "50";
		};
	};

	/**
	 * ルックアップのキーフィールド。
	 *
	 * **`type` が `"NUMBER" | "SINGLE_LINE_TEXT"` の 2 値。**
	 * 通常のフィールドと同じ値を取るので `type` では判別できず、
	 * このメンバが混ざることで `OneOf` は判別ユニオンでなくなる。
	 * 判別は `"lookup" in property` で行う。
	 *
	 * **通常プロパティを持たない**（2026-09-10 実測）。
	 * `maxLength` / `unique` / `defaultValue` / `expression` は付いてこない。
	 * 公式の型の主張どおりだった。
	 *
	 * `lookup.fieldMappings` の `field` は**同じアプリのフィールドコード**で、
	 * コピー先を列挙している。コピー先の判別に元アプリの権限は要らない。
	 */
	export type Lookup = {
		type: "NUMBER" | "SINGLE_LINE_TEXT";
		code: string;
		label: string;
		noLabel: boolean;
		required: boolean;
		lookup: {
			relatedApp: RelatedApp;
			relatedKeyField: string;
			fieldMappings: Array<{ field: string; relatedField: string }>;
			lookupPickerFields: string[];
			filterCond: string;
			sort: string;
		};
	};

	/** サブテーブルに入れられる種別 */
	export type InSubtable =
		| SingleLineText
		| Number
		| Calc
		| MultiLineText
		| RichText
		| Link
		| CheckBox
		| RadioButton
		| Dropdown
		| MultiSelect
		| File
		| Date
		| Time
		| DateTime
		| UserSelect
		| OrganizationSelect
		| GroupSelect
		| Lookup;

	export type Subtable<T extends { [fieldCode: string]: InSubtable }> = {
		type: "SUBTABLE";
		code: string;
		label: string;
		noLabel: boolean;
		fields: T;
	};

	export type OneOf =
		| RecordNumber
		| Creator
		| CreatedTime
		| Modifier
		| UpdatedTime
		| Category
		| Status
		| StatusAssignee
		| SingleLineText
		| Number
		| Calc
		| MultiLineText
		| RichText
		| Link
		| CheckBox
		| RadioButton
		| Dropdown
		| MultiSelect
		| File
		| Date
		| Time
		| DateTime
		| UserSelect
		| OrganizationSelect
		| GroupSelect
		| Group
		| ReferenceTable
		| Lookup
		| Subtable<{ [fieldCode: string]: InSubtable }>;
}

/**
 * `getFormLayout` が返すレイアウト。
 *
 * 名前は公式（`KintoneFormLayout`）に揃える。
 */
export namespace Layout {
	/** 行の中に置ける要素。フィールドとレイアウト要素の両方 */
	export namespace Element {
		type FieldWith<T extends string, S = { width: string }> = {
			type: T;
			code: string;
			size: S;
		};

		export type RecordNumber = FieldWith<"RECORD_NUMBER">;
		export type Creator = FieldWith<"CREATOR">;
		export type CreatedTime = FieldWith<"CREATED_TIME">;
		export type Modifier = FieldWith<"MODIFIER">;
		export type UpdatedTime = FieldWith<"UPDATED_TIME">;
		export type SingleLineText = FieldWith<"SINGLE_LINE_TEXT">;
		export type Number = FieldWith<"NUMBER">;
		export type Calc = FieldWith<"CALC">;
		export type MultiLineText = FieldWith<
			"MULTI_LINE_TEXT",
			{ width: string; innerHeight: string }
		>;
		export type RichText = FieldWith<
			"RICH_TEXT",
			{ width: string; innerHeight: string }
		>;
		export type Link = FieldWith<"LINK">;
		export type CheckBox = FieldWith<"CHECK_BOX">;
		export type RadioButton = FieldWith<"RADIO_BUTTON">;
		export type Dropdown = FieldWith<"DROP_DOWN">;
		export type MultiSelect = FieldWith<"MULTI_SELECT">;
		export type File = FieldWith<"FILE">;
		export type Date = FieldWith<"DATE">;
		export type Time = FieldWith<"TIME">;
		export type DateTime = FieldWith<"DATETIME">;
		export type UserSelect = FieldWith<"USER_SELECT">;
		export type OrganizationSelect = FieldWith<"ORGANIZATION_SELECT">;
		export type GroupSelect = FieldWith<"GROUP_SELECT">;

		/** 関連レコード一覧。**`size` を持たない**（公式の型の主張。実測でも無かった） */
		export type ReferenceTable = {
			type: "REFERENCE_TABLE";
			code: string;
		};

		/**
		 * ラベル。
		 *
		 * **`elementId` を持つ（2026-09-10 実測）。**
		 * 公式の型（`KintoneFormLayout.Field.Label`）は宣言していない。
		 * `updateFormLayout` に送っていないので kintone が付けて返している。
		 * 名前を付けていないラベルでは空文字列。
		 */
		export type Label = {
			type: "LABEL";
			label: string;
			elementId: string;
			size: { width: string };
		};

		/** 罫線。`Label` と同じく **`elementId` を持つ**（実測。公式の型には無い） */
		export type HR = {
			type: "HR";
			elementId: string;
			size: { width: string };
		};

		/**
		 * スペース。
		 *
		 * `elementId` が名前で、**名前を付けていなければ空文字列**（実測）。
		 * `getFieldElement` で掴めるのは名前を付けたスペースだけなので、
		 * 空文字列のものを捨てるかは利用者が決める。
		 */
		export type Spacer = {
			type: "SPACER";
			elementId: string;
			size: { width: string; height: string };
		};

		export type OneOf =
			| RecordNumber
			| Creator
			| CreatedTime
			| Modifier
			| UpdatedTime
			| SingleLineText
			| Number
			| Calc
			| MultiLineText
			| RichText
			| Link
			| CheckBox
			| RadioButton
			| Dropdown
			| MultiSelect
			| File
			| Date
			| Time
			| DateTime
			| UserSelect
			| OrganizationSelect
			| GroupSelect
			| ReferenceTable
			| Label
			| HR
			| Spacer;

		/**
		 * サブテーブルの中に置ける要素。
		 *
		 * 組み込みフィールド・関連レコード一覧・レイアウト要素は入らない
		 * （実測でもサブテーブルの中は 17 種のフィールドだけだった）。
		 */
		export type InSubtable = Exclude<
			OneOf,
			| RecordNumber
			| Creator
			| CreatedTime
			| Modifier
			| UpdatedTime
			| ReferenceTable
			| Label
			| HR
			| Spacer
		>;
	}

	export type Row<T extends Element.OneOf[] = Element.OneOf[]> = {
		type: "ROW";
		fields: T;
	};

	export type Subtable<T extends Element.InSubtable[] = Element.InSubtable[]> =
		{
			type: "SUBTABLE";
			code: string;
			fields: T;
		};

	/**
	 * グループ。
	 *
	 * **中身は `ROW` だけ。** `SUBTABLE` も入れ子の `GROUP` も入らない。
	 * これがフィールドの所属を「テーブル内 / グループ内 / どちらでもない」の
	 * 排他 3 択にする根拠（`docs/DECISIONS.md`「3. 所属の表し方」）。
	 *
	 * レイアウト要素（`SPACER` / `LABEL` / `HR`）は**置ける**
	 * （2026-09-10 実測。`updateFormLayout` が受け入れ、`getFormLayout` も返した）。
	 */
	export type Group<T extends Row[] = Row[]> = {
		type: "GROUP";
		code: string;
		layout: T;
	};

	export type OneOf = Row | Subtable | Group;
}

/** `getFormFields` の `properties` */
export type Properties = { [fieldCode: string]: Property.OneOf };

/** `getFormLayout` の `layout` */
export type FormLayout = Layout.OneOf[];
