import { readFileSync } from "node:fs";
import { sources, withoutComments } from "./sources";

/**
 * 実行スクリプトの入口が `runScript` を通していることを確かめる。
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
 * ## 入口の探し方は 2 つ要る
 *
 * | | 拾えるもの | 漏れるもの |
 * |---|---|---|
 * | トップレベルの `main()` 呼び出し | `runScript` を通さず `main()` を呼ぶ形 | **`main` を持たないスクリプト** |
 * | `package.json` の `tsx <path>` | 実際に叩かれる入口すべて | スクリプトに登録していないもの |
 *
 * **1 つめだけでは足りなかった。** `monosashi` の `tools/fixture/build.ts` は
 * `main` を定義せずトップレベルで実行していたので、`fixture:build` という
 * 立派な入口でありながら検査を素通りしていた。
 * 同じ役割の kisekae `tools/formDefinition.ts` は `runScript` を通しており、
 * **対になっている 2 本で扱いが違う**状態が緑のまま残っていた。
 */

/**
 * `runScript` を通していない入口の一覧。空なら問題なし。
 *
 * トップレベルの `main()` 呼び出しを探す。`const main = ...` の**定義**ではなく
 * **呼び出し**を探すので、行頭の `main()` だけを見る。
 * コメントは先に落とす（JSDoc の中の例で誤検出しないため）。
 *
 * @param dir 走査する場所。既定は cwd 相対の `tools`
 */
export const scriptsCallingMainDirectly = (dir = "tools"): string[] =>
	sources(dir, (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
		.filter((path) =>
			/^main\(\)/m.test(withoutComments(readFileSync(path, "utf8"))),
		)
		.sort();

/**
 * `package.json` の `scripts` が `tsx` で叩く `.ts` の一覧。
 *
 * `"pack:check": "pnpm run build && tsx tools/package/packCheck.ts && tsx tools/package/bundleSize.ts"`
 * のように 1 つのスクリプトが 2 本呼ぶことがあるので、全部拾う。
 */
export const tsxEntries = (dir = "."): string[] => {
	const pkg = JSON.parse(readFileSync(`${dir}/package.json`, "utf8")) as {
		scripts?: { [name: string]: string };
	};
	const paths = new Set<string>();
	for (const command of Object.values(pkg.scripts ?? {})) {
		for (const [, path] of command.matchAll(/\btsx\s+(\S+\.ts)\b/g)) {
			if (path !== undefined) paths.add(path);
		}
	}
	return [...paths].sort();
};

/**
 * `package.json` から叩かれるのに `runScript` を通していない入口。空なら問題なし。
 *
 * **`main` を持つかどうかを見ない。** トップレベルで実行するスクリプトも
 * 入口であることに変わりはなく、むしろそちらのほうが
 * 例外が Node の未処理例外になって出力の形が他と変わる。
 */
export const entriesWithoutRunScript = (dir = "."): string[] =>
	tsxEntries(dir).filter(
		(path) =>
			!/\brunScript\b/.test(
				withoutComments(readFileSync(`${dir}/${path}`, "utf8")),
			),
	);
