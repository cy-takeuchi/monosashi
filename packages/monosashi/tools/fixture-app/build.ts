import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
	appUrl,
	createClient,
	log,
	resolveSpace,
	waitForDeploy,
} from "@jissoku/rig/client";
import { env } from "@jissoku/rig/env";
import { envPath } from "@jissoku/rig/repoRoot";
import { runScript } from "@jissoku/rig/run";
import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import {
	builtInFieldTypes,
	fixtureAppBaseFields,
	fixtureAppDependentFields,
	lookupAppFields,
	subtableFieldCodes,
} from "./fields";
import { fixtureAppLayout } from "./layout";
import {
	emptyRecord,
	FILE_SLOT_COUNT,
	filledRecord,
	lookupAppRecords,
} from "./records";

/**
 * 検証アプリを REST API で構築する。
 *
 * アプリテンプレート zip を使わない理由（Q5）:
 *   zip は実質バイナリで diff が効かず、「なぜこのフィールド構成なのか」をレビューできない。
 *   実測を根拠に型を書く以上、根拠側がブラックボックスなのは本末転倒。
 *
 * 作れないもの:
 *   CATEGORY ... REST API が存在しない。verify.ts が未設定を検出して警告する。
 */

const createApp = async (
	client: KintoneRestAPIClient,
	name: string,
	space: string | undefined,
): Promise<string> => {
	// space を渡すと rest-api-client が内部でスペースの defaultThread を解決して
	// スペース配下のアプリとして作る。thread を自分で指定する必要はない。
	const { app } = await client.app.addApp({
		name,
		...(space === undefined ? {} : { space }),
	});
	log(
		`  アプリ作成: ${name} (app=${app}${space === undefined ? "" : `, space=${space}`})`,
	);
	return app;
};

const buildLookupApp = async (
	client: KintoneRestAPIClient,
	space: string | undefined,
): Promise<string> => {
	log("[1/6] ルックアップ参照先アプリを作成");
	const app = await createApp(
		client,
		"kintone-record 検証 (ルックアップ元)",
		space,
	);
	writeEnvKey("FIXTURE_LOOKUP_APP_ID", app);
	await client.app.addFormFields({ app, properties: lookupAppFields });
	await client.app.deployApp({ apps: [{ app }] });
	await waitForDeploy(client, [app]);
	log("  デプロイ完了");

	log("[2/6] ルックアップ元のレコードを投入");
	await client.record.addRecords({ app, records: lookupAppRecords });
	log(`  ${lookupAppRecords.length} 件投入`);
	return app;
};

/** フォーム（フィールド + レイアウト + プロセス管理）を作り直す。新規・再利用の両方から使う */
const rebuildFixtureAppForm = async (
	client: KintoneRestAPIClient,
	app: string,
	lookupAppId: string,
): Promise<void> => {
	await resetFormFields(client, app);

	// 2 パスに分ける。ルックアップの fieldMappings と
	// 関連レコード一覧の condition.field は参照先フィールドが先に必要なため、
	// 1 回の addFormFields にまとめると CB_VA01 で弾かれる。
	await client.app.addFormFields({ app, properties: fixtureAppBaseFields() });
	log("  フィールド追加 (1/2: 基本フィールド)");

	await client.app.addFormFields({
		app,
		properties: fixtureAppDependentFields(lookupAppId),
	});
	log("  フィールド追加 (2/2: ルックアップ / 関連レコード一覧)");

	// レイアウトは各フィールドの実際の type を要求する。
	// 組み込みフィールド (レコード番号 / 作成者 / ...) のコードは環境の言語で変わるため、
	// どちらも決め打ちせず getFormFields から引く。
	const { properties } = await client.app.getFormFields({ app, preview: true });

	const types: Record<string, string> = {};
	for (const [code, property] of Object.entries(properties)) {
		types[code] = property.type;
		if (property.type === "SUBTABLE") {
			for (const [inner, innerProperty] of Object.entries(property.fields)) {
				types[inner] = innerProperty.type;
			}
		}
	}

	// 組み込みフィールドのコードは環境の言語で変わる（レコード番号 / Record_number）。
	// 一覧の定義でも使うので、type から引けるようにしておく
	const builtInCodeOf: Record<string, string> = {};
	const builtInCodes = builtInFieldTypes.map((type) => {
		const found = Object.values(properties).find(
			(property) => property.type === type,
		);
		if (found === undefined) {
			throw new Error(`組み込みフィールド ${type} が見つかりません`);
		}
		builtInCodeOf[type] = found.code;
		return found.code;
	});
	log(`  組み込みフィールドを解決 (${builtInCodes.join(", ")})`);

	await client.app.updateFormLayout({
		app,
		layout: fixtureAppLayout(types, subtableFieldCodes, builtInCodes),
	});
	log("  レイアウト設定");

	// 作業者に指定する「作成者」フィールドのコード。これも言語で変わる
	const creatorCode = builtInCodeOf.CREATOR;
	if (creatorCode === undefined) {
		throw new Error("作成者フィールドのコードを解決できません");
	}

	log("[4/6] プロセス管理を有効化 (STATUS / STATUS_ASSIGNEE を作る)");
	await client.app.updateProcessManagement({
		app,
		enable: true,
		states: {
			// **作業者を空にしない。** 空だと誰もアクションを実行できず、
			// 詳細画面にアクションボタン（「処理開始」）が出ない。
			// それでは detail.process.proceed を測れない（実測 2026-09-02）。
			//
			// 作業者は「作成者」フィールドを指す。ユーザーのログイン名を書くと
			// 環境ごとに違うものが必要になるが、これなら誰が実行しても同じ。
			//
			// entity.type: "CREATOR" ではなく FIELD_ENTITY を使う。
			// 先頭のステータスは kintone が指定できるものを制限しており、
			// CREATOR は次で弾かれる（実測 2026-09-05）:
			//   states[未処理].assignee: 先頭のステータスでは、作業者は空、
			//   またはレコードの作成者フィールドを指定します。
			未処理: {
				name: "未処理",
				index: "0",
				assignee: {
					type: "ONE",
					entities: [
						{
							entity: { type: "FIELD_ENTITY", code: creatorCode },
							includeSubs: false,
						},
					],
				},
			},
			処理中: {
				name: "処理中",
				index: "1",
				assignee: {
					type: "ONE",
					entities: [
						{
							entity: { type: "FIELD_ENTITY", code: creatorCode },
							includeSubs: false,
						},
					],
				},
			},
			// 完了は終端。ここから進む先が無いので作業者は要らない
			完了: {
				name: "完了",
				index: "2",
				assignee: { type: "ONE", entities: [] },
			},
		},
		actions: [
			{ name: "処理開始", from: "未処理", to: "処理中", filterCond: "" },
			{ name: "完了する", from: "処理中", to: "完了", filterCond: "" },
		],
	});

	// 空文字を混ぜると updateViews が通ってしまい、列の消えた一覧ができる。
	// 解決できなかったことをここで落とす
	const recordNumberCode = builtInCodeOf.RECORD_NUMBER;
	if (recordNumberCode === undefined) {
		throw new Error("レコード番号フィールドのコードを解決できません");
	}

	// 一覧をコードで宣言する。
	//
	// **kintone が既定で用意する一覧は getViews が返さない**（実測 2026-09-05:
	// プロセス管理が足した「（作業者が自分）」1 件しか返らず、しかもその一覧は
	// 作業者が付くまで 0 件なので、レコードの見える一覧に REST から辿り着けない）。
	// 一覧のインライン編集を測るには、レコードが見える一覧が要る。
	//
	// updateViews は一覧を全置換する。ただし**自動作成された一覧は消せない**
	// （実測 2026-09-05: GAIA_IL44 「（作業者が自分）」は自動作成された一覧の
	// ため、削除できません）。消せないものは残したまま我々の一覧を足す。
	//
	// preview: true で引くのは、直前のプロセス管理の変更がまだ
	// 運用環境に反映されていないため（deployApp はこの後）
	const { views: currentViews } = await client.app.getViews({
		app,
		preview: true,
	});
	const builtinViews = Object.entries(currentViews).filter(
		([, view]) => view.builtinType !== undefined,
	);

	await client.app.updateViews({
		app,
		views: {
			// 我々の一覧を先頭にする。view を指定せずにアプリを開いたときの
			// 着地先がここになる。「（作業者が自分）」が先頭だと、
			// 作業者が付くまで 0 件の画面に着いてしまう
			...Object.fromEntries(
				builtinViews.map(([name, view], order) => [
					name,
					{ ...view, index: String(order + 1) },
				]),
			),
			すべて: {
				type: "LIST",
				name: "すべて",
				index: "0",
				// 組み込みフィールドのコードは環境の言語で変わるので決め打ちしない。
				// 残りは我々が付けたコードなので言語に依存しない
				fields: [
					recordNumberCode,
					"singleLineTextRequired",
					"singleLineText",
					"number",
				],
				filterCond: "",
			},
		},
	});
	log("  一覧を設定");

	await client.app.deployApp({ apps: [{ app }] });
	await waitForDeploy(client, [app]);
	log("  デプロイ完了");
};

const buildFixtureApp = async (
	client: KintoneRestAPIClient,
	lookupAppId: string,
	space: string | undefined,
): Promise<string> => {
	log("[3/6] 測定用アプリを作成");
	const app = await createApp(client, "kintone-record 検証 (測定用)", space);
	writeEnvKey("FIXTURE_APP_ID", app);

	await rebuildFixtureAppForm(client, app, lookupAppId);
	return app;
};

const addTestRecords = async (
	client: KintoneRestAPIClient,
	app: string,
): Promise<void> => {
	log("[5/6] テストレコードを投入");

	// 再実行に耐えるよう既存レコードを消す。
	// singleLineTextUnique が重複禁止なので、消さないと 2 回目が必ず失敗する。
	const { records: existing } = await client.record.getRecords({
		app,
		fields: ["$id"],
	});
	if (existing.length > 0) {
		await client.record.deleteRecords({
			app,
			ids: existing.map((record) => String(record.$id?.value ?? "")),
		});
		log(`  既存レコードを削除 (${existing.length} 件)`);
	}

	// 添付ファイルの実体。FILE の value 形状（contentType / name / size の有無）を
	// JS API と REST で突き合わせるために、実ファイルが必要。
	// fileKey は 1 回しか使えないので、添付を置く箇所の数だけアップロードする。
	const fileKeys: string[] = [];
	for (let i = 0; i < FILE_SLOT_COUNT; i += 1) {
		const { fileKey } = await client.file.uploadFile({
			file: {
				name: `probe-sample-${i + 1}.txt`,
				data: `kintone-record probe sample ${i + 1}`,
			},
		});
		fileKeys.push(fileKey);
	}
	log(`  ファイルアップロード (${fileKeys.length} 件)`);

	const loginCode = env.username();

	const { ids } = await client.record.addRecords({
		app,
		records: [emptyRecord(), filledRecord(fileKeys, loginCode)],
	});
	log(`  未入力レコード id=${ids[0]} / 入力済みレコード id=${ids[1]}`);
};

/**
 * .env の 1 キーだけを更新する。
 *
 * アプリ作成の直後に呼ぶ。kintone にはアプリ削除の REST API が無いため、
 * 途中で失敗したときにアプリ ID を残しておかないと、
 * 再実行のたびに孤児アプリが増え続ける。
 */
const writeEnvKey = (key: string, value: string): void => {
	// リポジトリのルートの .env。cwd 相対にするとモノレポで別の場所を指す
	const path = envPath();
	const current = existsSync(path) ? readFileSync(path, "utf8") : "";
	const lines = current.split("\n");
	const index = lines.findIndex((line) => line.startsWith(`${key}=`));
	if (index === -1) {
		lines.push(`${key}=${value}`);
	} else {
		lines[index] = `${key}=${value}`;
	}
	writeFileSync(path, lines.join("\n"));
};

/**
 * 再実行時に既存アプリのフィールドを全消しする。
 *
 * addFormFields は既存コードと衝突すると失敗するので、
 * フィールド定義を直して再実行する運用のために毎回まっさらに戻す。
 */
const resetFormFields = async (
	client: KintoneRestAPIClient,
	app: string,
): Promise<void> => {
	const { properties } = await client.app.getFormFields({ app, preview: true });
	const codes = Object.keys(properties);
	if (codes.length === 0) return;
	await client.app.deleteFormFields({ app, fields: codes });
	log(`  既存フィールドを削除 (${codes.length} 件)`);
};

const main = async (): Promise<void> => {
	const client = createClient();

	const space = await resolveSpace(client);
	if (space === undefined) {
		log("スペース未指定。アプリはスペース配下に作られません。");
		log(
			"スペース配下に作る場合は .env の KINTONE_SPACE_ID を設定してください。",
		);
	} else {
		log(`スペース: ${space.name} (id=${space.id})`);
	}
	log("");

	// 既に作成済みなら作り直さない。kintone にアプリ削除の REST API が無いため、
	// 失敗して再実行するたびにアプリが増えるのを避ける。
	const existingLookup = env.optional("FIXTURE_LOOKUP_APP_ID");
	const existingFixture = env.optional("FIXTURE_APP_ID");

	let lookupAppId: string;
	if (existingLookup === undefined) {
		lookupAppId = await buildLookupApp(client, space?.id);
	} else {
		lookupAppId = existingLookup;
		log(`[1-2/6] ルックアップ参照先アプリを再利用 (app=${lookupAppId})`);
	}

	let fixtureAppId: string;
	if (existingFixture === undefined) {
		fixtureAppId = await buildFixtureApp(client, lookupAppId, space?.id);
	} else {
		fixtureAppId = existingFixture;
		log(`[3/6] 測定用アプリを再利用 (app=${fixtureAppId})`);
		await rebuildFixtureAppForm(client, fixtureAppId, lookupAppId);
	}

	await addTestRecords(client, fixtureAppId);

	log("");
	log("完了。次にやること:");
	log("  1. カテゴリー設定は REST API が無いため手動で有効化してください");
	log(`     ${appUrl(fixtureAppId)} → アプリ設定 → カテゴリー → 有効化`);
	log("  2. app:verify   (カテゴリー設定を含む構成の検証)");
	log("  3. app:deploy-probe   (採取カスタマイズの適用)");
};

runScript(main);
