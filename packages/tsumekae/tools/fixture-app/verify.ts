import { createClient, log } from "@jissoku/rig/client";
import { env } from "@jissoku/rig/env";
import { runScript } from "@jissoku/rig/run";
import { allFixtureFieldCodes, subtableFieldCodes } from "./fields";

/**
 * 検証アプリの構成チェック。
 *
 * 主目的は「REST API で作れないもの」の検出。
 * とくに CATEGORY はアプリ設定由来で REST API が存在しないため、
 * 手動設定を忘れたまま実測を始めると CATEGORY だけ測れていない結果になる。
 *
 * 検出方法にレコードを使う理由:
 *   getFormFields には CATEGORY / STATUS / STATUS_ASSIGNEE が含まれない。
 *   一方レコードには type つきで現れるので、そこから存在を判定する。
 *   フィールドコードは環境の言語で変わる（カテゴリー / Categories）ため、
 *   コード名ではなく type で判定する。
 */

type Check = { name: string; ok: boolean; detail: string };

const main = async (): Promise<void> => {
	const client = createClient();
	const app = env.fixtureAppId();
	const checks: Check[] = [];

	// --- フォームフィールド ---
	const { properties } = await client.app.getFormFields({ app });
	const expected = allFixtureFieldCodes(env.lookupAppId());
	const missing = expected.filter((code) => !(code in properties));
	checks.push({
		name: "フォームフィールド",
		ok: missing.length === 0,
		detail:
			missing.length === 0
				? `${expected.length} 種すべて存在`
				: `不足: ${missing.join(", ")}`,
	});

	// --- サブテーブル内フィールド ---
	const subtable = properties.subtable;
	const inSubtable =
		subtable !== undefined && subtable.type === "SUBTABLE"
			? Object.keys(subtable.fields)
			: [];
	const missingInSubtable = subtableFieldCodes.filter(
		(code) => !inSubtable.includes(code),
	);
	checks.push({
		name: "サブテーブル内フィールド",
		ok: missingInSubtable.length === 0,
		detail:
			missingInSubtable.length === 0
				? `${subtableFieldCodes.length} 種すべて存在`
				: `不足: ${missingInSubtable.join(", ")}`,
	});

	// --- レコードから type ベースで判定 ---
	const { records } = await client.record.getRecords({ app });
	if (records.length === 0) {
		checks.push({
			name: "テストレコード",
			ok: false,
			detail: "レコードが0件。app:build を実行してください",
		});
	} else {
		checks.push({
			name: "テストレコード",
			ok: records.length >= 2,
			detail: `${records.length} 件（未入力と入力済みの2件以上が必要）`,
		});

		const typesInRecord = new Set(
			records.flatMap((record) =>
				Object.values(record).map((field) => field.type as string),
			),
		);

		for (const type of ["STATUS", "STATUS_ASSIGNEE"]) {
			checks.push({
				name: type,
				ok: typesInRecord.has(type),
				detail: typesInRecord.has(type)
					? "存在（プロセス管理が有効）"
					: "不在。app:build がプロセス管理の設定に失敗しています",
			});
		}

		checks.push({
			name: "CATEGORY",
			ok: typesInRecord.has("CATEGORY"),
			detail: typesInRecord.has("CATEGORY")
				? "存在（カテゴリー設定が有効）"
				: `不在。REST API が無いため手動設定が必要です → アプリ設定 → カテゴリー → 有効化 (app=${app})`,
		});

		// ルックアップが実際に実行されたか（コピー先が埋まっているか）
		const filled = records.find(
			(record) =>
				record.lookupKey?.value !== "" && record.lookupKey !== undefined,
		);
		const copied =
			filled !== undefined &&
			filled.lookupCopyName?.value !== "" &&
			filled.lookupCopyName?.value !== undefined;
		checks.push({
			name: "ルックアップのコピー",
			ok: copied,
			detail: copied
				? "コピー先が自動で埋まっている"
				: "コピー先が空。参照先レコードが無いか、ルックアップ設定が誤っています",
		});
	}

	// --- 出力 ---
	log("");
	for (const check of checks) {
		log(`${check.ok ? "  OK  " : " NG   "} ${check.name}: ${check.detail}`);
	}
	log("");

	const failed = checks.filter((check) => !check.ok);
	if (failed.length > 0) {
		log(
			`${failed.length} 件の問題があります。上記を解消してから実測してください。`,
		);
		process.exit(1);
	}
	log("検証アプリの構成に問題はありません。");
};

runScript(main);
