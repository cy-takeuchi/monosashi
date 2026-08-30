import type { KintoneRestAPIClient } from "@kintone/rest-api-client";

type Layout = Parameters<
	KintoneRestAPIClient["app"]["updateFormLayout"]
>[0]["layout"];

/**
 * レイアウト。
 *
 * updateFormLayout は各フィールドの type がフォーム定義と一致していることを要求する
 * （不一致だと「指定したフィールドの種類が type パラメーターと異なります」で弾かれる）。
 * そのため type は決め打ちせず、getFormFields の結果から引く。
 *
 * グループとサブテーブルはレイアウト上の入れ子として表現される。
 * inGroupText を GROUP の中に入れることで、
 * 「グループ内フィールドは record にフラットに出るのか、入れ子で出るのか」を測れる状態にする。
 */
export const fixtureAppLayout = (
	/** フィールドコード -> type。サブテーブル内のフィールドも含む */
	types: Record<string, string>,
	subtableFieldCodes: string[],
	/** 組み込みフィールドのコード。環境の言語で変わるため呼び出し側から受け取る */
	builtInCodes: string[],
): Layout => {
	const field = (code: string) => {
		const type = types[code];
		if (type === undefined) {
			throw new Error(
				`レイアウトに指定したフィールド ${code} がフォームにありません`,
			);
		}
		return { type, code };
	};
	const row = (...codes: string[]) => ({
		type: "ROW" as const,
		fields: codes.map(field),
	});

	return [
		row(...builtInCodes),
		row("singleLineText", "singleLineTextRequired", "singleLineTextUnique"),
		row("multiLineText", "richText"),
		row("number", "calc", "calcDateTime"),
		row("checkBox", "radioButton"),
		row("dropDown", "dropDownWithDefault", "multiSelect"),
		row("date", "time", "dateTime"),
		row("link", "linkMail", "file"),
		row("userSelect", "organizationSelect", "groupSelect"),
		row("lookupKey", "lookupCopyName", "lookupCopyAmount"),
		row("referenceTable"),
		{
			type: "GROUP" as const,
			code: "group",
			layout: [row("inGroupText")],
		},
		{
			type: "SUBTABLE" as const,
			code: "subtable",
			fields: subtableFieldCodes.map(field),
		},
	] as unknown as Layout;
};
