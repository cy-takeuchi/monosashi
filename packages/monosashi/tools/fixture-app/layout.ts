import type { KintoneRestAPIClient } from "@kintone/rest-api-client";

type Layout = Parameters<
	KintoneRestAPIClient["app"]["updateFormLayout"]
>[0]["layout"];

/**
 * レイアウト要素。フィールドではないので `types` から type を引けない。
 *
 * 公式の型（`KintoneFormLayout`）では
 *   - `ROW` の中身（`Field.OneOf`）に `LABEL` / `HR` / `SPACER` が**含まれる**
 *   - `GROUP` の中身は `ROW` なので、グループ内にも置けることになる
 *   - `SUBTABLE` の中身（`Field.InSubtable`）からは**除外されている**
 *
 * ただしこれはドキュメント由来の主張で、受け入れられるかは測っていない。
 */
type Element =
	| {
			type: "SPACER";
			elementId: string;
			size: { width: string; height: string };
	  }
	| { type: "LABEL"; label: string; size: { width: string } }
	| { type: "HR"; size: { width: string } };

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
 *
 * ## レイアウト要素を測れる状態にする
 *
 * `SPACER` / `LABEL` / `HR` はレコードには現れないので monosashi の実測には要らない。
 * フォーム定義を扱う kisekae の対象なので、ここで測れる状態にしておく。
 *
 * 測りたいのは 3 点。
 *
 *  1. **名前なしスペーサーの `elementId` が本当に空文字列で返るか。**
 *     消費側（kintone-plugins）は `elementId !== ""` で名前なしを捨てている。
 *     その前提が正しいかを確かめる
 *  2. **`LABEL` / `HR` が `getFormLayout` にどう現れるか。**
 *     kintone-pretty-fields は理由の記述なく両方を捨てている
 *  3. **グループの中にレイアウト要素を置けるか。**
 *     公式の型は許しているが実測していない
 *
 * 3 のために、要素は 1 行に混ぜず**1 種類ずつ別の行に置く**。
 * 混ぜると弾かれたときにどれが原因か分からない。
 *
 * ラベルの文字列は ASCII にする。`e2e/panel.ts` の `fieldInput` が
 * `getByText(label, { exact: true })` でフィールドのラベルから入力欄を辿るので、
 * 検証アプリのフィールドラベル（日本語）と衝突しない文字列でなければならない。
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
	const row = (...items: (string | Element)[]) => ({
		type: "ROW" as const,
		fields: items.map((item) =>
			typeof item === "string" ? field(item) : item,
		),
	});

	/** `elementId` がスペーサーの名前。空文字列を渡すと名前なしになる（実測対象） */
	const spacer = (elementId: string): Element => ({
		type: "SPACER",
		elementId,
		size: { width: "100", height: "50" },
	});
	const label = (text: string): Element => ({
		type: "LABEL",
		label: text,
		size: { width: "200" },
	});
	const hr = (): Element => ({ type: "HR", size: { width: "200" } });

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
		// 名前ありと名前なしを並べる。名前なしの elementId が何になるかが判定の根拠
		row(spacer("spacerNamed"), spacer("")),
		row(label("labelElement")),
		row(hr()),
		{
			type: "GROUP" as const,
			code: "group",
			layout: [
				row("inGroupText"),
				// グループ内にレイアウト要素を置けるかの実測。弾かれたら原因が分かるよう 1 行 1 種類
				row(spacer("spacerInGroup")),
				row(label("labelInGroup")),
				row(hr()),
			],
		},
		{
			type: "SUBTABLE" as const,
			code: "subtable",
			fields: subtableFieldCodes.map(field),
		},
	] as unknown as Layout;
};
