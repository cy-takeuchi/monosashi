/**
 * export したまま誰も使っていないものが無いことを確かめる。
 *
 * 走査は `@jissoku/rig` が持つ（理由はそちらの JSDoc）。
 * ここは自分のツリーの根と、公開入口を渡すだけ。
 */

import { readFileSync } from "node:fs";
import { deadExports, declaredExports } from "@jissoku/rig/deadExports";
import { expandSources, rootConfigs } from "@jissoku/rig/sources";
import { describe, expect, test } from "vitest";

/**
 * 公開 API を持つファイル。ここの export は外から使われないのが正常。
 *
 * `package.json` の `exports` が `.` と `./kintone` の 2 つだけなので、
 * 利用者から見える入口もこの 2 つ。
 */
const PUBLIC_ENTRIES = ["src/index.ts", "src/kintone.ts"];

const ROOTS = ["src", "test", "tools", "e2e"];

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
		).toBeGreaterThan(50);
		// 宣言の拾い漏れが無いことの当たり。ここが空になったら正規表現が壊れている
		expect(
			declaredExports(readFileSync("src/guard/record.ts", "utf8")),
		).toContain("isSubtable");
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
