import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient, log } from "@jissoku/rig/client";
import { env } from "@jissoku/rig/env";
import { runScript } from "@jissoku/rig/run";

/**
 * 検証アプリに貼られている採取カスタマイズが、手元のビルド結果と同一かを確かめる。
 *
 * ## なぜ適用ではなく確認なのか
 *
 * `updateAppCustomize` には **kintone のシステム管理権限**が要る（公式ドキュメント）。
 * アプリ管理権限だけでは足りない。
 *
 * システム管理権限は組織全体に効くので、「権限を検証アプリ 2 つに限定する」という
 * 方針（Q9）が成立しなくなる。しかもこの権限は「アプリに任意の JS を仕込める」もので、
 * CI に置くと main にマージされたコードが組織内の任意のアプリに JS を仕込めることになる。
 *
 * probe.js は変わらない限り貼り直す必要がない。
 * 適用は probe を変えたときに人がローカルから行い、
 * 定期ジョブは**貼られているものが最新かを確認するだけ**にする。
 * `getAppCustomize` はアプリ管理権限で足りる。
 *
 * ## なぜサイズではなく内容を比べるのか
 *
 * サイズが同じで中身が違う変更はありうる。
 * 配信されている実物をダウンロードしてハッシュで比べれば、その隙が無い。
 *
 * 古い probe で採った結果を「kintone が変わった」と誤認するのが最悪の失敗なので、
 * ここは厳密にする。
 */

const PROBE_PATH = "probe-dist/probe.js";

const sha256 = (data: Buffer): string =>
	createHash("sha256").update(data).digest("hex");

const main = async (): Promise<void> => {
	if (!existsSync(PROBE_PATH)) {
		throw new Error(
			`${PROBE_PATH} がありません。先に probe:build を実行してください。`,
		);
	}
	const local = readFileSync(PROBE_PATH);
	const localHash = sha256(local);
	log(`手元のビルド: ${local.length} bytes / sha256=${localHash.slice(0, 12)}`);

	const client = createClient();
	const app = env.fixtureAppId();
	const customize = await client.app.getAppCustomize({ app });

	const stale: string[] = [];

	for (const [scope, files] of [
		["desktop", customize.desktop.js],
		["mobile", customize.mobile.js],
	] as const) {
		const entry = files[0];
		if (entry === undefined) {
			stale.push(`${scope}: カスタマイズが設定されていない`);
			continue;
		}
		if (entry.type !== "FILE") {
			stale.push(`${scope}: FILE ではなく ${entry.type} が設定されている`);
			continue;
		}
		if (files.length !== 1) {
			stale.push(`${scope}: JS が ${files.length} 件ある（1 件のはず）`);
			continue;
		}

		const data = await client.file.downloadFile({
			fileKey: entry.file.fileKey,
		});
		const remoteHash = sha256(Buffer.from(data as ArrayBuffer));
		if (remoteHash === localHash) {
			log(`${scope}: 最新 ✅`);
			continue;
		}
		stale.push(
			`${scope}: 貼られているものが古い（配信 ${entry.file.size} bytes / sha256=${remoteHash.slice(0, 12)}）`,
		);
	}

	if (stale.length > 0) {
		throw new Error(
			[
				"採取カスタマイズが手元のビルドと一致しません。",
				...stale.map((line) => `  - ${line}`),
				"",
				"古い probe で採ると、その差分を kintone の変化と誤認します。",
				"適用してください（kintone のシステム管理権限が要ります）:",
				"",
				"  pnpm run probe:build && pnpm run app:deploy-probe",
			].join("\n"),
		);
	}

	log("");
	log("貼られている採取カスタマイズは手元のビルドと同一です。");
};

runScript(main);
