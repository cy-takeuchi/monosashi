/**
 * kintone JS API が受け渡す値の型。
 *
 * ## 根拠は公式ドキュメント。実測ではない
 *
 * このファイルの型は
 * [kintone JavaScript API](https://cybozu.dev/ja/kintone/docs/js-api/)
 * を読んで書いたもので、**実測していない**。
 *
 * `fixtures/measured.json` が根拠になっているのは
 * **レコードの値**（`Saved` / `Editing` / `Rest`）と**イベントの形**だけ。
 * `kintone.app.get()` が本当にこの形を返すかは確かめていない。
 *
 * 実測とドキュメントを混ぜないために、ファイルを分けてある。
 * 型を直すときも、どちらの根拠に属するかで直し方が変わる
 * （実測なら採り直す。ドキュメントなら読み直す）。
 *
 * @see https://cybozu.dev/ja/kintone/docs/js-api/
 */

export namespace Api {
	// **DOM の型はここに置く。** 以前は名前空間の外に `export type DomElement`
	// として置いていたが、`package.json` の `exports` は `.` と `./kintone` の
	// 2 つだけなので、**利用者からは名前で参照できなかった**
	// （`Api.DialogConfig["body"]` 経由でしか触れない）。
	// `Api` の中に入れれば `Api.DomElement` として届く
	/**
	 * DOM の `Element`。**DOM の型が無い環境でも解決できる形にする。**
	 *
	 * `Element` を直接書くと `dist/types/jsApi.d.ts` がそれを参照し、
	 * `lib` に DOM を入れていない利用者（AWS Lambda など）で
	 * `TS2304: Cannot find name 'Element'` になる。
	 *
	 * `skipLibCheck: true`（TypeScript の既定）では出ないが、
	 * **既定に頼らないのがこのリポジトリの方針**（README「検出できない any」）。
	 *
	 * `globalThis` に `Element` が在るかで分岐する。
	 * ブラウザでは本物の `Element` に、Node では最小形に落ちる。
	 * 最小形でも `document.createElement()` の戻りは構造的に代入できる。
	 */
	export type DomElement = typeof globalThis extends {
		Element: abstract new (...args: never) => infer T;
	}
		? T
		: { readonly nodeType: number; readonly nodeName: string };

	/** DOM の `Blob`。分岐する理由は {@link DomElement} と同じ */
	export type DomBlob = typeof globalThis extends {
		Blob: abstract new (...args: never) => infer T;
	}
		? T
		: { readonly size: number; readonly type: string };

	/** 画面の種類。`getPageType` と `buildPageUrl` が使う */
	export type PageName =
		| "APP_INDEX"
		| "APP_CREATE"
		| "APP_DETAIL"
		| "APP_EDIT"
		| "APP_PRINT"
		| "APP_REPORT"
		| "APP_INDEX_MOBILE"
		| "APP_CREATE_MOBILE"
		| "APP_DETAIL_MOBILE"
		| "APP_EDIT_MOBILE"
		| "APP_REPORT_MOBILE"
		| "PORTAL_TOP"
		| "PORTAL_TOP_MOBILE"
		| "SPACE_PORTAL"
		| "SPACE_THREAD"
		| "SPACE_PORTAL_MOBILE"
		| "SPACE_THREAD_MOBILE"
		| "PEOPLE_TOP"
		| "PEOPLE_TOP_MOBILE"
		| "MESSAGE_TOP"
		| "MESSAGE_TOP_MOBILE"
		| "SEARCH_TOP"
		| "SEARCH_TOP_MOBILE"
		| "NOTIFICATION_TOP"
		| "APP_MARKETPLACE_TOP"
		| "APP_MARKETPLACE_CATEGORY"
		| "APP_MARKETPLACE_SEARCH"
		| "APP_MARKETPLACE_DETAIL"
		| "APP_SETTINGS_PLUGIN_SETTINGS";

	/** `getPageType` が返す、画面の種別と具体的な画面 */
	export type PageType = {
		type:
			| "APP"
			| "PORTAL"
			| "SPACE"
			| "PEOPLE"
			| "MESSAGE"
			| "SEARCH"
			| "NOTIFICATION"
			| "APP_MARKETPLACE"
			| "APP_SETTINGS";
		page: PageName;
	};

	/** 表示・非表示。`show*` と `get*DisplayState` の既定の値 */
	export type Visibility = "VISIBLE" | "HIDDEN";

	/** ログインユーザー。`getLoginUser` は同期で返る */
	export type LoginUser = {
		id: string;
		code: string;
		name: string;
		email: string;
		url: string;
		employeeNumber: string;
		phone: string;
		mobilePhone: string;
		extensionNumber: string;
		timezone: string;
		isGuest: boolean;
		language: "ja" | "en" | "zh" | "zh-TW" | "es" | "pt-BR" | "th" | "ms";
	};

	/** ユーザー・組織・グループに共通する識別子の組 */
	export type Entity = { code: string; name: string };

	/** `user.getOrganizations` の 1 件。役職は付いていないことがある */
	export type UserOrganization = {
		organization: { id: string; code: string; name: string; primary: boolean };
		title: { id: string; code: string; name: string } | null;
	};

	/** `user.getCustomFields` の 1 件。`USER_SELECT` のときだけ value がオブジェクト */
	export type CustomField = {
		code: string;
		name: string;
		type: "SINGLE_LINE_TEXT" | "USER_SELECT";
		value: string | Entity;
		visibility: "PUBLIC" | "PRIVATE";
	};

	/** `getUserPreference` が返す個人設定 */
	export type UserPreference = {
		timeFormat: "TWELVE" | "TWENTY_FOUR";
		desktopNotifications: { enabled: boolean };
		emailNotifications: {
			enabled: boolean;
			condition: "TO_ME" | "ALL";
			format: "HTML" | "TEXT";
		};
	};

	/** `app.get()` が返すアプリの設定 */
	export type AppInfo = {
		id: string;
		name: string;
		description: string;
		code: string;
		numberPrecision: {
			digits: string;
			decimalPlaces: string;
			roundingMode: "HALF_EVEN" | "UP" | "DOWN";
		};
		enableComments: boolean;
		enableThumbnails: boolean;
		enableChangeHistory: boolean;
		enableInlineRecordEditing: boolean;
		createdAt: string;
		creator: Entity;
		modifiedAt: string;
		modifier: Entity;
		spaceId: string | null;
		revision: string;
	};

	/**
	 * `app.getFormFields()` が返すフィールドの設定。
	 *
	 * **レコードの値の型ではない。** フォーム設定のほうで、
	 * 種別ごとに持つプロパティが違う。
	 * ここは実測の対象外なので、共通部分だけを型にして残りは緩くしてある。
	 * 厳密な型が要るなら `kintone-pretty-fields` を併用する
	 * （monosashi はフォーム設定を守備範囲にしていない）。
	 */
	export type FormField = {
		type: string;
		code: string;
		label: string;
		noLabel?: boolean;
		required?: boolean;
		[property: string]: unknown;
	};

	/** `app.getFormLayout()` が返すフォームの配置 */
	export type FormLayout = {
		layout: {
			type: string;
			code?: string;
			fields?: { type: string; code?: string; size?: Record<string, string> }[];
			layout?: unknown[];
			[property: string]: unknown;
		}[];
	};

	/** 一覧の設定。`getView` は表示中のもの、`getViews` は一覧そのもの */
	export type View = {
		type: "LIST" | "CALENDAR" | "CUSTOM";
		builtinType?: "ASSIGNEE" | "ALL";
		name: string;
		id: string;
		fields?: string[];
		date?: string;
		title?: string;
		html?: string;
		pager?: boolean;
		device?: "DESKTOP" | "ANY";
		filterCond: string;
		sort: string;
	};

	/** `getReports` の 1 件 */
	export type Report = {
		name: string;
		id: string;
		chartType:
			| "BAR"
			| "COLUMN"
			| "PIE"
			| "LINE"
			| "PIVOT_TABLE"
			| "TABLE"
			| "AREA"
			| "SPLINE"
			| "SPLINE_AREA";
		periodicReport: boolean;
	};

	/** `app.getStatus()` が返すプロセス管理の設定 */
	export type ProcessStatus = {
		enable: boolean;
		stages: { name: string; fixed: boolean }[];
		actions: { name: string; from: string; to: string }[];
	};

	/** `app.getCategories()` が返すカテゴリーの設定 */
	export type Categories = {
		enabled: boolean;
		categories: {
			[name: string]: { name: string; index: string; children: unknown };
		};
	};

	/** `record.getStatusActions()` の 1 件。次の状態と作業者が付く */
	export type StatusAction = {
		name: string;
		nextStatus: {
			name: string;
			type: "ONE" | "ALL" | "ANY";
			assignees: Entity[];
		};
	};

	/** `record.getStatusHistory()` の 1 件 */
	export type StatusHistory = {
		changedAt: string;
		assignees: Entity[];
		status: string;
	};

	/** `record.getAssignees()` の 1 件。まだ作業していなければ action は null */
	export type Assignee = { assignee: Entity; action: string | null };

	/** 文字と装飾の指定。`setFieldStyle` などが受け取る */
	export type ContentStyle = {
		backgroundColor?: string;
		color?: string;
		fontWeight?: "normal" | "bold";
		textDecoration?: "none" | "underline" | "line-through";
		borderColor?: string;
	};

	/** `record.getFieldStyle()` が返す、いま当たっているスタイル */
	export type FieldStyle = {
		content: Required<ContentStyle>;
		background: { backgroundColor: string };
		label: { color: string; fontWeight: string; textDecoration: string };
	};

	/** `record.setFieldStyle()` に渡す指定。"DEFAULT" で元に戻す */
	export type FieldStyleConfig =
		| {
				content?: ContentStyle | "DEFAULT";
				background?: { backgroundColor?: string } | "DEFAULT";
				label?:
					| Omit<ContentStyle, "backgroundColor" | "borderColor">
					| "DEFAULT";
		  }
		| "DEFAULT";

	/** 一覧のセル 1 つ分のスタイル */
	export type RecordListCellStyle = {
		columnType?: "FIELD" | "ACTION";
		column?: string;
		content?: ContentStyle | "DEFAULT";
		background?: { backgroundColor?: string } | "DEFAULT";
	};

	/** `app.setRecordListStyle()` に渡す指定 */
	export type RecordListStyleConfig =
		| {
				header?: RecordListCellStyle[] | "DEFAULT";
				body?:
					| { recordId?: string; style?: RecordListCellStyle[] | "DEFAULT" }[]
					| "DEFAULT";
		  }
		| "DEFAULT";

	/** `app.getRecordListStyle()` が返す、いま当たっているスタイル */
	export type RecordListStyle = {
		header: RecordListCellStyle[];
		body: { recordId: string; style: RecordListCellStyle[] }[];
	};

	/** `setKeyboardShortcuts()` に渡す指定。true / false で一括指定もできる */
	export type KeyboardShortcuts =
		| boolean
		| {
				SHOW_RECORD?: boolean;
				FOCUS_SEARCH_BOX?: boolean;
				SHORTCUTS_HELP?: boolean;
				CREATE_RECORD?: boolean;
				EDIT_RECORD?: boolean;
				NEXT_RECORD?: boolean;
				PREVIOUS_RECORD?: boolean;
				NEXT_PAGE?: boolean;
				PREVIOUS_PAGE?: boolean;
				CANCEL_EDITING?: boolean;
				SHOW_VIEW?: boolean;
				SHOW_FILTER?: boolean;
				SAVE_RECORD?: boolean;
		  };

	/** ダイアログの操作結果 */
	export type DialogAction = "OK" | "CANCEL" | "CLOSE";

	/** `showConfirmDialog()` / `showConfirmBottomSheet()` に渡す指定 */
	export type ConfirmDialogConfig = {
		title?: string;
		body?: string;
		showOkButton?: boolean;
		okButtonText?: string;
		showCancelButton?: boolean;
		cancelButtonText?: string;
		showCloseButton?: boolean;
	};

	/** `createDialog()` / `createBottomSheet()` に渡す指定。body に DOM を置ける */
	export type DialogConfig = {
		title?: string;
		body?: DomElement;
		showOkButton?: boolean;
		okButtonText?: string;
		showCancelButton?: boolean;
		cancelButtonText?: string;
		showCloseButton?: boolean;
		beforeClose?: (
			action: DialogAction,
		) => boolean | Promise<boolean> | undefined;
	};

	/** `createDialog()` が返すハンドル */
	export type Dialog = {
		show(): Promise<DialogAction | "FUNCTION">;
		close(): void;
	};

	/** REST API / 外部 API に渡せる HTTP メソッド */
	export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

	/** `proxy()` の戻り。本文・ステータス・レスポンスヘッダーの 3 つ組 */
	export type ProxyResponse = [
		body: string,
		status: number,
		headers: Record<string, string>,
	];

	/** `proxy.upload()` に渡すファイル */
	export type ProxyUploadData = { format: "RAW"; value: DomBlob };
}
