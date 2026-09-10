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
 * | 移動した見出しを古いファイルで指していた | 3 件（`live.yml` / `release-monosashi.yml` / monosashi の CONTRIBUTING） |
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

describe("Markdown のリンクが実在する", () => {
	const broken: string[] = [];
	for (const file of markdown) {
		const text = readFileSync(join(root, file), "utf8");
		for (const [, link] of text.matchAll(/\]\(([^)#][^)]*)\)/g)) {
			if (link === undefined || /^(https?|mailto):/.test(link)) continue;
			const target = normalize(
				posix.join(posix.dirname(file), link.split("#")[0] ?? ""),
			);
			if (!existsSync(join(root, target))) broken.push(`${file} → ${link}`);
		}
	}

	test("断リンクが無い", () => {
		expect(broken).toEqual([]);
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
	const docNames = "DECISIONS|TOOLCHAIN|KINTONE|CONTRIBUTING|CLAUDE|README";
	const pattern = new RegExp(
		`\`?([A-Za-z0-9_./-]*(?:${docNames})\\.md)\`?\\s*(?:の)?\\s*[「｢]([^」｣]+)[」｣]`,
		"gs",
	);

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
		for (const [, target, raw] of text.matchAll(pattern)) {
			if (target === undefined || raw === undefined) continue;
			checked += 1;
			// **行をまたぐ参照はコメント記号が混ざる。**
			// YAML の `#`、ブロックコメントの `*`、`//` を行頭から落とす。
			// 落とさないと「この環境で `pnpm publish` を # 手元から実行しない」になる
			const heading = squash(
				raw
					.split("\n")
					.map((line) => line.replace(/^\s*(?:#|\*|\/\/)\s*/, ""))
					.join(""),
			);
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
		expect(published.sort()).toEqual(["kisekae", "monosashi"]);
	});

	/**
	 * 公開するパッケージには同じ 4 つを置く。
	 * kisekae に CONTRIBUTING.md が無く、共通の手順が monosashi の中にだけ
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

	/** 各パッケージの CONTRIBUTING がルートを指していること */
	test.each(["kisekae", "monosashi"])(
		"%s の CONTRIBUTING がルートを指している",
		(name) => {
			const text = readFileSync(
				join(root, "packages", name, "CONTRIBUTING.md"),
				"utf8",
			);
			expect(text).toContain("../../CONTRIBUTING.md");
		},
	);
});

test("この検査自身がリポジトリのルートを見ている", () => {
	expect(relative(root, join(root, "packages/rig"))).toBe(
		join("packages", "rig"),
	);
});
