import { readdirSync, readFileSync } from "node:fs";

/**
 * `tools/` 配下の入口が `runScript` を通していることを確かめる。
 *
 * ## なぜ rig が持つのか
 *
 * 規約の持ち主は `runScript`（このパッケージ）だが、**検査される対象は
 * 各パッケージの `tools/`**。走査そのものをここに置いて、
 * 各パッケージは自分のツリーに適用するだけにする。
 *
 * 検査を各パッケージに写して回ると、`runScript` の意図が変わったときに
 * 片方だけ古くなる。それは `runScript` を作った理由そのもの
 * （7 本のうち 1 本だけ `describeError` ではなく `String(error)` だった）。
 *
 * ## 何を探すのか
 *
 * トップレベルの `main()` 呼び出し。`const main = ...` の**定義**ではなく
 * **呼び出し**を探すので、行頭の `main()` だけを見る。
 * コメントは先に落とす（JSDoc の中の例で誤検出しないため）。
 */

const sources = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = `${dir}/${entry.name}`;
		if (entry.isDirectory()) return sources(path);
		return entry.name.endsWith(".ts") ? [path] : [];
	});

/**
 * `runScript` を通していない入口の一覧。空なら問題なし。
 *
 * @param dir 走査する場所。既定は cwd 相対の `tools`
 */
export const scriptsCallingMainDirectly = (dir = "tools"): string[] =>
	sources(dir)
		.filter((path) => !path.endsWith(".test.ts"))
		.filter((path) => {
			const source = readFileSync(path, "utf8")
				.replace(/\/\*[\s\S]*?\*\//g, "")
				.replace(/^\s*\/\/.*$/gm, "");
			return /^main\(\)/m.test(source);
		});
