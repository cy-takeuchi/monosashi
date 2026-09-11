/**
 * `tools/` の入口が `runScript` を通していることを確かめる。
 *
 * 走査は `@jissoku/rig` が持つ（規約の持ち主が `runScript` なので）。
 * ここは自分のツリーに適用するだけ。
 *
 * 写して回ると食い違いが黙って残る。それは `runScript` を作った理由そのもの
 * （7 本のうち 1 本だけ `describeError` ではなく `String(error)` だった）。
 */

import {
	entriesWithoutRunScript,
	scriptsCallingMainDirectly,
	tsxEntries,
} from "@jissoku/rig/toolConvention";
import { describe, expect, test } from "vitest";

describe("実行スクリプトの入口", () => {
	test("main() を直接呼ばない", () => {
		const offenders = scriptsCallingMainDirectly();
		expect(
			offenders,
			`runScript を通していない入口がある: ${offenders.join(", ")}`,
		).toEqual([]);
	});

	// **`main()` 探しだけでは足りなかった。** `tools/fixture/build.ts` は
	// main を持たずトップレベルで実行していたので、`fixture:build` という
	// 入口でありながら検査を素通りしていた
	test("package.json が叩く入口が全て runScript を通す", () => {
		const offenders = entriesWithoutRunScript();
		expect(
			offenders,
			`package.json から叩かれるのに runScript を通していない: ${offenders.join(", ")}`,
		).toEqual([]);
	});

	test("入口の探索が空振りしていない", () => {
		expect(tsxEntries().length).toBeGreaterThan(5);
	});
});
