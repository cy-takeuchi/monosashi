import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// e2e は Playwright が走らせる。vitest の既定の include は
		// **/*.spec.ts を拾うので、明示的に外さないと実 kintone に接続しようとする。
		// PR で実 kintone に繋がないという Q6 の決定が、ここで崩れる
		exclude: ["node_modules/**", "dist/**", "e2e/**"],
		// *.test-d.ts のコンパイル時型テストを有効にする。
		// 「型が意図した区別をしているか」は実行時のテストでは確かめられない。
		typecheck: {
			enabled: true,
			include: [
				"src/**/*.test-d.ts",
				"test/**/*.test-d.ts",
				"packages/**/*.test-d.ts",
			],
			tsconfig: "tsconfig.json",
		},
	},
});
