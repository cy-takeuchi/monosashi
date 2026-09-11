/**
 * 型チェックの対象が漏れていないことを確かめる。
 *
 * 走査は `@jissoku/rig` が持つ（理由はそちらの JSDoc）。
 * ここは自分のツリーに適用するだけ。
 *
 * **このファイルは無かった。** それでも `tsconfig.json` と
 * `vitest.config.ts` には「test/typecheckScope.test.ts が縛っている」と
 * 書いてあった。kisekae は型の主張の大半を `*.test-d.ts` に置いている
 * （`raw.test-d.ts` / `field.test-d.ts` / `rawKeys.test-d.ts`）ので、
 * `typecheck.enabled` が false になればそれが丸ごと黙って消える。
 */

import {
	dirsMissingFromInclude,
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
});

describe("vitest の typecheck", () => {
	const typecheck = vitestConfig.test?.typecheck;

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
