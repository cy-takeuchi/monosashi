import { describeError } from "./describeError";

/**
 * 実行スクリプトの入口。**失敗したときの出力と終了コードを 1 箇所にする。**
 *
 * ## なぜ 1 箇所にするか
 *
 * `tools/` の実行スクリプト 7 本が末尾に同じ 4 行を持っていた。
 *
 * ```ts
 * main().catch((error: unknown) => {
 * 	process.stderr.write(`${describeError(error)}\n`);
 * 	process.exit(1);
 * });
 * ```
 *
 * **7 本のうち 1 本だけ `describeError` ではなく `String(error)` だった**
 * （`fixture-app/verify.ts`）。`describeError` は kintone の REST エラーの
 * `errors` を展開してフィールドごとの理由を出すので、`String` にすると
 * `KintoneRestAPIError: ...` の 1 行だけになる。
 *
 * よりによって `verify.ts` は**検証アプリのフィールドの食い違いを報告するのが
 * 仕事**で、7 本の中で一番情報の少ない出力になっていた。
 * 写して回ると、こういう食い違いが黙って残る。
 *
 * ## `process.exit(1)` にする理由
 *
 * `process.exitCode = 1` では、未解決の Promise が残っている間 Node が
 * 終わらない。REST クライアントが接続を保っていると待たされるので、
 * 失敗したらその場で落とす。
 *
 * ## スタックも出す
 *
 * `describeError` は `Error` から `message` しか取らない。kintone の
 * REST エラーには十分だが、**素の TypeError では 1 行しか出ず**、
 * どこで落ちたのか分からない。`pack:check` は CI で走るので、
 * そこで 1 行だけ出ても直せない。
 *
 * 以前の 7 本もこの状態だった。スタックを足すのは意図した変更で、
 * 出る情報が減る場合は無い。
 */

/** 出力する 1 行目以降。REST エラーの詳細のあとにスタックを続ける */
const message = (error: unknown): string => {
	const described = describeError(error);
	if (!(error instanceof Error) || error.stack === undefined) return described;
	return `${described}\n\n${error.stack}`;
};
export const runScript = (main: () => void | Promise<void>): void => {
	// **同期の main も受ける。** `packCheck.ts` / `fixture/setBehavior.ts` は
	// 同期で、以前は `main();` を直に呼んでいた。例外は Node の
	// 未処理例外になり、出力の形が他の 7 本と違っていた
	Promise.resolve()
		.then(main)
		.catch((error: unknown) => {
			// **1 回の write にまとめる。** パイプ越しの stderr は非同期に
			// なり得るので、直後の process.exit で途中まで消える。
			// 2 回に分けるとスタックだけ落ちることがある
			process.stderr.write(`${message(error)}\n`);
			process.exit(1);
		});
};
