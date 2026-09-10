/**
 * export したまま誰も使っていないものが無いことを確かめる。
 *
 * ## なぜ要るか
 *
 * `biome --error-on-warnings` は**ファイル内**の未使用は見るが、
 * **export した先が無いこと**は見ない。
 * 以前 `fieldsOfType` が死んだまま緑で通っていたのを見つけて
 * `--error-on-warnings` を足したが、塞がったのは半分だった。
 *
 * 実際にこれを足した時点で、1 度も呼ばれていない export が 2 つあった
 * （`e2e/panel.ts` の `sampleCount` は最初のコミットから、
 * `test/jsApi.ts` の `OfficialJsApi` は #10 から）。
 *
 * ## 「使われていない」の 2 種類
 *
 * どちらも消す対象だが、直し方が違う。
 *
 * | | 直し方 |
 * |---|---|
 * | どこからも参照されていない | 消す |
 * | 自分のファイルの中でだけ使われている | `export` を外す |
 *
 * 後者を放っておくと、そのファイルが外に何を提供しているのかが読めない。
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

/**
 * 公開 API を持つファイル。ここの export は外から使われないのが正常。
 *
 * `package.json` の `exports` が `.` と `./kintone` の 2 つだけなので、
 * 利用者から見える入口もこの 2 つ。
 */
const PUBLIC_ENTRIES = new Set(["src/index.ts", "src/kintone.ts"]);

const ROOTS = ["src", "test", "tools", "e2e"];

const sources = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory()) return sources(path);
		return entry.name.endsWith(".ts") ? [path] : [];
	});

/**
 * コメントを落とす。
 *
 * **落とさないと JSDoc の中の名前を「使われている」と数えてしまう。**
 * 死んだ export ほど JSDoc で言及されがちなので、ここを省くと
 * 検出したいものが軒並み素通りする。
 */
const withoutComments = (source: string): string =>
	source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const files = ROOTS.flatMap(sources);
const code = new Map(
	files.map((path) => [path, withoutComments(readFileSync(path, "utf8"))]),
);

/**
 * 行頭の `export` だけを拾う。
 *
 * 名前空間の中（`Api` のメンバーなど）は字下げされているので拾わない。
 * あれは `Api` ごと公開しているものなので、個別に参照は要らない。
 */
const declared = (source: string): string[] =>
	[
		...source.matchAll(
			/^export (?:declare )?(?:const|let|function|type|class|enum|interface|namespace) ([\p{ID_Start}$_][\p{ID_Continue}$]*)/gmu,
		),
	].map((match) => match[1] ?? "");

/** `export { a, b as c }` の中身。ここに出る名前は「参照」でもある */
const reExported = (source: string): string[] =>
	[...source.matchAll(/^export (?:type )?\{([^}]*)\}/gm)].flatMap((match) =>
		(match[1] ?? "")
			.split(",")
			.map((name) => name.trim().split(/\s+as\s+/)[1] ?? name.trim())
			.filter((name) => name !== ""),
	);

/**
 * 識別子としての出現を探す。
 *
 * **`\b` は使えない。** JavaScript の `\b` は ASCII の `\w` を基準にするので、
 * 非 ASCII の識別子（`誰も使わない` など）ではどこにも一致しない。
 * 一致しないと「参照ゼロ・宣言も拾えない」になり、**export したことすら
 * 検知できない**（変異テストを書いていて実際に踏んだ）。
 *
 * 今のリポジトリに非 ASCII の export は無いが、足した瞬間に黙って
 * 検査から漏れる形なので、最初から Unicode で書く。
 */
const mentions = (name: string, flags = ""): RegExp =>
	new RegExp(
		`(?<![\\p{ID_Continue}$])${name.replace(/\$/g, "\\$")}(?![\\p{ID_Continue}$])`,
		`u${flags}`,
	);

type Finding = { path: string; name: string; kind: "未参照" | "自分だけ" };

const findings: Finding[] = [];
for (const [path, source] of code) {
	const publicEntry = PUBLIC_ENTRIES.has(path);
	const names = publicEntry ? [] : [...declared(source), ...reExported(source)];

	for (const name of names) {
		const used = [...code].filter(
			([other, text]) => other !== path && mentions(name).test(text),
		);
		if (used.length > 0) continue;

		// 自分のファイルでの出現数。宣言 1 回だけなら誰も使っていない
		const own = (source.match(mentions(name, "g")) ?? []).length;
		findings.push({ path, name, kind: own > 1 ? "自分だけ" : "未参照" });
	}
}

describe("export したものは使われている", () => {
	test("走査が空振りしていない", () => {
		expect(files.length).toBeGreaterThan(50);
		// 公開 API のファイルは除外しているので、ここには出てこない
		// 宣言の拾い漏れが無いことの当たり。ここが空になったら正規表現が壊れている
		expect(declared(code.get("src/guard/record.ts") ?? "")).toContain(
			"isSubtable",
		);
	});

	test("どこからも参照されていない export が無い", () => {
		const dead = findings.filter((f) => f.kind === "未参照");
		expect(
			dead.map((f) => `${f.path}: ${f.name}`),
			"消すか、使うこと",
		).toEqual([]);
	});

	test("自分のファイルの中でだけ使う export が無い", () => {
		const local = findings.filter((f) => f.kind === "自分だけ");
		expect(
			local.map((f) => `${f.path}: ${f.name}`),
			"export を外すこと（外に何を提供しているのかが読めなくなる）",
		).toEqual([]);
	});
});
