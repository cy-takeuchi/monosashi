import { defineConfig } from "vite";

/**
 * ライブラリのビルド設定。
 *
 * 型宣言は tsc が出す（tsconfig.build.json）。
 * vite はランタイムのコードだけを担当する。
 *
 * @kintone/rest-api-client は外部依存として残す。
 * バンドルに含めると、利用者側の rest-api-client と二重になり、
 * instanceof や型の同一性が壊れる。
 */
export default defineConfig({
	build: {
		outDir: "dist",
		emptyOutDir: false,
		lib: {
			// kintone.ts はグローバル宣言だけを持ち、実行時のコードは何も無い。
			// それでも JS を出力する必要がある。`import "kintone-record/kintone"` は
			// 副作用 import なので、型だけのエントリだと実行時に
			// ERR_PACKAGE_PATH_NOT_EXPORTED になる（検証済み）。
			entry: {
				index: "src/index.ts",
				kintone: "src/kintone.ts",
			},
			formats: ["es"],
			fileName: (_format, name) => `${name}.js`,
		},
		rollupOptions: {
			external: [/^@kintone\//],
		},
		minify: false,
		target: "es2020",
		sourcemap: true,
	},
});
