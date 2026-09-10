import { writeFileSync } from "node:fs";
import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { createClient, log } from "@kintone-type/rig/client";
import { describeError } from "@kintone-type/rig/describeError";
import { env } from "@kintone-type/rig/env";
import { runScript } from "@kintone-type/rig/run";
import type { BuiltInCodes, RecordState } from "./cases";
import { cases } from "./cases";

/**
 * REST の updateRecord が何を受け付け、何を弾くかを測る。
 *
 * 変換関数 (forRestWrite) が何を除くべきかの根拠になる。
 * とくに「ルックアップのコピー先を含めるとエラーになるのか無視されるのか」は
 * 変換関数がフィールドメタ情報を必要とするかどうかを決める最重要の未確定事項。
 *
 * 測定は専用レコードに対して行う。テストレコードを壊すと実測の前提が変わるため。
 */

const OUT = "fixtures/write-behavior.md";

type Result = {
	id: string;
	question: string;
	payload: string;
	ok: boolean;
	detail: string;
	observed?: string;
};

const resolveBuiltInCodes = async (
	client: KintoneRestAPIClient,
	app: string,
): Promise<BuiltInCodes> => {
	const { properties } = await client.app.getFormFields({ app });
	const byType = (type: string): string => {
		const found = Object.values(properties).find(
			(property) => property.type === type,
		);
		return found?.code ?? `(${type} が見つかりません)`;
	};
	return {
		recordNumber: byType("RECORD_NUMBER"),
		creator: byType("CREATOR"),
		createdTime: byType("CREATED_TIME"),
		modifier: byType("MODIFIER"),
		updatedTime: byType("UPDATED_TIME"),
		status: byType("STATUS"),
		statusAssignee: byType("STATUS_ASSIGNEE"),
		category: byType("CATEGORY"),
	};
};

/** 測定用のレコードを 1 件作る。既存のテストレコードは壊さない */
const createProbeRecord = async (
	client: KintoneRestAPIClient,
	app: string,
): Promise<string> => {
	const { id } = await client.record.addRecord({
		app,
		record: {
			singleLineTextRequired: { value: "書き込み挙動の測定用" },
			singleLineTextUnique: { value: `write-probe-${Date.now()}` },
			subtable: {
				value: [
					{ value: { t_singleLineText: { value: "行A" } } },
					{ value: { t_singleLineText: { value: "行B" } } },
				],
			},
		},
	});
	return id;
};

const currentState = async (
	client: KintoneRestAPIClient,
	app: string,
	id: string,
	fileKey: string,
): Promise<{ record: Record<string, any>; state: RecordState }> => {
	const { record } = await client.record.getRecord({ app, id });
	const rows = (record.subtable?.value ?? []) as { id: string }[];
	return {
		record: record as Record<string, any>,
		state: { subtableRowIds: rows.map((row) => row.id), fileKey },
	};
};

/**
 * FILE のケース用に有効な fileKey を用意する。
 * kintone の fileKey は 1 回しか使えないので、FILE を使うケースの数だけ要る。
 */
const uploadFileKeys = async (
	client: KintoneRestAPIClient,
	count: number,
): Promise<string[]> => {
	const keys: string[] = [];
	for (let i = 0; i < count; i += 1) {
		const { fileKey } = await client.file.uploadFile({
			file: { name: "probe.txt", data: "abc" },
		});
		keys.push(fileKey);
	}
	return keys;
};

const main = async (): Promise<void> => {
	const client = createClient();
	const app = env.fixtureAppId();

	log("測定用レコードを作成");
	const id = await createProbeRecord(client, app);
	log(`  id=${id}`);

	const fileKeys = await uploadFileKeys(
		client,
		cases.filter((testCase) => testCase.id.startsWith("file-")).length,
	);
	log(`FILE ケース用の fileKey を ${fileKeys.length} 件アップロード`);

	const codes = await resolveBuiltInCodes(client, app);
	log(`組み込みフィールド: ${Object.values(codes).join(", ")}`);
	log("");

	const results: Result[] = [];

	let fileKeyIndex = 0;
	for (const testCase of cases) {
		// fileKey は 1 回しか使えないので、FILE のケースごとに別のものを渡す
		const fileKey = testCase.id.startsWith("file-")
			? (fileKeys[fileKeyIndex++] ?? "")
			: "";
		const { state } = await currentState(client, app, id, fileKey);
		const record = testCase.build(codes, state);

		let result: Result;
		try {
			await client.record.updateRecord({ app, id, record: record as never });
			const { record: after } = await currentState(client, app, id, fileKey);
			result = {
				id: testCase.id,
				question: testCase.question,
				payload: JSON.stringify(record),
				ok: true,
				detail: "受け付けられた",
				...(testCase.inspect === undefined
					? {}
					: { observed: testCase.inspect(after) }),
			};
		} catch (error) {
			result = {
				id: testCase.id,
				question: testCase.question,
				payload: JSON.stringify(record),
				ok: false,
				detail: describeError(error).replace(/\n+/g, " / "),
			};
		}

		results.push(result);
		log(`${result.ok ? " OK " : " NG "} ${testCase.id}: ${testCase.question}`);
		if (!result.ok) log(`      ${result.detail}`);
		if (result.observed !== undefined) log(`      → ${result.observed}`);
	}

	const lines: string[] = [
		"# REST updateRecord の受け入れ挙動",
		"",
		`測定日: ${new Date().toISOString().slice(0, 10)}`,
		`対象: app=${app} の測定用レコード id=${id}`,
		"",
		"変換関数 (`forRestWrite`) が何を除くべきかの根拠。",
		"「除くべき」を仕様の推測で決めず、実際に投げた結果で決める。",
		"",
		"| 確かめたこと | 結果 | 詳細 |",
		"| --- | --- | --- |",
	];
	for (const result of results) {
		const detail = [result.detail, result.observed]
			.filter((x) => x !== undefined && x !== "")
			.join(" — ")
			.replace(/\|/g, "\\|");
		lines.push(
			`| ${result.question} | ${result.ok ? "受け入れ" : "**エラー**"} | ${detail} |`,
		);
	}
	lines.push("");
	lines.push("## 送信したペイロード");
	lines.push("");
	for (const result of results) {
		lines.push(`### ${result.id}`);
		lines.push("");
		lines.push("```json");
		lines.push(result.payload);
		lines.push("```");
		lines.push("");
	}

	writeFileSync(OUT, lines.join("\n"));
	log("");
	log(`${OUT} を生成しました`);
};

runScript(main);
