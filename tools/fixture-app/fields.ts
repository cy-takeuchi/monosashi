import type { KintoneRestAPIClient } from "@kintone/rest-api-client";

/**
 * addFormFields が受け取る properties の型。
 * rest-api-client は "." しか export していないため深い import が使えない。
 * 公開 API のシグネチャから引き出すことで、パッケージ内部構造の変更に追従できる。
 */
type Properties = Parameters<
	KintoneRestAPIClient["app"]["addFormFields"]
>[0]["properties"];

/**
 * 検証アプリのフィールド定義。
 *
 * 方針（Q3・Q5）:
 *   - フィールド種別は間引かない。Lookup / 関連レコード / グループ / テーブルまで全て入れる
 *   - 未入力と入力済みの両方を測るため、必須・初期値は基本的に付けない
 *   - フィールドコードは ASCII。日本語コードでも動くが、分析スクリプトの可読性を優先
 *
 * addFormFields で作れないもの（アプリ設定由来）:
 *   STATUS / STATUS_ASSIGNEE ... updateProcessManagement で作る（build.ts）
 *   CATEGORY                 ... REST API が存在しない。手動設定（verify.ts が検出）
 */

/** ルックアップ / 関連レコードの参照先アプリ */
export const lookupAppFields: Properties = {
	key: {
		type: "SINGLE_LINE_TEXT",
		code: "key",
		label: "キー",
		noLabel: false,
		required: true,
		unique: true,
	},
	name: {
		type: "SINGLE_LINE_TEXT",
		code: "name",
		label: "名称",
		noLabel: false,
		required: false,
		unique: false,
	},
	amount: {
		type: "NUMBER",
		code: "amount",
		label: "金額",
		noLabel: false,
		required: false,
		unique: false,
	},
};

/** テーブル内に置けるフィールド種別（サブテーブル内の網羅） */
const inSubtableFields = {
	t_singleLineText: {
		type: "SINGLE_LINE_TEXT",
		code: "t_singleLineText",
		label: "文字列1行(表)",
		noLabel: false,
		required: false,
	},
	t_multiLineText: {
		type: "MULTI_LINE_TEXT",
		code: "t_multiLineText",
		label: "文字列複数行(表)",
		noLabel: false,
		required: false,
	},
	t_richText: {
		type: "RICH_TEXT",
		code: "t_richText",
		label: "リッチ(表)",
		noLabel: false,
		required: false,
	},
	t_number: {
		type: "NUMBER",
		code: "t_number",
		label: "数値(表)",
		noLabel: false,
		required: false,
	},
	t_calc: {
		type: "CALC",
		code: "t_calc",
		label: "計算(表)",
		noLabel: false,
		required: false,
		expression: "t_number * 2",
		format: "NUMBER",
	},
	t_checkBox: {
		type: "CHECK_BOX",
		code: "t_checkBox",
		label: "チェック(表)",
		noLabel: false,
		required: false,
		options: {
			a: { label: "a", index: "0" },
			b: { label: "b", index: "1" },
		},
		defaultValue: [],
		align: "HORIZONTAL",
	},
	t_radioButton: {
		type: "RADIO_BUTTON",
		code: "t_radioButton",
		label: "ラジオ(表)",
		noLabel: false,
		required: false,
		options: {
			x: { label: "x", index: "0" },
			y: { label: "y", index: "1" },
		},
		defaultValue: "x",
		align: "HORIZONTAL",
	},
	t_dropDown: {
		type: "DROP_DOWN",
		code: "t_dropDown",
		label: "ドロップダウン(表)",
		noLabel: false,
		required: false,
		options: {
			p: { label: "p", index: "0" },
			q: { label: "q", index: "1" },
		},
		defaultValue: "",
	},
	t_multiSelect: {
		type: "MULTI_SELECT",
		code: "t_multiSelect",
		label: "複数選択(表)",
		noLabel: false,
		required: false,
		options: {
			m: { label: "m", index: "0" },
			n: { label: "n", index: "1" },
		},
		defaultValue: [],
	},
	t_date: {
		type: "DATE",
		code: "t_date",
		label: "日付(表)",
		noLabel: false,
		required: false,
		defaultValue: "",
		defaultNowValue: false,
		unique: false,
	},
	t_time: {
		type: "TIME",
		code: "t_time",
		label: "時刻(表)",
		noLabel: false,
		required: false,
		defaultValue: "",
		defaultNowValue: false,
	},
	t_dateTime: {
		type: "DATETIME",
		code: "t_dateTime",
		label: "日時(表)",
		noLabel: false,
		required: false,
		defaultValue: "",
		defaultNowValue: false,
		unique: false,
	},
	t_link: {
		type: "LINK",
		code: "t_link",
		label: "リンク(表)",
		noLabel: false,
		required: false,
		protocol: "WEB",
		unique: false,
	},
	t_file: {
		type: "FILE",
		code: "t_file",
		label: "添付(表)",
		noLabel: false,
		required: false,
	},
	t_userSelect: {
		type: "USER_SELECT",
		code: "t_userSelect",
		label: "ユーザー(表)",
		noLabel: false,
		required: false,
		entities: [],
		defaultValue: [],
	},
	t_organizationSelect: {
		type: "ORGANIZATION_SELECT",
		code: "t_organizationSelect",
		label: "組織(表)",
		noLabel: false,
		required: false,
		entities: [],
		defaultValue: [],
	},
	t_groupSelect: {
		type: "GROUP_SELECT",
		code: "t_groupSelect",
		label: "グループ(表)",
		noLabel: false,
		required: false,
		entities: [],
		defaultValue: [],
	},
} as const;

/**
 * 測定用アプリのフィールド。
 * lookupAppId はルックアップ / 関連レコードの参照先なので実行時に差し込む。
 */
export const fixtureAppBaseFields = (): Properties =>
	({
		// システムフィールド (RECORD_NUMBER / CREATOR / CREATED_TIME / MODIFIER /
		// UPDATED_TIME) はここに書けない。組み込みで既に存在しており、
		// addFormFields に渡すと「組み込みのフィールドは指定できません」で弾かれる。
		// フォームへの配置は layout.ts で行い、コードは getFormFields から type 引きで得る
		// （コードは環境の言語に依存するため決め打ちできない）。

		// --- 文字列系 ---
		singleLineText: {
			type: "SINGLE_LINE_TEXT",
			code: "singleLineText",
			label: "文字列1行",
			noLabel: false,
			required: false,
			unique: false,
		},
		singleLineTextRequired: {
			type: "SINGLE_LINE_TEXT",
			code: "singleLineTextRequired",
			label: "文字列1行(必須)",
			noLabel: false,
			required: true,
			unique: false,
		},
		singleLineTextUnique: {
			type: "SINGLE_LINE_TEXT",
			code: "singleLineTextUnique",
			label: "文字列1行(重複禁止)",
			noLabel: false,
			required: false,
			unique: true,
		},
		multiLineText: {
			type: "MULTI_LINE_TEXT",
			code: "multiLineText",
			label: "文字列複数行",
			noLabel: false,
			required: false,
		},
		richText: {
			type: "RICH_TEXT",
			code: "richText",
			label: "リッチエディター",
			noLabel: false,
			required: false,
		},

		// --- 数値・計算 ---
		number: {
			type: "NUMBER",
			code: "number",
			label: "数値",
			noLabel: false,
			required: false,
			unique: false,
			digit: false,
		},
		calc: {
			type: "CALC",
			code: "calc",
			label: "計算",
			noLabel: false,
			required: false,
			expression: "number * 2",
			format: "NUMBER",
		},
		calcDateTime: {
			type: "CALC",
			code: "calcDateTime",
			label: "計算(日時)",
			noLabel: false,
			required: false,
			expression: "dateTime",
			format: "DATETIME",
		},

		// --- 選択系 ---
		checkBox: {
			type: "CHECK_BOX",
			code: "checkBox",
			label: "チェックボックス",
			noLabel: false,
			required: false,
			options: {
				sample1: { label: "sample1", index: "0" },
				sample2: { label: "sample2", index: "1" },
				sample3: { label: "sample3", index: "2" },
			},
			defaultValue: [],
			align: "HORIZONTAL",
		},
		radioButton: {
			type: "RADIO_BUTTON",
			code: "radioButton",
			label: "ラジオボタン",
			noLabel: false,
			required: false,
			options: {
				one: { label: "one", index: "0" },
				two: { label: "two", index: "1" },
			},
			defaultValue: "one",
			align: "HORIZONTAL",
		},
		dropDown: {
			type: "DROP_DOWN",
			code: "dropDown",
			label: "ドロップダウン",
			noLabel: false,
			required: false,
			options: {
				alpha: { label: "alpha", index: "0" },
				beta: { label: "beta", index: "1" },
			},
			defaultValue: "",
		},
		dropDownWithDefault: {
			type: "DROP_DOWN",
			code: "dropDownWithDefault",
			label: "ドロップダウン(初期値あり)",
			noLabel: false,
			required: false,
			options: {
				alpha: { label: "alpha", index: "0" },
				beta: { label: "beta", index: "1" },
			},
			defaultValue: "alpha",
		},
		multiSelect: {
			type: "MULTI_SELECT",
			code: "multiSelect",
			label: "複数選択",
			noLabel: false,
			required: false,
			options: {
				red: { label: "red", index: "0" },
				blue: { label: "blue", index: "1" },
			},
			defaultValue: [],
		},

		// --- 日時系 ---
		date: {
			type: "DATE",
			code: "date",
			label: "日付",
			noLabel: false,
			required: false,
			defaultValue: "",
			defaultNowValue: false,
			unique: false,
		},
		time: {
			type: "TIME",
			code: "time",
			label: "時刻",
			noLabel: false,
			required: false,
			defaultValue: "",
			defaultNowValue: false,
		},
		dateTime: {
			type: "DATETIME",
			code: "dateTime",
			label: "日時",
			noLabel: false,
			required: false,
			defaultValue: "",
			defaultNowValue: false,
			unique: false,
		},

		// --- その他 ---
		link: {
			type: "LINK",
			code: "link",
			label: "リンク",
			noLabel: false,
			required: false,
			protocol: "WEB",
			unique: false,
		},
		linkMail: {
			type: "LINK",
			code: "linkMail",
			label: "リンク(メール)",
			noLabel: false,
			required: false,
			protocol: "MAIL",
			unique: false,
		},
		file: {
			type: "FILE",
			code: "file",
			label: "添付ファイル",
			noLabel: false,
			required: false,
		},

		// --- 選択エンティティ系 ---
		userSelect: {
			type: "USER_SELECT",
			code: "userSelect",
			label: "ユーザー選択",
			noLabel: false,
			required: false,
			entities: [],
			defaultValue: [],
		},
		organizationSelect: {
			type: "ORGANIZATION_SELECT",
			code: "organizationSelect",
			label: "組織選択",
			noLabel: false,
			required: false,
			entities: [],
			defaultValue: [],
		},
		groupSelect: {
			type: "GROUP_SELECT",
			code: "groupSelect",
			label: "グループ選択",
			noLabel: false,
			required: false,
			entities: [],
			defaultValue: [],
		},

		// --- ルックアップのコピー先 ---
		// キーフィールド (lookupKey) は fixtureAppDependentFields 側で後から追加する。
		// fieldMappings がここのフィールドを参照するため、先に存在している必要がある。
		lookupCopyName: {
			type: "SINGLE_LINE_TEXT",
			code: "lookupCopyName",
			label: "ルックアップコピー(名称)",
			noLabel: false,
			required: false,
			unique: false,
		},
		lookupCopyAmount: {
			type: "NUMBER",
			code: "lookupCopyAmount",
			label: "ルックアップコピー(金額)",
			noLabel: false,
			required: false,
			unique: false,
		},

		// --- グループ（record に出ないことの確認が目的） ---
		group: {
			type: "GROUP",
			code: "group",
			label: "グループ",
			noLabel: false,
			openGroup: true,
		},
		inGroupText: {
			type: "SINGLE_LINE_TEXT",
			code: "inGroupText",
			label: "グループ内文字列",
			noLabel: false,
			required: false,
			unique: false,
		},

		// --- サブテーブル ---
		subtable: {
			type: "SUBTABLE",
			code: "subtable",
			label: "テーブル",
			noLabel: false,
			fields: inSubtableFields,
		},
	}) as unknown as Properties;

/**
 * 他フィールドを参照するため、後から追加する必要があるフィールド。
 *
 * ルックアップの fieldMappings は参照先フィールドが、
 * 関連レコード一覧の condition.field は自アプリのフィールドが、
 * それぞれ既に存在していないと CB_VA01 で弾かれる。
 * 1回の addFormFields にまとめられないのはこのため。
 */
export const fixtureAppDependentFields = (lookupAppId: string): Properties =>
	({
		lookupKey: {
			type: "SINGLE_LINE_TEXT",
			code: "lookupKey",
			label: "ルックアップ",
			noLabel: false,
			required: false,
			unique: false,
			lookup: {
				relatedApp: { app: lookupAppId },
				relatedKeyField: "key",
				fieldMappings: [
					{ field: "lookupCopyName", relatedField: "name" },
					{ field: "lookupCopyAmount", relatedField: "amount" },
				],
				lookupPickerFields: ["key", "name"],
				filterCond: "",
				sort: "",
			},
		},
		referenceTable: {
			type: "REFERENCE_TABLE",
			code: "referenceTable",
			label: "関連レコード一覧",
			noLabel: false,
			referenceTable: {
				relatedApp: { app: lookupAppId },
				condition: { field: "singleLineText", relatedField: "name" },
				filterCond: "",
				displayFields: ["key", "name"],
				sort: "key asc",
				size: "5",
			},
		},
	}) as unknown as Properties;

/** 検証で使う全フィールドコード */
export const allFixtureFieldCodes = (lookupAppId: string): string[] => [
	...Object.keys(fixtureAppBaseFields()),
	...Object.keys(fixtureAppDependentFields(lookupAppId)),
];

export const subtableFieldCodes = Object.keys(inSubtableFields);

/**
 * フォームに配置したい組み込みフィールドの type。
 * コードは環境の言語で変わるので、getFormFields の結果から type で引く。
 */
export const builtInFieldTypes = [
	"RECORD_NUMBER",
	"CREATOR",
	"CREATED_TIME",
	"MODIFIER",
	"UPDATED_TIME",
] as const;
