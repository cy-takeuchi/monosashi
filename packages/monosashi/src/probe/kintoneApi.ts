/**
 * kintone グローバルへの最小限のアクセス。
 *
 * ## src/global.ts の型を使わない理由
 *
 * 実測は済み、正しい型は `src/global.ts` にある。それでもここは `any` のまま。
 *
 * 採取コードは**型が何を主張しているかと無関係に、実際の値を採る**ことが仕事で、
 * 測定対象の型を測定器が信じてしまうと循環する。
 * たとえば「一覧画面では get() が null を返す」も
 * 「submit.success の recordId は string」も、
 * 型を信じていたら採れなかった実測結果。
 *
 * 加えて `kintone.api` やモバイル名前空間 (`kintone.mobile.app`) は
 * `src/global.ts` が宣言していない。採取に必要な形だけをここで局所的に宣言する。
 */

declare const kintone: any;

export const isMobile = (): boolean =>
	location.pathname.indexOf("/k/m/") === 0 ||
	location.pathname.indexOf("/m/") !== -1;

const appNamespace = () => (isMobile() ? kintone.mobile.app : kintone.app);

export const getAppId = (): number | null => {
	try {
		return appNamespace().getId() ?? null;
	} catch {
		return null;
	}
};

export const getRecordId = (): number | null => {
	try {
		return appNamespace().record.getId() ?? null;
	} catch {
		return null;
	}
};

/** kintone.app.record.get()。events.on の中では動かないため、必ずボタン経由で呼ぶ */
export const getRecordViaJsApi = (): unknown => {
	const result = appNamespace().record.get();
	return result === null || result === undefined ? undefined : result.record;
};

/** kintone.api を 1 回呼ぶ。URL の組み立ても含めて 1 箇所にする */
const restGet = async (
	path: string,
	params: Record<string, unknown>,
): Promise<any> => {
	const url = kintone.api.url(path, true);
	return kintone.api(url, "GET", params);
};

export const getRecordViaRest = async (
	app: number,
	id: number,
): Promise<unknown> => (await restGet("/k/v1/record.json", { app, id })).record;

/** kintone.app.record.set()。events.on の中では動かないため、必ずボタン経由で呼ぶ */
export const setRecordViaJsApi = (record: unknown): void => {
	appNamespace().record.set({ record });
};

/**
 * 一覧画面用。event.records と突き合わせるため、
 * 画面が今表示しているのと同じ絞り込み条件で取得する。
 */
export const getRecordsViaRest = async (
	app: number,
	query: string,
): Promise<unknown> =>
	(await restGet("/k/v1/records.json", { app, query })).records;

export const getQueryCondition = (): string => {
	try {
		return appNamespace().getQueryCondition() ?? "";
	} catch {
		return "";
	}
};

/**
 * change イベントを登録するためのフィールドコード一覧。
 *
 * サブテーブル内のフィールドコードも含める。
 * getFormFields はテーブル内フィールドを入れ子で返すため、
 * トップレベルの Object.keys だけでは取りこぼす。
 */
/**
 * フォーム定義の properties。
 *
 * `getFieldCodes` と `getRequiredFields` が**同じ 1 本の API を
 * 別々に叩いていた**。採取のたびに 2 往復する必要は無い。
 */
const formProperties = async (
	app: number,
): Promise<
	Record<
		string,
		{ type?: string; code?: string; required?: boolean; fields?: object }
	>
> => (await restGet("/k/v1/app/form/fields.json", { app })).properties ?? {};

export const getFieldCodes = async (app: number): Promise<string[]> => {
	const properties = await formProperties(app);

	const codes: string[] = [];
	for (const [code, property] of Object.entries(properties)) {
		codes.push(code);
		if (property.type === "SUBTABLE" && property.fields !== undefined) {
			codes.push(...Object.keys(property.fields));
		}
	}
	return codes;
};

/**
 * 必須フィールドの一覧。フォーム定義から引く。
 *
 * kintone のフィールド入力欄には accessible name が無く、ラベルは隣接する
 * 別要素として描かれる（実測）。`getByRole` では掴めず、`.gaia-*` は使用禁止。
 * よって保存に必要な入力は DOM ではなく set() で行う。
 * どのフィールドが必須かはフォーム定義にしか無いので、ここで取る。
 *
 * サブテーブル内は見ない。表の中の必須は行を追加しなければ問われない。
 */
export const getRequiredFields = async (
	app: number,
): Promise<{ code: string; type: string }[]> => {
	const properties = await formProperties(app);

	const out: { code: string; type: string }[] = [];
	for (const [code, property] of Object.entries(properties)) {
		if (property.required !== true) continue;
		if (property.type === undefined) continue;
		out.push({ code, type: property.type });
	}
	return out;
};

export const headerElement = (): HTMLElement | null => {
	const app = appNamespace();
	const candidates = [
		() => app.record.getHeaderMenuSpaceElement?.(),
		() => app.getHeaderMenuSpaceElement?.(),
		() => app.getHeaderSpaceElement?.(),
	];
	for (const candidate of candidates) {
		try {
			const element = candidate();
			if (element) return element as HTMLElement;
		} catch {
			// この画面では使えない API。次を試す
		}
	}
	return null;
};

export const on = (events: string[], handler: (event: any) => any): void => {
	kintone.events.on(events, handler);
};
