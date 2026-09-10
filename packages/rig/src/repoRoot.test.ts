/**
 * `repoRoot` がリポジトリのルートを見つけることを縛る。
 *
 * ここが狂うと `.env` を読めず、症状は「環境変数が未設定です」になって
 * 原因が読めない。**cwd に依存しないこと**が要点。
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { envPath, repoRoot } from "./repoRoot";

describe("repoRoot", () => {
	test("pnpm-workspace.yaml のある場所を返す", () => {
		const root = repoRoot();
		expect(existsSync(join(root, "pnpm-workspace.yaml"))).toBe(true);
	});

	/** モノレポにすると cwd がパッケージのディレクトリになる。そこでも同じ答えを返す */
	test("深いディレクトリから呼んでも同じ場所を返す", () => {
		expect(repoRoot("tools/shared")).toBe(repoRoot());
		expect(repoRoot("packages/kisekae/src/types")).toBe(repoRoot());
	});

	test("envPath はルートの .env を指す", () => {
		expect(envPath()).toBe(join(repoRoot(), ".env"));
	});

	/** 黙って cwd を使わない。落ちなければ原因が読めなくなる */
	test("リポジトリの外なら落ちる", () => {
		expect(() => repoRoot("/")).toThrow(
			/pnpm-workspace\.yaml が見つかりません/,
		);
	});
});
