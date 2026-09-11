/**
 * ドキュメント同士の参照が生きていることを縛る。
 *
 * ## なぜ要るか
 *
 * 見出しを移すと参照が静かに切れる。ドキュメントを 3 層に割ったとき
 * 「リンクを機械で確かめた」と記録したが、**確かめたのはファイルの存在だけ**で、
 * 本文が**ファイル名に `「見出し名」` を続ける形**で指している参照は見ていなかった。
 *
 * あとから 6 件見つかった。3 層の分割とモノレポ化で移った見出しを
 * 古い場所のまま指していたもので、**リンクではなく地の文なので誰も気づけない**。
 *
 * | 内訳 | |
 * |---|---|
 * | 移動した見出しを古いファイルで指していた | 3 件（`live.yml` / `release-tsumekae.yml` / tsumekae の CONTRIBUTING） |
 * | 存在しない見出し名を指していた | 2 件（kisekae の `toForm.ts` / `packCheck.ts`） |
 * | 移動したファイルを古いパスで指していた | 1 件（kisekae の `collectForm.ts`） |
 *
 * ## 2 種類を見る
 *
 * | | 形 |
 * |---|---|
 * | Markdown のリンク | `[文字](相対パス)` |
 * | 地の文の見出し参照 | ファイル名のうしろに `「見出し名」` を続けたもの |
 *
 * 後者は `.md` だけでなく `.ts` のコメントと `.yml` にもある。
 *
 * ## 見出し名は部分一致で見る
 *
 * 地の文は見出しを縮めて書く（`## 5. 等価性テストは入力側を縛る` を
 * 「5. 等価性テスト」と指す）。完全一致を求めると、正しい参照が落ちる。
 * **見たいのは「その見出しがそのファイルに在るか」**なので部分一致で足りる。
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { describe, expect, test } from "vitest";
import { relativeLinks } from "./markdown";
import { repoRoot } from "./repoRoot";

const root = repoRoot();

/**
 * リポジトリのファイルを列挙する。
 *
 * **`--others` を付ける。** `git ls-files` だけだと追跡済みのファイルしか返らず、
 * **新しく足したドキュメントがコミットするまで走査されない。**
 * この検査を入れたコミット自身がそれで CI だけ落ちた
 * （手元では新規の 3 ファイルが未追跡で、走査対象に入っていなかった）。
 *
 * `--exclude-standard` で gitignore は尊重する（`fixtures/live/` などを読まない）。
 */
const repoFiles = (): string[] =>
	execFileSync(
		"git",
		["ls-files", "--cached", "--others", "--exclude-standard"],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.filter(Boolean);

/** `..` と `.` を畳む。参照先を実在するパスに揃えるため */
const normalize = (path: string): string => {
	const out: string[] = [];
	for (const part of path.split("/")) {
		if (part === "..") out.pop();
		else if (part !== "." && part !== "") out.push(part);
	}
	return out.join("/");
};

/**
 * 空白を全部落とす。
 *
 * **日本語は行の折り返しに空白を入れない。** 行をまたぐ参照を空白で繋ぐと
 * 「…`pnpm publish` を 手元から実行しない」になって見出しと一致しなくなる。
 * 一方コードの参照（`pack:check`）には空白が無いので、
 * 両方まとめて落とすのが一番揺れない。
 */
const squash = (text: string): string => text.replace(/\s+/g, "");

const headingsOf = (file: string): string[] =>
	readFileSync(join(root, file), "utf8")
		.split("\n")
		.flatMap((line) => {
			const matched = /^#+\s+(.*?)\s*$/.exec(line);
			return matched?.[1] ? [matched[1]] : [];
		});

const files = repoFiles();
const markdown = files.filter((f) => f.endsWith(".md"));
const headings = new Map(markdown.map((f) => [f, headingsOf(f)]));

/**
 * コードを落とす。
 *
 * **コードの中のリンクは例で、実在しなくてよい。**
 * リンクの書き方を説明する文書が `` `[MIT](LICENSE)` `` と書いた瞬間に
 * 「`docs/LICENSE` が無い」と報告された。
 *
 * 落とすのはこの検査だけ。**見出し参照の方は落とさない。**
 * `` `EXAMPLE.md`「見出し名」 `` のようにファイル名がバックティックの中にあるのが
 * 普通なので、落とすと何も拾えなくなる。
 *
 * **例に架空の名前を使うのは、この検査に引っかからないため。**
 * 実在する 6 つの文書名しか見ないので、`EXAMPLE.md` なら例のままでいられる。
 * 許容リストを作らずに済む書き方。
 */
const withoutCode = (text: string): string =>
	text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

describe("Markdown のリンクが実在する", () => {
	const broken: string[] = [];
	let checkedLinks = 0;
	for (const file of markdown) {
		const text = withoutCode(readFileSync(join(root, file), "utf8"));
		// 抽出は `markdown.ts`。pack:check（tarball の中で解決するか）と
		// 同じ形を 3 箇所に写していたので、抽出だけを 1 箇所にした
		for (const link of relativeLinks(text)) {
			checkedLinks += 1;
			const target = normalize(posix.join(posix.dirname(file), link));
			if (!existsSync(join(root, target))) broken.push(`${file} → ${link}`);
		}
	}

	test("断リンクが無い", () => {
		expect(broken).toEqual([]);
	});

	/** リンクが 0 件だと、この検査は何も見ずに緑になる */
	test("リンクを実際に拾えている", () => {
		expect(checkedLinks).toBeGreaterThan(15);
	});
});

const DOC_NAMES = "DECISIONS|TOOLCHAIN|KINTONE|CONTRIBUTING|CLAUDE|README";

/**
 * 地の文の見出し参照を拾う。
 *
 * ## 拾えない形があった
 *
 * ファイル名と `「見出し名」` の間に**閉じ記号が入る形**を落としていた。
 *
 * ```md
 * 手順は [`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「初回公開の手順」。
 * ```
 *
 * `.md` の直後が `` ` `` か空白しか許されておらず、`)` で外れる。
 * **この形はドキュメントで普通に書く**（リンクにしつつ見出しも指す）ので、
 * 検査に見えない参照が黙って溜まっていた。
 *
 * 実際 monosashi → tsumekae の改名で 2 箇所が壊れたまま緑だった。
 * ルートの CLAUDE.md と CONTRIBUTING.md にあった、初回公開の手順への参照。
 * **検査が通ったから直したのではなく、人が気づいて直した。**
 *
 * `[text](path)` は `.md` が 2 回出るが、閉じ記号を許せば
 * 2 つめ（`](path)` の側）が 「 に届くので拾える。
 *
 * ## 文書名を引数にする理由
 *
 * **このファイル自身が走査の対象**（`.ts` も見る）なので、下のテストに
 * 実在する文書名で例を書くと、その例が本物の参照として拾われて落ちる。
 * テストは架空の名前（`EXAMPLE.md`）を渡す。
 *
 * 走査から自分を除外する手は採らない。それは許容リストで、
 * 「例に架空の名前を使う」のと同じ理由でリンクの検査でも避けている。
 */
const headingReferences = (
	text: string,
	docNames = DOC_NAMES,
): { target: string; heading: string }[] => {
	// `[\`)\]]*` が今回足したところ。バッククォート・`)`・`]` の連続を許す
	const pattern = new RegExp(
		`\`?([A-Za-z0-9_./-]*(?:${docNames})\\.md)[\`)\\]]*\\s*(?:の)?\\s*[「｢]([^」｣]+)[」｣]`,
		"gs",
	);

	return [...text.matchAll(pattern)].flatMap(([, target, raw]) => {
		if (target === undefined || raw === undefined) return [];
		// **行をまたぐ参照はコメント記号が混ざる。**
		// YAML の `#`、ブロックコメントの `*`、`//` を行頭から落とす。
		// 落とさないと「この環境で `pnpm publish` を # 手元から実行しない」になる
		const heading = squash(
			raw
				.split("\n")
				.map((line) => line.replace(/^\s*(?:#|\*|\/\/)\s*/, ""))
				.join(""),
		);
		return [{ target, heading }];
	});
};

/**
 * 拾い方そのものを縛る。
 *
 * **リポジトリ全体を走査するテストだけでは足りない。** あれは
 * 「拾えたものが解決するか」しか見ないので、**拾えていない形があっても緑**。
 * 今回の穴はまさにそれで、参照の件数が 15 を超えていることだけを見ていた。
 *
 * 書き方を 1 つ足したら、まずここに例を足す。
 */
describe("参照の拾い方", () => {
	/** 架空の名前。実在する文書名で書くと、この例自身が本物の参照として拾われる */
	const refs = (source: string) => headingReferences(source, "EXAMPLE");

	test.each([
		["バッククォート", "`docs/EXAMPLE.md`「見出し名」"],
		["素のファイル名", "docs/EXAMPLE.md「見出し名」"],
		["の を挟む", "`docs/EXAMPLE.md` の「見出し名」"],
		// **これが拾えていなかった形。**
		// `.md` の直後が `)` なので、閉じ記号を許すまで外れていた
		[
			"Markdown のリンク",
			"手順は [`docs/EXAMPLE.md`](docs/EXAMPLE.md)「見出し名」。",
		],
		[
			"リンクのテキストがファイル名でない",
			"[説明](docs/EXAMPLE.md)「見出し名」",
		],
	])("%s", (_name, source) => {
		expect(refs(source)).toEqual([
			{ target: "docs/EXAMPLE.md", heading: "見出し名" },
		]);
	});

	test("行をまたぐとコメント記号が混ざるので落とす", () => {
		expect(refs("# `EXAMPLE.md`「前半\n# 後半」")).toEqual([
			{ target: "EXAMPLE.md", heading: "前半後半" },
		]);
	});

	test("見出しを伴わないファイル名は拾わない", () => {
		expect(refs("詳しくは `docs/EXAMPLE.md` を読む")).toEqual([]);
	});
});

/**
 * 地の文が指す見出しが、そのファイルに在ることを見る。
 *
 * 参照元からの相対 → パッケージのルート → リポジトリのルートの順に探す。
 * `packages/kisekae/src/types/raw.ts` の `docs/DECISIONS.md` は
 * **パッケージ直下**を指しているので、ファイル相対だけでは解決できない。
 */
describe("地の文の見出し参照が生きている", () => {
	const candidates = (from: string): string[] => {
		const parts = from.split("/");
		const bases = [posix.dirname(from)];
		if (parts[0] === "packages" && parts[1]) bases.push(`packages/${parts[1]}`);
		bases.push("");
		return bases;
	};

	const broken: string[] = [];
	let checked = 0;
	for (const file of files.filter(
		(f) => f.endsWith(".md") || f.endsWith(".ts") || f.endsWith(".yml"),
	)) {
		const text = readFileSync(join(root, file), "utf8");
		for (const { target, heading } of headingReferences(text)) {
			checked += 1;
			const found = candidates(file).some((base) => {
				const resolved = normalize(base ? `${base}/${target}` : target);
				return (headings.get(resolved) ?? []).some((h) => {
					const candidate = squash(h);
					return candidate.includes(heading) || heading.includes(candidate);
				});
			});
			if (!found) broken.push(`${file} → ${target}「${heading}」`);
		}
	}

	test("指している見出しが実在する", () => {
		expect(broken).toEqual([]);
	});

	/** 参照が 0 件だと、この検査は何も見ずに緑になる */
	test("参照を実際に拾えている", () => {
		expect(checked).toBeGreaterThan(15);
	});
});

describe("パッケージのドキュメントが揃っている", () => {
	const packages = files
		.filter((f) => /^packages\/[^/]+\/package\.json$/.test(f))
		.map((f) => f.split("/")[1] ?? "");

	const published = packages.filter((name) => {
		const pkg: unknown = JSON.parse(
			readFileSync(join(root, "packages", name, "package.json"), "utf8"),
		);
		return (
			typeof pkg === "object" &&
			pkg !== null &&
			(pkg as { private?: boolean }).private !== true
		);
	});

	test("公開するパッケージが 2 つある", () => {
		expect(published.sort()).toEqual(["kisekae", "tsumekae"]);
	});

	/** 走査が空振りしていないことの当たり。0 件だと以下が全部素通りする */
	test("パッケージを実際に拾えている", () => {
		expect(packages.length).toBeGreaterThanOrEqual(3);
	});

	/**
	 * 公開するパッケージには同じ 4 つを置く。
	 * kisekae に CONTRIBUTING.md が無く、共通の手順が tsumekae の中にだけ
	 * 書かれていた状態を繰り返さないため
	 */
	test.each(["README.md", "CLAUDE.md", "CONTRIBUTING.md", "docs/DECISIONS.md"])(
		"公開するパッケージすべてに %s がある",
		(doc) => {
			const missing = published.filter(
				(name) => !existsSync(join(root, "packages", name, doc)),
			);
			expect(missing).toEqual([]);
		},
	);

	test("共通の手順はリポジトリのルートにある", () => {
		expect(existsSync(join(root, "CONTRIBUTING.md"))).toBe(true);
	});

	/**
	 * 各パッケージの CONTRIBUTING がルートを指していること。
	 *
	 * **`published` を使う。** 以前はここだけ `["kisekae", "tsumekae"]` と
	 * 書き直していて、3 つめの公開パッケージが増えても検査が追従しなかった。
	 * 上で計算したものがあるのに書き写すのは、このリポジトリが何度も
	 * 塞いできた形そのもの
	 */
	test.each(published)("%s の CONTRIBUTING がルートを指している", (name) => {
		const text = readFileSync(
			join(root, "packages", name, "CONTRIBUTING.md"),
			"utf8",
		);
		expect(text).toContain("../../CONTRIBUTING.md");
	});
});

/**
 * `repoRoot()` がこの検査の走るリポジトリを指していること。
 *
 * **以前ここは `relative(root, join(root, "packages/rig"))` を見ていて、
 * `root` が何であっても真になる式だった**（構造上落ちようがない）。
 * 見たいのは「`repoRoot()` の返り値が本当にこのリポジトリか」なので、
 * ルートにしか無いものと、rig 自身の位置の両方を確かめる。
 */
test("repoRoot() がこのリポジトリのルートを指している", () => {
	expect(existsSync(join(root, "pnpm-workspace.yaml"))).toBe(true);
	expect(existsSync(join(root, "packages/rig/package.json"))).toBe(true);
	// この検査ファイル自身が、求めたルートからの相対で見つかること
	expect(existsSync(join(root, relative(root, import.meta.filename)))).toBe(
		true,
	);
});
