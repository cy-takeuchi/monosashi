/**
 * `tools/` の入口が `runScript` を通していることを確かめる。
 *
 * 走査は `@kintone-type/rig` が持つ（規約の持ち主が `runScript` なので）。
 * ここは自分のツリーに適用するだけ。
 *
 * 写して回ると食い違いが黙って残る。それは `runScript` を作った理由そのもの
 * （7 本のうち 1 本だけ `describeError` ではなく `String(error)` だった）。
 */

import { scriptsCallingMainDirectly } from "@kintone-type/rig/toolConvention";
import { describe, expect, test } from "vitest";

describe("実行スクリプトの入口", () => {
	test("main() を直接呼ばない", () => {
		const offenders = scriptsCallingMainDirectly();
		expect(
			offenders,
			`runScript を通していない入口がある: ${offenders.join(", ")}`,
		).toEqual([]);
	});
});
