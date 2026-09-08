/**
 * 型チェックの対象が漏れていないことを確かめる。
 *
 * ## なぜ要るか
 *
 * `tsconfig.json` の `include` に `e2e/**\/*` が無く、**869 行の
 * `e2e/panel.ts` と 491 行の `e2e/collect.spec.ts` が長期間、
 * 型を誰にも見られていなかった**（実測: `const x: number = "文字列"` を
 * 入れても `pnpm run check` が緑）。
 *
 * `biome` は `e2e/` を見るが lint と整形だけで、型は見ない。
 * vitest の `typecheck` は `*.test-d.ts` だけを対象にしている。
 * つまり `tsc --noEmit` が唯一の型の門で、その門が `include` の並び 1 行で開く。
 *
 * ディレクトリを足したときに `include` を直し忘れる、というのがこの漏れの形。
 * **特定のディレクトリを名指しで縛るのではなく、`.ts` を置いた場所が
 * 全部入っていることを縛る。** 名指しだと次に足すディレクトリで同じ穴が開く。
 *
 * ## 門は 2 つある
 *
 * `tsc --noEmit` が見るのは**書いたコードが型として通るか**まで。
 * 「型がこの区別をしていること」を確かめているのは `*.test-d.ts` で、
 * そちらは vitest の `typecheck` が動かしている。
 *
 * この 2 つ目の門も、**設定の 1 行で閉じる**。
 * `typecheck.enabled` を false にすると `*.test-d.ts` は
 * **落ちるのではなく収集されなくなる**（実測: 16 → 11 ファイル、
 * 356 → 287 テスト。嘘の型主張を入れたまま緑になる）。
 * 減ったことは表示されないので、気づく手がかりが無い。
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, test } from "vitest";
import vitestConfig from "../vitest.config";

/** `tsc` が出力する場所と、外部から入ってくる場所。ここに `.ts` があっても対象外でよい */
const NOT_SOURCE = new Set([
	"node_modules",
	"dist",
	"probe-dist",
	"test-results",
	".git",
]);

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
const readJsonc = (path: string): unknown => {
	const source = readFileSync(path, "utf8")
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
	return JSON.parse(source);
};

const include = (() => {
	const config = readJsonc("tsconfig.json");
	const value = (config as { include?: unknown }).include;
	expect(Array.isArray(value), "tsconfig.json に include が無い").toBe(true);
	return value as string[];
})();

/** `.ts` を 1 つ以上持つ最上位ディレクトリ */
const sourceDirs = readdirSync(".")
	.filter((name) => !NOT_SOURCE.has(name) && statSync(name).isDirectory())
	.filter((name) => hasTypeScript(name));

function hasTypeScript(dir: string): boolean {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (hasTypeScript(`${dir}/${entry.name}`)) return true;
			continue;
		}
		if (entry.name.endsWith(".ts")) return true;
	}
	return false;
}

describe("tsconfig.json の include", () => {
	test(".ts を置いた最上位ディレクトリを全て含む", () => {
		expect(sourceDirs.length, "探索が空振りしている").toBeGreaterThan(0);

		const missing = sourceDirs.filter(
			(dir) => !include.includes(`${dir}/**/*`),
		);
		expect(
			missing,
			`include に無い: ${missing.join(", ")}（型チェックの対象外になっている）`,
		).toEqual([]);
	});

	test("e2e が対象に入っている", () => {
		// 上のテストに含まれるが、この漏れが実際に起きた場所なので単独でも縛る
		expect(include).toContain("e2e/**/*");
	});
});

/**
 * glob を正規表現にする。`include` の照合に使う。
 *
 * 扱うのは `<ディレクトリ>/**\/*.test-d.ts` の形だけなので、
 * `**` と `*` と `.` を見れば足りる。
 */
const globToRegExp = (pattern: string): RegExp =>
	new RegExp(
		// **1 回の走査で置き換える。** `**/` を一度別の文字に退避させる書き方は、
		// 退避先が制御文字だと biome に叱られ、普通の文字だとパターンと衝突し得る
		`^${pattern.replace(/\*\*\/|\*|[.+^${}()|[\]\\]/g, (token) => {
			if (token === "**/") return "(?:.*/)?";
			if (token === "*") return "[^/]*";
			return `\\${token}`;
		})}$`,
	);

/** リポジトリの中の `*.test-d.ts` を全部集める */
const typeTests = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory()) {
			return NOT_SOURCE.has(entry.name) ? [] : typeTests(path);
		}
		return entry.name.endsWith(".test-d.ts") ? [path] : [];
	});

describe("vitest の typecheck", () => {
	const typecheck = vitestConfig.test?.typecheck;

	// **false にすると落ちずに消える。** ここが一番危ない
	test("有効になっている", () => {
		expect(
			typecheck?.enabled,
			"false にすると *.test-d.ts が収集されなくなる（落ちるのではなく消える）",
		).toBe(true);
	});

	test("*.test-d.ts を全部拾っている", () => {
		const patterns = (typecheck?.include ?? []).map(globToRegExp);
		const files = readdirSync(".", { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && !NOT_SOURCE.has(entry.name))
			.flatMap((entry) => typeTests(entry.name));

		expect(files.length, "探索が空振りしている").toBeGreaterThan(0);

		const missing = files.filter(
			(file) => !patterns.some((pattern) => pattern.test(file)),
		);
		expect(
			missing,
			`typecheck.include に無い: ${missing.join(", ")}（型テストが走っていない）`,
		).toEqual([]);
	});
});
