/**
 * 型チェックの対象が漏れていないことを確かめる。
 *
 * 走査は同じディレクトリの `typecheckScope.ts`。ここは自分のツリーに
 * 適用するだけで、公開する 2 パッケージと同じ扱いにする。
 *
 * **rig の `tsconfig.json` にも「typecheckScope.test.ts が縛っている」と
 * 書いてあったが、そのファイルは無かった。** rig は実測の足場なので、
 * ここの型が緩むと 2 パッケージの採取が静かに壊れる。
 */

import { describe, expect, test } from "vitest";
import { dirsMissingFromInclude, typeTestFiles } from "./typecheckScope";

describe("tsconfig.json の include", () => {
	test(".ts を置いた最上位ディレクトリを全て含む", () => {
		const missing = dirsMissingFromInclude();
		expect(
			missing,
			`include に無い: ${missing.join(", ")}（型チェックの対象外になっている）`,
		).toEqual([]);
	});
});

/**
 * rig には型テストがまだ無い。
 *
 * **「無い」を明示的に縛る。** 足した瞬間にここが落ちるので、
 * `vitest.config.ts` に `typecheck` を書き忘れて
 * 「書いた主張が 1 つも走っていない」状態になることがない。
 * 公開する 2 パッケージは `typecheck.enabled` と
 * `typecheck.include` の 2 つを縛っている。
 */
test("型テストを足すなら vitest.config.ts に typecheck を書く", () => {
	expect(
		typeTestFiles(),
		"*.test-d.ts を足したら typecheck: { enabled: true, include: [...] } を設定し、2 パッケージと同じ検査をここに足すこと",
	).toEqual([]);
});
