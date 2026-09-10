/**
 * 採取したフォーム定義から、環境ごと・実行ごとに変わる値を伏せる。
 *
 * 方針は `tools/fixture/normalize.ts` と同じ。
 *
 *  - **値そのものは伏せない。** 伏せるのは「変わって当然」と分かっているものだけを列挙する
 *  - **空文字は空文字のまま残す。** `""` と非空の区別が型の根拠になる
 *    （`SPACER` の名前なしが `""` で返るのかは、この採取の測定対象そのもの）
 *  - **フィールドコードは伏せない。** 組み込みのコードは環境の言語で変わるが、
 *    伏せるとフィクスチャが読めなくなる。`measured.json` も同じ扱い
 *
 * ## 伏せるもの
 *
 * | | 理由 |
 * |---|---|
 * | `revision`（fields / layout の両方） | デプロイごとに進む |
 * | `at` | 採取時刻 |
 * | `lookup.relatedApp.app` / `referenceTable.relatedApp.app` | アプリ ID は環境ごとに違う |
 * | ユーザー / 組織 / グループの `code` / `name` | 個人を特定しうる |
 *
 * ## キーの順序を揃える
 *
 * `getFormFields` の `properties` はオブジェクトなので、キーの順序が
 * 実行ごとに変わりうる。定期ライブ検証は diff で見るので、順序が揺れると
 * 毎回差分が出てやがて誰も見なくなる。**`properties` はキーで並べ替える。**
 *
 * 一方 **`layout` は並べ替えない。** レイアウトの順序は測定対象そのもの
 * （kisekae がレイアウト順に並べて返すことの根拠になる）。
 *
 * ## 入力を `unknown` で受ける
 *
 * 採取側（`tools/fixture-app/collectForm.ts`）は `@kintone/rest-api-client` の
 * 型を付けて採るが、ここでは型を信じない。**公式の型が外れていることを
 * 測るための仕組み**なので、型に沿って分岐すると、外れていた場合に
 * アプリ ID が伏せられずに残る。判定はキーの有無で行う。
 */

export const PLACEHOLDER = {
	revision: "<revision>",
	at: "<at>",
	appId: "<app-id>",
	entityCode: "<entity-code>",
	entityName: "<entity-name>",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** 空文字は残す */
const maskString = (value: unknown, to: string): unknown =>
	typeof value === "string" && value !== "" ? to : value;

/**
 * キーを並べ替える。
 *
 * `localeCompare` は使わない。ロケール依存なので、走らせた環境で
 * 並び順が変わりうる。伏せる目的は「毎回同じファイルが出ること」なので、
 * コードポイント比較にする。
 */
const sortKeys = (record: Record<string, unknown>): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
	);

const mapValues = (
	record: Record<string, unknown>,
	fn: (value: unknown) => unknown,
): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(record).map(([key, value]) => [key, fn(value)]),
	);

/**
 * ユーザー / 組織 / グループ。
 *
 * **`type: "FUNCTION"` は伏せない。** `{ type: "FUNCTION", code: "LOGINUSER()" }` の
 * `code` は kintone の関数名そのもので、個人情報ではなく**測定の対象**。
 * 一律に伏せると「初期値にログインユーザーが指定されている」という情報が消える。
 */
const maskEntityList = (value: unknown): unknown => {
	if (!Array.isArray(value)) return value;
	return value.map((item: unknown) => {
		if (!isRecord(item)) return item;
		if (item.type === "FUNCTION") return item;
		const masked: Record<string, unknown> = {
			...item,
			code: maskString(item.code, PLACEHOLDER.entityCode),
		};
		// キーの有無を壊さない。name を持たない形で返る場合もある
		if ("name" in item) {
			masked.name = maskString(item.name, PLACEHOLDER.entityName);
		}
		return masked;
	});
};

/** 参照先アプリ。`code` はスペース内アプリのコードで空文字列のことがあるので残す */
const maskRelatedApp = (value: unknown): unknown => {
	if (!isRecord(value)) return value;
	return { ...value, app: maskString(value.app, PLACEHOLDER.appId) };
};

/** フィールド 1 つ分 */
const maskProperty = (property: unknown): unknown => {
	if (!isRecord(property)) return property;
	const masked: Record<string, unknown> = { ...property };

	if (isRecord(masked.lookup)) {
		masked.lookup = {
			...masked.lookup,
			relatedApp: maskRelatedApp(masked.lookup.relatedApp),
		};
	}
	if (isRecord(masked.referenceTable)) {
		masked.referenceTable = {
			...masked.referenceTable,
			relatedApp: maskRelatedApp(masked.referenceTable.relatedApp),
		};
	}
	if ("entities" in masked) {
		masked.entities = maskEntityList(masked.entities);
	}
	if (
		masked.type === "USER_SELECT" ||
		masked.type === "ORGANIZATION_SELECT" ||
		masked.type === "GROUP_SELECT"
	) {
		masked.defaultValue = maskEntityList(masked.defaultValue);
	}
	// サブテーブル内のフィールド。ここもキーで並べ替える
	if (isRecord(masked.fields)) {
		masked.fields = sortKeys(mapValues(masked.fields, maskProperty));
	}
	return masked;
};

const normalizeApp = (app: unknown): unknown => {
	if (!isRecord(app)) return app;
	const fields = isRecord(app.fields) ? app.fields : {};
	const layout = isRecord(app.layout) ? app.layout : {};

	return {
		role: app.role,
		fields: {
			revision: maskString(fields.revision, PLACEHOLDER.revision),
			properties: isRecord(fields.properties)
				? sortKeys(mapValues(fields.properties, maskProperty))
				: fields.properties,
		},
		layout: {
			revision: maskString(layout.revision, PLACEHOLDER.revision),
			// 並べ替えない。順序が測定対象
			layout: layout.layout,
		},
	};
};

type NormalizedForm = {
	version: 1;
	at: string;
	apps: unknown[];
};

export const normalizeForm = (raw: unknown): NormalizedForm => {
	if (!isRecord(raw) || !Array.isArray(raw.apps)) {
		throw new Error(
			"採取結果の形が想定と違います（apps の配列がありません）。pnpm run app:collect-form で採り直してください。",
		);
	}
	return {
		version: 1,
		at: PLACEHOLDER.at,
		apps: raw.apps.map((app: unknown) => normalizeApp(app)),
	};
};

/** ログ用。正規化後のフィールド件数を役割ごとに数える */
export const countFields = (
	normalized: NormalizedForm,
): { role: string; count: number }[] =>
	normalized.apps.map((app) => {
		if (!isRecord(app) || !isRecord(app.fields)) {
			return { role: "?", count: 0 };
		}
		const properties = app.fields.properties;
		return {
			role: String(app.role),
			count: isRecord(properties) ? Object.keys(properties).length : 0,
		};
	});
