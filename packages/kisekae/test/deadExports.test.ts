/**
 * export したまま誰も使っていないものが無いことを確かめる。
 *
 * 走査は `@jissoku/rig` が持つ（理由はそちらの JSDoc）。
 * ここは自分のツリーの根と、公開入口を渡すだけ。
 *
 * **tsumekae にしか無かった。** biome がファイル内の未使用しか見ないのは
 * どちらのパッケージでも同じで、kisekae は `src` / `test` / `tools` の
 * 3 ツリーを持ちながら同じ穴が開いたままだった。
 */

import { readFileSync } from "node:fs";
import { deadExports, declaredExports } from "@jissoku/rig/deadExports";
import { expandSources, rootConfigs } from "@jissoku/rig/sources";
import { describe, expect, test } from "vitest";

/**
 * 公開 API を持つファイル。
 *
 * `package.json` の `exports` は `.` の 1 つだけ（tsumekae と違って
 * `declare global` を持たないのでサブパスが要らない）。
 */
const PUBLIC_ENTRIES = ["src/index.ts"];

/**
 * `test/dist` は入れない。
 *
 * あそこは `dist/` を読む出荷物の検査で、`build:check` が別の tsconfig で
 * コンパイルする。通常の走査に混ぜると `dist` が無いときに読めない。
 */
const ROOTS = ["src", "test", "tools"];

// **root の `*.config.ts` も走査に入れる。** ビルド設定は根から
// `src/` の定数を読むことがあり、外すと実際に使われている export が
// 「未参照」と報告される（`vite.probe.config.ts` で実際に起きた）。
// `tsconfig.json` の `include` が `*.config.ts` を含んでいるのと揃える
const TARGETS = [...ROOTS, ...rootConfigs()];

const findings = deadExports(TARGETS, PUBLIC_ENTRIES);

describe("export したものは使われている", () => {
	test("走査が空振りしていない", () => {
		expect(
			TARGETS.flatMap((target) => expandSources(target)).length,
		).toBeGreaterThan(5);
		// 宣言の拾い漏れが無いことの当たり。ここが空になったら正規表現が壊れている
		expect(declaredExports(readFileSync("src/guard.ts", "utf8"))).toContain(
			"isInSubtable",
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
