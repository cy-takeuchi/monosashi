/**
 * kintone グローバルへの最小限のアクセス。
 *
 * ## `src/kintone.ts` の型を使わない理由
 *
 * 実測は済み、正しい型は `src/kintone.ts` にある。それでもここは自前で宣言する。
 *
 * 採取コードは**型が何を主張しているかと無関係に、実際の値を採る**ことが仕事で、
 * 測定対象の型を測定器が信じてしまうと循環する。
 * たとえば「一覧画面では get() が null を返す」も
 * 「submit.success の recordId は string」も、
 * 型を信じていたら採れなかった実測結果。
 *
 * 加えて `kintone.api` やモバイル名前空間 (`kintone.mobile.app`) は
 * `src/kintone.ts` が宣言していない。採取に必要な形だけをここで局所的に宣言する。
 *
 * ## `any` ではなく `unknown` で書く
 *
 * 以前ここは `declare const kintone: any;` だった。
 * **「信じない」を `any` で表すのは間違っている。**
 *
 * | | 意味 | 採取コードにとって |
 * |---|---|---|
 * | `any` | 何でも通す | 綴りを間違えても通る。空振りが静かに残る |
 * | `unknown` | 形が分からない | 読むときに必ず形を書くことになる |
 *
 * 測定器に要るのは後者。`appNamespace().record.gett()` のような打ち間違いは
 * `any` だと実行時まで分からず、**その画面の採取が丸ごと空振りする**。
 * しかも `set()` の失敗は例外にならないので、空振りは表に出てこない。
 *
 * ## どこまで形を書くか
 *
 * **測定対象は `unknown`、測定対象でないものは形を書く。**
 *
 * レコードの値とイベントの中身は測っているものなので `unknown` のまま渡し、
 * ここでは正規化も判定もしない。一方アプリ ID やヘッダ要素は測定の対象ではなく、
 * 採取を成立させるための足場なので、形を書いてよい。
 */

/** 測定対象でない足場。PC とモバイルで同じ形を持つ */
type AppNamespace = {
	getId: () => number | null | undefined;
	getQueryCondition: () => string | null | undefined;
	getHeaderMenuSpaceElement?: () => Element | null;
	getHeaderSpaceElement?: () => Element | null;
	record: {
		getId: () => number | null | undefined;
		/** **中身は測定対象なので `unknown`。** 一覧画面では null が返る（実測） */
		get: () => { record?: unknown } | null | undefined;
		set: (value: { record: unknown }) => void;
		getHeaderMenuSpaceElement?: () => Element | null;
	};
};

/**
 * `kintone.events.on` のハンドラが受け取るもの。
 *
 * **中身は測定対象なので `unknown`。** ただし `type` だけは分岐に要る
 * （どのイベントとして記録するかを決める）ので書く。
 * `error` は submit を止めるために**こちらが設定して返す**ものなので書く。
 */
type ProbeEvent = {
	type: string;
	record?: unknown;
	records?: unknown;
	changes?: unknown;
	error?: string;
};

declare const kintone: {
	app: AppNamespace;
	mobile: { app: AppNamespace };
	events: {
		on: (events: string[], handler: (event: ProbeEvent) => unknown) => void;
	};
	/** 返る形は測定対象。オブジェクトであることだけ `restGet` が確かめる */
	api: {
		(url: string, method: string, params: object): Promise<unknown>;
		url: (path: string, detectGuestSpace: boolean) => string;
	};
};

export const isMobile = (): boolean =>
	location.pathname.indexOf("/k/m/") === 0 ||
	location.pathname.indexOf("/m/") !== -1;

const appNamespace = (): AppNamespace =>
	isMobile() ? kintone.mobile.app : kintone.app;

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

/**
 * kintone.api を 1 回呼ぶ。URL の組み立ても含めて 1 箇所にする。
 *
 * **トップレベルがオブジェクトであることだけ確かめる。** 中身は測定対象なので
 * 見ない。ここで落とすのは、オブジェクトでないものが返ったときに
 * `undefined` が伝播して「採れたが空だった」という誤った実測にしないため。
 */
const restGet = async (
	path: string,
	params: object,
): Promise<Record<string, unknown>> => {
	const url = kintone.api.url(path, true);
	const response = await kintone.api(url, "GET", params);
	if (typeof response !== "object" || response === null) {
		throw new Error(
			`${path} の応答がオブジェクトではありません: ${String(response)}`,
		);
	}
	return response as Record<string, unknown>;
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
 * フォーム定義の 1 フィールド。
 *
 * **ここは測定対象ではない。** 採取の足場（どのフィールドの change を聞くか・
 * どれが必須か）を引くためだけに使う。フォーム定義そのものの実測は
 * kisekae の担当で、レコードの値は `getRecordViaJsApi` などが採る。
 * だから形を書いてよい。書かないと呼び出し側が毎回同じ絞り込みを書くことになる。
 */
type FormProperty = {
	type?: string;
	code?: string;
	required?: boolean;
	fields?: object;
};

/**
 * フォーム定義の properties。
 *
 * `getFieldCodes` と `getRequiredFields` が**同じ 1 本の API を
 * 別々に叩いていた**。採取のたびに 2 往復する必要は無い。
 */
const formProperties = async (
	app: number,
): Promise<Record<string, FormProperty>> => {
	const { properties } = await restGet("/k/v1/app/form/fields.json", { app });
	if (typeof properties !== "object" || properties === null) return {};
	return properties as Record<string, FormProperty>;
};

/**
 * change イベントを登録するためのフィールドコード一覧。
 *
 * サブテーブル内のフィールドコードも含める。
 * getFormFields はテーブル内フィールドを入れ子で返すため、
 * トップレベルの Object.keys だけでは取りこぼす。
 */
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

export const on = (
	events: string[],
	handler: (event: ProbeEvent) => unknown,
): void => {
	kintone.events.on(events, handler);
};
