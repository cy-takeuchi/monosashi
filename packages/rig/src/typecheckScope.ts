import { readFileSync } from "node:fs";
import { sourceDirs, sources } from "./sources";

/**
 * 型チェックの対象が漏れていないことを確かめる。
 *
 * ## なぜ要るか
 *
 * monosashi の `tsconfig.json` の `include` に `e2e/**` が無く、**840 行の
 * `e2e/panel.ts` と 491 行の `e2e/collect.spec.ts` が長期間、型を誰にも
 * 見られていなかった**（`const x: number = "文字列"` を入れても check が緑）。
 *
 * `biome` は見るが lint と整形だけで、型は見ない。
 * vitest の `typecheck` は `*.test-d.ts` だけを対象にしている。
 * つまり `tsc --noEmit` が唯一の型の門で、その門が `include` の並び 1 行で開く。
 *
 * ## 門は 2 つある
 *
 * 2 つ目は vitest の `typecheck`。**`enabled: false` にすると
 * `*.test-d.ts` は落ちるのではなく収集されなくなる**
 * （monosashi で実測: 16 → 11 ファイル、356 → 287 テスト。
 * 嘘の型主張を入れたまま緑になる）。減ったことは表示されない。
 *
 * ## なぜ rig が持つのか
 *
 * **monosashi にしか無かったのに、kisekae と rig の `tsconfig.json` は
 * 「漏れを test/typecheckScope.test.ts が縛っている（monosashi と同じ）」と
 * 書いていた。** kisekae の `vitest.config.ts` も同じ主張をしていた。
 * どれも嘘で、kisekae で `typecheck.enabled` を false にすれば
 * `raw.test-d.ts` / `field.test-d.ts` / `rawKeys.test-d.ts` が黙って消える。
 *
 * e2e の漏れとまったく同じ形（「縛っている」と書いてあるが縛っていない）なので、
 * 走査をここに置いて 3 パッケージ全部から適用する。
 */

/**
 * `tsconfig.json` は JSONC（コメント付き）なので `JSON.parse` に直接渡せない。
 * `resolveJsonModule` での import も通らない。
 *
 * **剥がすのは行全体がコメントの行だけ。** `include` の値は `"src/**\/*"` で、
 * この中に `/**\/` が入っている。`/\*[\s\S]*?\*\//` で素朴にブロックコメントを
 * 剥がすと値が `"src*"` に壊れる（実際にそれで書いて、このテストが落ちた）。
 *
 * 「`/\*` を含まないこと」でも縛れない。**値そのものが `/\*` を含む**ので、
 * 正しい tsconfig で落ちる（これも実際に書いて落ちた）。
 * ブロックコメントを足したら `JSON.parse` が構文エラーで落ちる。それで足りる。
 */
export const readJsonc = (path: string): unknown => {
	const source = readFileSync(path, "utf8")
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
	return JSON.parse(source);
};

/** `tsconfig.json` の `include`。無ければ落とす（あるはずのものなので） */
export const tsconfigInclude = (path = "tsconfig.json"): string[] => {
	const value = (readJsonc(path) as { include?: unknown }).include;
	if (!Array.isArray(value)) {
		throw new Error(`${path} に include がありません`);
	}
	return value as string[];
};

/**
 * `.ts` を置いているのに `include` に無い最上位ディレクトリ。空なら問題なし。
 *
 * **特定のディレクトリを名指しで縛らない。** 名指しだと次に足す
 * ディレクトリで同じ穴が開く。`.ts` を置いた場所が全部入っていることを見る。
 */
export const dirsMissingFromInclude = (dir = "."): string[] =>
	sourceDirs(dir).filter(
		(name) => !tsconfigInclude(`${dir}/tsconfig.json`).includes(`${name}/**/*`),
	);

/**
 * glob を正規表現にする。`typecheck.include` の照合に使う。
 *
 * 扱うのは `<ディレクトリ>/**\/*.test-d.ts` の形だけなので、
 * `**` と `*` と `.` を見れば足りる。
 */
export const globToRegExp = (pattern: string): RegExp =>
	new RegExp(
		// **1 回の走査で置き換える。** `**/` を一度別の文字に退避させる書き方は、
		// 退避先が制御文字だと biome に叱られ、普通の文字だとパターンと衝突し得る
		`^${pattern.replace(/\*\*\/|\*|[.+^${}()|[\]\\]/g, (token) => {
			if (token === "**/") return "(?:.*/)?";
			if (token === "*") return "[^/]*";
			return `\\${token}`;
		})}$`,
	);

/** パッケージの中の `*.test-d.ts` を全部集める */
export const typeTestFiles = (dir = "."): string[] =>
	sourceDirs(dir)
		.flatMap((name) =>
			sources(`${dir}/${name}`, (file) => file.endsWith(".test-d.ts")),
		)
		.map((path) => (dir === "." ? path.replace(/^\.\//, "") : path))
		.sort();

/**
 * `typecheck.include` が拾えていない型テスト。空なら問題なし。
 *
 * 拾えていないものは**落ちるのではなく走らない**ので、
 * 書いた主張が 1 つも検査されないまま緑になる。
 */
export const typeTestsNotCovered = (
	patterns: readonly string[],
	dir = ".",
): string[] => {
	const matchers = patterns.map(globToRegExp);
	return typeTestFiles(dir).filter(
		(file) => !matchers.some((matcher) => matcher.test(file)),
	);
};
