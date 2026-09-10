import { defineConfig } from "vite";

/**
 * ライブラリのビルド設定。
 *
 * 型宣言は tsc が出す（tsconfig.build.json）。
 * vite はランタイムのコードだけを担当する。
 *
 * 入口は 1 つ。monosashi と違って `declare global` を持たないので、
 * グローバル拡張のためのサブパスが要らない。
 *
 * **external を置かない。** 実行時依存がゼロなので外に出すものが無い。
 * `@kintone/rest-api-client` は型テストでだけ使う devDependency で、
 * `src/` から import していない（`tools/packCheck.ts` が確かめている）。
 */
export default defineConfig({
	build: {
		outDir: "dist",
		emptyOutDir: false,
		lib: {
			entry: { index: "src/index.ts" },
			formats: ["es"],
			fileName: (_format, name) => `${name}.js`,
		},
		minify: false,
		target: "es2020",
		sourcemap: true,
	},
});
