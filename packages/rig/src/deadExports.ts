import { readFileSync } from "node:fs";
import { expandSources, withoutComments } from "./sources";

/**
 * export したまま誰も使っていないものを探す。
 *
 * ## なぜ要るか
 *
 * `biome --error-on-warnings` は**ファイル内**の未使用は見るが、
 * **export した先が無いこと**は見ない。
 * tsumekae でこれを足した時点で、1 度も呼ばれていない export が 2 つあった
 * （`e2e/panel.ts` の `sampleCount` は最初のコミットから、
 * `test/jsApi.ts` の `OfficialJsApi` は #10 から）。
 *
 * ## なぜ rig が持つのか
 *
 * 理由（biome はファイル内しか見ない）がパッケージに依存しないのに、
 * **tsumekae にしか無かった。** kisekae は `src` / `test` / `tools` の
 * 3 ツリーを持ちながら、同じ穴が開いたままだった。
 * 写して回ると片方だけ古くなるので、走査をここに置いて
 * 各パッケージは根とその公開入口だけを渡す。
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

export type DeadExport = {
	path: string;
	name: string;
	kind: "未参照" | "自分だけ";
};

/**
 * 行頭の `export` だけを拾う。
 *
 * 名前空間の中（`Api` のメンバーなど）は字下げされているので拾わない。
 * あれは `Api` ごと公開しているものなので、個別に参照は要らない。
 */
export const declaredExports = (source: string): string[] =>
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

/** 走査したファイルと、コメントを落とした中身 */
export const collectSources = (roots: readonly string[]): Map<string, string> =>
	new Map(
		roots
			.flatMap((root) => expandSources(root))
			.map((path) => [path, withoutComments(readFileSync(path, "utf8"))]),
	);

/**
 * 死んだ export の一覧。
 *
 * @param roots 走査する根。ディレクトリでもファイルでもよい
 *   （`["src", "test", "tools", "vite.config.ts"]` など）
 * @param publicEntries 利用者から見える入口。ここの export は外から使われないのが正常
 */
export const deadExports = (
	roots: readonly string[],
	publicEntries: readonly string[],
): DeadExport[] => {
	const code = collectSources(roots);
	const isPublic = new Set(publicEntries);

	const findings: DeadExport[] = [];
	for (const [path, source] of code) {
		if (isPublic.has(path)) continue;

		for (const name of [...declaredExports(source), ...reExported(source)]) {
			const used = [...code].some(
				([other, text]) => other !== path && mentions(name).test(text),
			);
			if (used) continue;

			// 自分のファイルでの出現数。宣言 1 回だけなら誰も使っていない
			const own = (source.match(mentions(name, "g")) ?? []).length;
			findings.push({ path, name, kind: own > 1 ? "自分だけ" : "未参照" });
		}
	}
	return findings;
};
