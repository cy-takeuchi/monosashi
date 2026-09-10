import { existsSync, readFileSync } from "node:fs";
import { appUrl, createClient, log, waitForDeploy } from "@jissoku/rig/client";
import { env } from "@jissoku/rig/env";
import { runScript } from "@jissoku/rig/run";

/**
 * 採取カスタマイズを検証アプリに適用する。
 *
 * ここが読み込むのは probe:build が吐いた probe-dist/probe.js。
 * 人間が手でアプリに登録するのも、Playwright が CI で適用するのも、
 * すべてこの同じ成果物を使う（Q6）。
 * 採取ロジックをテンプレート文字列で二重に持つと、
 * 手動で採った実測と CI が検証している実測が別物になるため。
 */

const PROBE_PATH = "probe-dist/probe.js";

const main = async (): Promise<void> => {
	if (!existsSync(PROBE_PATH)) {
		throw new Error(
			`${PROBE_PATH} がありません。先に probe:build を実行してください。`,
		);
	}

	const client = createClient();
	const app = env.fixtureAppId();

	const data = readFileSync(PROBE_PATH, "utf8");
	// **文字数ではなくバイト数を出す。** `readFileSync(path, "utf8")` は
	// 文字列を返すので `data.length` は文字数になり、日本語のコメントや文言が
	// 1 文字 3 バイトなぶん実物より小さく出る（52,771 バイトが 41,521 と表示された）。
	// この数字は「貼るものが正しいか」の判断に使うので、
	// `app:check-probe` と同じ単位に揃える
	log(`probe.js を読み込み (${Buffer.byteLength(data, "utf8")} bytes)`);

	// kintone の fileKey は 1 回しか使えない。
	// desktop と mobile に同じキーを渡すと「ほかと重複しています」で弾かれるため、
	// 適用先ごとにアップロードする。
	const upload = async (): Promise<{ fileKey: string }> => {
		const { fileKey } = await client.file.uploadFile({
			file: { name: "probe.js", data },
		});
		return { fileKey };
	};

	const desktopFile = await upload();
	const mobileFile = await upload();
	log("アップロード完了 (desktop / mobile それぞれ)");

	await client.app.updateAppCustomize({
		app,
		scope: "ALL",
		desktop: { js: [{ type: "FILE", file: desktopFile }] },
		mobile: { js: [{ type: "FILE", file: mobileFile }] },
	});
	log("カスタマイズを設定 (desktop / mobile 両方)");

	await client.app.deployApp({ apps: [{ app }] });
	await waitForDeploy(client, [app]);
	log("デプロイ完了");

	log("");
	log(`${appUrl(app)} を開いて採取を開始してください。`);
	log("各画面のヘッダに操作パネルが出ます。");
	log("  ラベル欄に「未入力」「入力済み」などを入れてから採取すると、");
	log("  分析時にレコードの状態で突き合わせられます。");
};

runScript(main);
