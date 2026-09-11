import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeJson } from "./json";
import { relativeLinks } from "./markdown";

/**
 * 出荷物を利用者と同じ立場から検査する土台。
 *
 * ## なぜ rig が持つのか
 *
 * kisekae の `packCheck.ts` にこう書いてあった。
 *
 * > 共通部分を先に抽象化しない。2 つ書いてみて初めて境界が正確に引ける
 *
 * **2 つ書き終わったので、いま引ける。** そして 2 本を並べた時点で、
 * すでに 4 つ食い違っていた。
 *
 * | | tsumekae | kisekae |
 * |---|---|---|
 * | TS 7 の bin | `node_modules/typescript/bin/tsc` | `node_modules/.bin/tsc` |
 * | 診断の出力 | 先頭 8 行で切る | 全部出す |
 * | 実行時 import | `failures` に積んで最後に判定 | **throw の後ろ。型が 1 つ落ちると一度も走らない** |
 * | 変数名 | `unexpected` が 2 重定義（shadowing） | `unexpectedOutput` に直してある |
 *
 * 揃える先はどれも「情報が多いほう」にした。
 * 失敗したときに原因が読めることが、この検査の存在理由そのものなので
 * （`run.ts` がスタックを出すようにしたのと同じ理由）。
 *
 * ## 何が共通で、何が共通でないか
 *
 * 共通なのは**手順**（pack → tarball の中身を出す → README のリンクを
 * 確かめる → 空のプロジェクトに入れる → 依存の実体を見る →
 * シナリオ × 解決方式 × コンパイラ版で型検査 → 実行時に読み込む）。
 *
 * 共通でないのは**シナリオ**。kisekae には `declare global` も
 * `/kintone` サブパスも無い。そこは各パッケージが持つ。
 */

/**
 * 検査する解決方式。
 *
 * 利用者の tsconfig はまちまちで、`exports` マップの扱いが方式ごとに違う。
 * ここが食い違うと、こちらの `exports` が壊れていても片方だけ通ってしまう。
 *
 * `node10` は入れていない。**TypeScript 7 で削除された**
 * （`Option 'moduleResolution=node10' has been removed`）ので、
 * このリポジトリが要求する TS では指定そのものができない。
 */
const MODES = [
	{ name: "bundler", module: "ESNext", resolution: "bundler" },
	{ name: "nodenext", module: "nodenext", resolution: "nodenext" },
] as const;

/**
 * 検査する TypeScript の版。
 *
 * 導入先（kintone-plugins）は**型チェックが 7、エディタが 5.9**という二重構成。
 * さらに AWS SAM 側は 5 系の別プロジェクト。
 * **どちらか片方でしか通らない `.d.ts` を出すと、片方が黙って any に落ちる。**
 *
 * 5.9 は `typescript-5.9` という別名で devDependency に入れてある
 * （同じパッケージの 2 版を 1 つのプロジェクトに入れるため）。
 * 版を上げるときは両方を上げる。
 *
 * **`node_modules/.bin/tsc` ではなく実体を指す。** `.bin` は 7 系への
 * シンボリックリンクで、5.9 側と形が揃わない。2 本並べたときに
 * 「どちらの版か」がパスから読めるほうがよい。
 */
const COMPILERS = [
	{ name: "7", bin: "node_modules/typescript/bin/tsc" },
	{ name: "5.9", bin: "node_modules/typescript-5.9/bin/tsc" },
] as const;

export type Scenario = {
	readonly name: string;
	readonly files: { readonly [fileName: string]: string };
	/** tsconfig の files。**並び順に意味がある**（名前空間のマージは宣言順で決まる） */
	readonly entries: readonly string[];
	/**
	 * 出てほしい診断コード。
	 *
	 * 空配列は「1 つも出ないこと」を意味する。
	 * ぶつかる組み合わせでは**出ないことこそが問題**なので、
	 * その旨を note に書く。
	 */
	readonly expected: readonly string[];
	/**
	 * 既定は true（TypeScript の既定に合わせる）。
	 * false にすると `dist/*.d.ts` そのものが検査対象になる。
	 */
	readonly skipLibCheck?: boolean;
	/**
	 * 既定は `["ES2022", "DOM"]`。
	 * DOM を外すと、ブラウザ前提の記述が型の解決に必須になっていないかを見られる。
	 */
	readonly lib?: readonly string[];
	readonly note?: string;
};

export type PackCheckOptions = {
	/** 公開するパッケージ名。利用者が import に書く名前 */
	readonly packageName: string;
	readonly scenarios: readonly Scenario[];
};

/**
 * 出荷物の consumer を、パッケージ名で解決する形に書き換える。
 *
 * `test/dist/consumer.ts` は `../../dist/index` を**相対パスで**読んでいる。
 * これは `.d.ts` の劣化は捕まえられるが、`exports` マップ・`files` の
 * 入れ忘れ・`types` の指し先・`moduleResolution` の違いを一切通らない。
 *
 * **同じ主張を 2 つ書かない。** 以前は packCheck 側にも同じ内容の
 * 利用者コードが文字列で置いてあり、そちらは biome も tsc も見ないので、
 * 壊れても気づけなかった。ファイルを 1 本にして、import 先だけ差し替える。
 *
 * @param packageName `../../dist/index` を置き換える名前
 * @param path 読む consumer。既定は `test/dist/consumer.ts`
 */
export const shippedConsumer = (
	packageName: string,
	path = "test/dist/consumer.ts",
): string =>
	readFileSync(path, "utf8").replace(
		/(["'])\.\.\/\.\.\/dist\/([A-Za-z0-9_-]+)\1/g,
		(_match, quote: string, name: string) =>
			`${quote}${name === "index" ? packageName : `${packageName}/${name}`}${quote}`,
	);

const run = (command: string, args: string[], cwd: string): string =>
	execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });

/**
 * 出荷される README の相対リンクが tarball の中で解決すること。
 *
 * README は npm のページにも、tarball を展開した人の手元にも出る。
 * `[MIT](../../LICENSE)` はパッケージのルートより上を指していて
 * **どちらでも解決しなかった**（各パッケージに LICENSE を置いて直した）。
 * 出荷しないもの（docs/ や fixtures/）へのリンクは絶対 URL にする。
 *
 * リポジトリ内のリンク検査（`docRefs.test.ts`）は**リポジトリの中で**
 * 解決するかを見るので、ここは見えない。
 */
const checkReadmeLinks = (shipped: ReadonlySet<string>): void => {
	const dangling = relativeLinks(readFileSync("README.md", "utf8")).filter(
		(link) => !shipped.has(join("package", link)),
	);
	if (dangling.length > 0) {
		throw new Error(
			`出荷される README のリンクが tarball の中で解決しません: ${dangling.join(", ")}\n` +
				"出荷するものは相対リンク、出荷しないものは絶対 URL にしてください",
		);
	}
	console.log("\nREADME の相対リンク: すべて同梱物を指しています");
};

export const runPackCheck = ({
	packageName,
	scenarios,
}: PackCheckOptions): void => {
	const root = process.cwd();
	const work = mkdtempSync(join(tmpdir(), `${packageName}-pack-`));
	console.log(`作業場所: ${work}`);

	// pack は prepublishOnly を走らせない。dist が最新である前提
	run("pnpm", ["pack", "--pack-destination", work], root);
	const tarball = readdirSync(work).find((name) => name.endsWith(".tgz"));
	if (tarball === undefined) throw new Error("tarball が作られていません");
	console.log(`tarball: ${tarball}`);

	// 中身を出す。files の入れ忘れはここで目に見える
	const listed = run("tar", ["-tzf", join(work, tarball)], work)
		.split("\n")
		.filter((line) => line !== "")
		.sort();
	console.log(`\n同梱 ${listed.length} 件:`);
	for (const entry of listed) console.log(`  ${entry}`);

	checkReadmeLinks(new Set(listed));

	writeJson(join(work, "package.json"), {
		name: `${packageName}-consumer`,
		private: true,
		type: "module",
		dependencies: { [packageName]: `file:./${tarball}` },
	});
	console.log("\n利用者のプロジェクトに入れています…");
	run("pnpm", ["install", "--ignore-workspace"], work);

	// **外部依存がゼロであることを、依存の実体で確かめる。**
	// 型を自前で持つようにした目的がこれ。うっかり dependencies や
	// peerDependencies を足すと、利用者が気づかないうちに実行時依存を背負う
	const installed = readdirSync(join(work, "node_modules")).filter(
		(name) => !name.startsWith("."),
	);
	console.log(`\n入った依存: ${installed.join(", ")}`);
	const unexpectedDeps = installed.filter((name) => name !== packageName);
	if (unexpectedDeps.length > 0) {
		throw new Error(
			`${packageName} だけを入れたのに他のものが入った: ${unexpectedDeps.join(", ")}。` +
				"型を自前で持つことにした目的が崩れている",
		);
	}

	const failures: string[] = [];
	for (const scenario of scenarios) {
		console.log(`\n${scenario.name}`);
		if (scenario.note !== undefined) console.log(`  ${scenario.note}`);
		for (const [fileName, content] of Object.entries(scenario.files)) {
			writeFileSync(join(work, fileName), content);
		}

		for (const mode of MODES) {
			const configName = `tsconfig.${mode.name}.json`;
			writeJson(join(work, configName), {
				compilerOptions: {
					strict: true,
					noEmit: true,
					target: "ES2022",
					module: mode.module,
					moduleResolution: mode.resolution,
					skipLibCheck: scenario.skipLibCheck ?? true,
					lib: scenario.lib ?? ["ES2022", "DOM"],
					// 導入先（kintone-plugins）に合わせる。
					// TypeScript 7 は @types を暗黙に取り込まないので、
					// 5 系でも同じ条件になるよう明示的に空にする
					types: [],
				},
				files: scenario.entries,
			});

			for (const compiler of COMPILERS) {
				const label = `${mode.name} / TS ${compiler.name}`;
				let output = "";
				try {
					run(join(root, compiler.bin), ["-p", configName], work);
				} catch (error) {
					output = String(
						(error as { stdout?: string }).stdout ?? String(error),
					);
				}
				const missing = scenario.expected.filter(
					(code) => !output.includes(code),
				);
				const unexpectedOutput =
					scenario.expected.length === 0 && output.trim() !== "";

				if (missing.length === 0 && !unexpectedOutput) {
					console.log(`  ✅ ${label}`);
					continue;
				}
				console.log(`  ❌ ${label}`);
				if (missing.length > 0) {
					console.log(
						`      出るはずの診断が出ていない: ${missing.join(", ")}`,
					);
				}
				// **切らずに全部出す。** 以前 tsumekae 側は先頭 8 行で切っていた。
				// CI で落ちたときに読めないと直せないので、この検査の意味が無くなる
				if (output.trim() !== "") {
					console.log(
						output
							.trim()
							.split("\n")
							.map((line) => `      ${line}`)
							.join("\n"),
					);
				}
				failures.push(`${scenario.name} / ${label}`);
			}
		}
	}

	// **型が通っても読み込めなければ意味がない。**
	// 判定の前に走らせる。kisekae 側は throw の後ろに置いていたので、
	// 型が 1 つでも落ちるとここが一度も走らなかった
	console.log("\n実行時に読み込めるか:");
	try {
		const out = run(
			"node",
			[
				"--input-type=module",
				"-e",
				`const m = await import('${packageName}'); console.log(Object.keys(m).sort().join(', '));`,
			],
			work,
		);
		console.log(`  ✅ ${out.trim()}`);
	} catch (error) {
		console.log(
			`  ❌ ${String((error as { stderr?: string }).stderr ?? error)}`,
		);
		failures.push("実行時の読み込み");
	}

	if (failures.length > 0) {
		throw new Error(`利用者の立場で失敗:\n  ${failures.join("\n  ")}`);
	}
	console.log("\n利用者の立場から問題ありません。");
};
