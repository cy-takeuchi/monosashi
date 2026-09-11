/**
 * 型チェックの対象が漏れていないことを確かめる。
 *
 * 走査は `@jissoku/rig` が持つ（理由はそちらの JSDoc）。
 * ここは自分のツリーに適用するだけ。
 *
 * この漏れが実際に起きたのはこのパッケージ（`e2e/` が長期間、型を
 * 誰にも見られていなかった）。
 */

import {
	dirsMissingFromInclude,
	tsconfigInclude,
	typeTestFiles,
	typeTestsNotCovered,
} from "@jissoku/rig/typecheckScope";
import { describe, expect, test } from "vitest";
import vitestConfig from "../vitest.config";

describe("tsconfig.json の include", () => {
	test(".ts を置いた最上位ディレクトリを全て含む", () => {
		const missing = dirsMissingFromInclude();
		expect(
			missing,
			`include に無い: ${missing.join(", ")}（型チェックの対象外になっている）`,
		).toEqual([]);
	});

	test("e2e が対象に入っている", () => {
		// 上のテストに含まれるが、この漏れが実際に起きた場所なので単独でも縛る
		expect(tsconfigInclude()).toContain("e2e/**/*");
	});
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
		expect(typeTestFiles().length, "探索が空振りしている").toBeGreaterThan(0);

		const missing = typeTestsNotCovered(typecheck?.include ?? []);
		expect(
			missing,
			`typecheck.include に無い: ${missing.join(", ")}（型テストが走っていない）`,
		).toEqual([]);
	});
});
