/**
 * `runScript` が失敗したときの出力と終了コードを縛る。
 *
 * ここで見たいのは「例外が出たら落ちる」ことだけではない。
 * **kintone の REST エラーの詳細が出ること**が本題で、
 * それを落としていた写し間違いが実際に 1 本あった。
 */

import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { runScript } from "./run";

afterEach(() => {
	vi.restoreAllMocks();
});

/** `process.exit` と stderr を捕まえて、実際には落ちないようにする */
const capture = async (main: () => Promise<void>) => {
	const written: string[] = [];
	const exited: number[] = [];
	vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
		written.push(String(chunk));
		return true;
	});
	vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
		exited.push(code ?? 0);
		// 本物は戻らないが、ここでは後続を走らせないために投げない。
		// runScript の catch はこのあと何もしないので問題ない
		return undefined as never;
	}) as typeof process.exit);

	runScript(main);
	// **catch はマイクロタスクで走る。**`await Promise.resolve()` を
	// 決まった回数だけ挟むのは駄目で、`runScript` の中の then/catch が
	// 1 段増えた瞬間に空のまま読んでしまう（実際にそれで落ちた）。
	// setImmediate まで待てば、その時点のマイクロタスクは全部流れている
	await new Promise((resolve) => {
		setImmediate(resolve);
	});
	return { written: written.join(""), exited };
};

describe("runScript", () => {
	test("成功したときは何も書かず、落とさない", async () => {
		const { written, exited } = await capture(async () => {});
		expect(written).toBe("");
		expect(exited).toEqual([]);
	});

	test("失敗したら終了コード 1 で落とす", async () => {
		const { exited } = await capture(() =>
			Promise.reject(new Error("失敗した")),
		);
		expect(exited).toEqual([1]);
	});

	// **素の Error でも場所が分かるようにする。**
	// `describeError` は message しか取らないので、これが無いと
	// TypeError で落ちたときに 1 行しか出ず、CI では直せない
	test("Error のときはスタックも出す", async () => {
		const error = new Error("素のエラー");
		const { written } = await capture(() => Promise.reject(error));

		expect(written).toContain("素のエラー");
		expect(written, "スタックが出ていない").toContain("run.test.ts");
	});

	// **これが本題。** `String(error)` に書き換えるとフィールドごとの理由が消える。
	// 検証アプリの食い違いを報告するスクリプトが、まさにそうなっていた
	test("kintone の REST エラーはフィールドごとの理由まで出す", async () => {
		const restError = Object.assign(new Error("Bad Request"), {
			code: "CB_VA01",
			status: 400,
			errors: {
				"record[singleLineTextUnique].value": {
					messages: ["既に同じ値が存在します。"],
				},
			},
		});

		const { written } = await capture(() => Promise.reject(restError));

		expect(written).toContain("Bad Request");
		expect(written).toContain("CB_VA01");
		// ここが `String(error)` だと出ない
		expect(written).toContain("record[singleLineTextUnique].value");
		expect(written).toContain("既に同じ値が存在します。");
	});
});

/** `tools/` 配下の `.ts` を全部集める */
const toolSources = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory()) return toolSources(path);
		return entry.name.endsWith(".ts") ? [path] : [];
	});

describe("実行スクリプトの入口", () => {
	// 写して回ると食い違いが黙って残る。`runScript` を通していない
	// 入口が復活したらここで落ちる
	test("main() を直接呼ばない", () => {
		const offenders = toolSources("tools")
			.filter((path) => !path.endsWith(".test.ts"))
			.filter((path) => {
				const source = readFileSync(path, "utf8")
					.replace(/\/\*[\s\S]*?\*\//g, "")
					.replace(/^\s*\/\/.*$/gm, "");
				// 定義（const main = ...）ではなく、トップレベルの呼び出しを探す
				return /^main\(\)/m.test(source);
			});

		expect(
			offenders,
			`runScript を通していない入口がある: ${offenders.join(", ")}`,
		).toEqual([]);
	});
});
