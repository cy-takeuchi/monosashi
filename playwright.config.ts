import { defineConfig, devices } from "@playwright/test";
import { env } from "./tools/shared/env";

/**
 * 実 kintone から採取するための Playwright 設定。
 *
 * 通常のテストではなく**採取装置**である。合否を判定するのはここではなく、
 * 採取結果に対して走る既存のテスト（field.test.ts / coverage.test.ts）と、
 * 前回結果との diff（Q7）。
 *
 * PR では走らせない。週次のスケジュールジョブ専用（Q6）。
 * PR ごとにライブ実行すると遅く不安定になり、やがて無効化される。
 * kintone-typeguard では実際にそうなった（Run Tests ステップがコメントアウト済み）。
 *
 * 規約は e2e-test-kit の kintone ルールに従う。要点は 3 つ。
 *   - kintone 内部のセレクタ（.gaia-* / #record-gaia-* 等）は使わない
 *   - 固定時間の待機（waitForTimeout / networkidle）は使わない
 *   - 同一セッションでの並行実行はしない
 */
export default defineConfig({
	testDir: "e2e",

	// kintone は同一セッションでの並行操作が衝突する。
	// 加えて採取は「1 つのレコードを作って辿る」直列の手順そのもの
	workers: 1,
	fullyParallel: false,

	// 採取が中途半端に成功した状態を作らない。
	// 途中で落ちたら、そのフローで採れたものは信用しない
	maxFailures: 1,

	// 採取のたびに新しいレコードを作るので、リトライしても状態は汚れない。
	// ネットワークの瞬断で週次ジョブが偽陽性になるのを避ける
	retries: process.env.CI === undefined ? 0 : 1,

	reporter: process.env.CI === undefined ? "list" : [["list"], ["github"]],

	use: {
		baseURL: env.baseUrl(),
		// 失敗したときに何が起きたか分かるようにする。
		// 週次ジョブは人が見ていないので、後から追える材料を残す
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},

	projects: [
		// ログインは 1 回だけ。以降は storageState を使い回す
		{ name: "setup", testMatch: /auth\.setup\.ts/ },
		{
			name: "collect",
			dependencies: ["setup"],
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/user.json",
			},
		},
	],
});
