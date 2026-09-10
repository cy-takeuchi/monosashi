import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
	KintoneFormFieldProperty,
	KintoneFormLayout,
	KintoneRestAPIClient,
} from "@kintone/rest-api-client";
import { createClient, log } from "@kintone-type/rig/client";
import { env } from "@kintone-type/rig/env";
import { runScript } from "@kintone-type/rig/run";

/**
 * 検証アプリの**フォーム定義**（`getFormFields` / `getFormLayout`）を採る。
 *
 * ## なぜレコードの採取（e2e）と別なのか
 *
 * フォーム定義は REST の 2 つの API が返すもので、**ブラウザが要らない**。
 * レコードの値は JS API / event / REST の 3 経路で形が違い、
 * それを測るためにブラウザで採る必要があった（`e2e/collect.spec.ts`）。
 * フォーム定義は経路が 1 つなので Node から素直に採れる。
 *
 * ## 採取と正規化を分ける
 *
 * ここは**採るだけ**。環境依存値を伏せるのは `tools/fixture/formDefinition.ts`。
 * `e2e` → `fixture:build` と同じ分け方にしてある。
 * 出力（`fixtures/live/form-raw.json`）はアプリ ID や識別子を含むのでコミットしない。
 *
 * ## 何を測るためのものか
 *
 * フォーム定義の型は、ここまで `@kintone/rest-api-client` の型を読んで
 * 書かれてきた（kintone-pretty-fields）。実測していない主張が少なくとも 4 つある。
 *
 *  1. **ルックアップのキーフィールドは通常プロパティを返すか。**
 *     公式の型は `Lookup` を `type` / `code` / `label` / `noLabel` / `required` /
 *     `lookup` の 6 つだけとし、`maxLength` などを持たない形で宣言している。
 *     返るなら「各型に optional な `lookup`」、返らないなら「種別ごとの独立メンバ」
 *     という型の骨格そのものが変わる
 *  2. **ルックアップのコピー先を、対象アプリのフォーム定義だけで判別できるか。**
 *     `lookupCopyName` / `lookupCopyAmount` に印が付くのかどうか
 *  3. **`CATEGORY` / `STATUS` / `STATUS_ASSIGNEE` の `enabled` は設定を反映するか。**
 *     `docs/KINTONE.md`「調査済みの kintone / API の制約」は「判定できない」と
 *     書いているが、確かめたのは**返ってくること**で、`enabled` の値は測っていない
 *  4. **`SPACER` の `elementId` / `LABEL` / `HR` / グループ内のレイアウト要素**
 *     （`tools/fixture-app/layout.ts` の「レイアウト要素を測れる状態にする」）
 *
 * `lang` は渡さない（kintone の既定）。`lang` はラベルにしか効かず、
 * 上の 4 点はどれもラベルに依存しないため、採取軸を増やす根拠がない。
 * `preview` も渡さない（運用環境）。プラグインが実際に読むのは運用環境の定義。
 */

const OUT = process.argv[2] ?? "fixtures/live/form-raw.json";

type Properties = { [code: string]: KintoneFormFieldProperty.OneOf };

type CapturedApp = {
	/** 役割。アプリ ID は正規化で伏せるので、区別はこの名前で行う */
	role: "fixture" | "lookupSource";
	fields: { properties: Properties; revision: string };
	layout: { layout: KintoneFormLayout.OneOf[]; revision: string };
};

type CapturedForm = {
	version: 1;
	at: string;
	apps: CapturedApp[];
};

const collect = async (
	client: KintoneRestAPIClient,
	role: CapturedApp["role"],
	app: string,
): Promise<CapturedApp> => {
	// 2 つの API は別々の revision を返す。片方だけ進んでいる状態を
	// 見落とさないよう、まとめずに両方残す
	const [fields, layout] = await Promise.all([
		client.app.getFormFields<Properties>({ app }),
		client.app.getFormLayout<KintoneFormLayout.OneOf[]>({ app }),
	]);

	log(
		`  ${role} (app=${app}): フィールド ${Object.keys(fields.properties).length} 件 / レイアウト ${layout.layout.length} 行`,
	);
	return { role, fields, layout };
};

const main = async (): Promise<void> => {
	const client = createClient();

	log("フォーム定義を採取します");
	const apps = [
		await collect(client, "fixture", env.fixtureAppId()),
		await collect(client, "lookupSource", env.lookupAppId()),
	];

	const captured: CapturedForm = {
		version: 1,
		at: new Date().toISOString(),
		apps,
	};

	mkdirSync(dirname(OUT), { recursive: true });
	writeFileSync(OUT, `${JSON.stringify(captured, null, "\t")}\n`);
	log("");
	log(`${OUT} に書きました。`);
	log("pnpm run fixture:form で正規化してください。");
};

runScript(main);
