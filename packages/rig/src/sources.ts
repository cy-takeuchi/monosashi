import { readdirSync, statSync } from "node:fs";

/**
 * 自分のツリーの `.ts` を走査する。
 *
 * ## なぜ rig が持つのか
 *
 * 「ソースを集めてコメントを落として調べる」検査が 4 つあり、
 * **走査が 4 実装に分かれていた。**
 *
 * | 場所 | 何を集めていたか |
 * |---|---|
 * | `toolConvention.ts` | `tools/` の `.ts` |
 * | `monosashi/test/deadExports.test.ts` | `src` / `test` / `tools` / `e2e` の `.ts` |
 * | `monosashi/test/typecheckScope.test.ts` の `hasTypeScript` | `.ts` を 1 つでも持つか |
 * | 同 `typeTests` | `*.test-d.ts` |
 *
 * しかもコメント落としが 2 実装あって**挙動が違った**。
 * `toolConvention` は行全体が `//` の行だけを落とし、
 * `deadExports` は行末の `//` も落とす。
 * 前者で `const x = 1; // main() を呼ばない` と書くと、
 * そのコメントが検査対象の本文として残る。
 *
 * 検査そのものは各パッケージの関心だが、**走査は誰の関心でもない**。
 * ここに 1 つ置いて、検査は「何を見つけたら落とすか」だけを持つ。
 */

/** 除外するディレクトリ。`tsc` の出力先と、外から入ってくるもの */
export const NOT_SOURCE: ReadonlySet<string> = new Set([
	"node_modules",
	"dist",
	"probe-dist",
	"test-results",
	".git",
]);

/**
 * ディレクトリ配下の `.ts` を再帰的に集める。
 *
 * @param dir 起点
 * @param accept 拾うファイル名の条件。既定は `.ts` すべて
 */
export const sources = (
	dir: string,
	accept: (name: string) => boolean = (name) => name.endsWith(".ts"),
): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory()) {
			return NOT_SOURCE.has(entry.name) ? [] : sources(path, accept);
		}
		return accept(entry.name) ? [path] : [];
	});

/** cwd 直下の、`.ts` を 1 つ以上持つディレクトリ */
export const sourceDirs = (dir = "."): string[] =>
	readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !NOT_SOURCE.has(entry.name))
		.filter((entry) => sources(`${dir}/${entry.name}`).length > 0)
		.map((entry) => entry.name);

/**
 * コメントを落とす。
 *
 * **落とさないと JSDoc の中の名前を「使われている」と数えてしまう。**
 * 死んだ export ほど JSDoc で言及されがちなので、ここを省くと
 * 検出したいものが軒並み素通りする。
 *
 * 行末の `//` も落とす。行頭だけにすると
 * `const x = 1; // main() の説明` が本文として残る。
 */
export const withoutComments = (source: string): string =>
	source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/**
 * cwd 直下の `*.config.ts`。
 *
 * **ビルド設定は根から参照される。** `vite.probe.config.ts` が
 * `src/probe/artifact.ts` の定数を読んでいるのに、走査の根が
 * `src` / `test` / `tools` / `e2e` だけだったため、
 * **実際に使われている export が「未参照」と報告された**。
 * `tsconfig.json` の `include` は `*.config.ts` を含んでいるので、
 * 走査もそこに揃える。
 */
export const rootConfigs = (dir = "."): string[] =>
	readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".config.ts"))
		.map((entry) => (dir === "." ? entry.name : `${dir}/${entry.name}`))
		.sort();

/** ディレクトリなら再帰して `.ts` を集め、ファイルならそれ自身を返す */
export const expandSources = (target: string): string[] =>
	statSync(target).isDirectory() ? sources(target) : [target];
