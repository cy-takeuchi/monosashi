import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: ["node_modules/**", "dist/**"],
		// *.test-d.ts のコンパイル時型テストを有効にする。
		// 「型が意図した区別をしているか」は実行時のテストでは確かめられない。
		// **false にすると落ちるのではなく収集されなくなる**ので、
		// test/typecheckScope.test.ts が有効であることを縛っている
		typecheck: {
			enabled: true,
			include: ["src/**/*.test-d.ts", "test/**/*.test-d.ts"],
			tsconfig: "tsconfig.json",
		},
	},
});
