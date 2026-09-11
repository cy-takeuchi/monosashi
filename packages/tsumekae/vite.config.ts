import { defineConfig } from "vite";

/**
 * ライブラリのビルド設定。
 *
 * 型宣言は tsc が出す（tsconfig.build.json）。
 * vite はランタイムのコードだけを担当する。
 *
 * @kintone/rest-api-client は external にしてある。
 * 今は型を自前で持っているので実行時には現れないが、
 * tools/ が REST クライアントを使うため、設定は残す。
 */
export default defineConfig({
	build: {
		outDir: "dist",
		emptyOutDir: false,
		lib: {
			// kintone.ts はグローバル宣言だけを持ち、実行時のコードは何も無い。
			// それでも JS を出力する必要がある。`import "tsumekae/kintone"` は
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
