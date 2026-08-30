import { defineConfig } from "vite";

/**
 * 実測採取カスタマイズのビルド設定。
 *
 * 出力は IIFE 1ファイル。この成果物を
 *   1. 人間が kintone のアプリ設定に手で登録する
 *   2. Playwright / tools が updateAppCustomize でアップロードする
 * の両方から「同じもの」として使う。採取ロジックを二重に持たないための構成。
 */
export default defineConfig({
	build: {
		outDir: "probe-dist",
		emptyOutDir: true,
		lib: {
			entry: "src/probe/main.ts",
			name: "kintoneRecordProbe",
			formats: ["iife"],
			fileName: () => "probe.js",
		},
		minify: false,
		target: "es2020",
	},
});
