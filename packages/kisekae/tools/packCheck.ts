import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runScript } from "@jissoku/rig/run";

/**
 * 出荷物を利用者の立場で検査する。
 *
 * ## 何を確かめるのか
 *
 * | | |
 * |---|---|
 * | **実行時依存がゼロ** | tarball を空のプロジェクトに入れて、`node_modules` に `kisekae` 以外が現れないこと |
 * | `.d.ts` が両モードで解決できる | `bundler` と `nodenext` の 2 モード |
 * | `.d.ts` が両バージョンで通る | TypeScript 7 と 5.9 |
 * | **`.d.ts` 自体が壊れていない** | `skipLibCheck: false` で `dist/*.d.ts` を直接検査 |
 *
 * 1 つめが kisekae の設計の要。型を自前で持つと決めた目的は
 * 「`@kintone/rest-api-client` の 7MB を利用者に背負わせない」ことなので、
 * **`peerDependencies` に忍び込んでも落ちる**形で縛る
 * （`docs/DECISIONS.md`「4. 型の出どころ」）。
 *
 * 4 つめを外すと**型が黙って any に落ちる**のを見逃す。
 * 利用者は既定の `skipLibCheck: true` で使うので、こちらの `.d.ts` が
 * 壊れていてもエラーにならない。他のシナリオは「通ること」しか見ていないので
 * any でも緑になる（monosashi の DECISIONS
 * 「『通ること』しか見ない検査は any を捕まえられない」）。
 *
 * ## monosashi の packCheck と分けている理由
 *
 * 土台（pack → 空プロジェクトへ install → 依存の実体を確かめる →
 * 2 モード × 2 バージョンで型検査）は共通だが、**シナリオが別物**。
 * kisekae には `declare global` も `/kintone` サブパスも無い。
 *
 * 共通部分を先に抽象化しない。2 つ書いてみて初めて境界が正確に引ける
 * （リポジトリの `docs/TOOLCHAIN.md`「pack:check も共有しない」）。
 */

const MODES = [
	{ name: "bundler", module: "ESNext", resolution: "bundler" },
	{ name: "nodenext", module: "nodenext", resolution: "nodenext" },
] as const;

/**
 * 検査する TypeScript。
 *
 * **両方で通ることを確かめる。** どちらか片方でしか通らない `.d.ts` を出すと、
 * もう片方の利用者で型が黙って any に落ちる。
 * 導入先（kintone-plugins）は 7 系だが、5 系のプロジェクトもまだある。
 */
const COMPILERS = [
	{ name: "7", bin: "node_modules/.bin/tsc" },
	{ name: "5.9", bin: "node_modules/typescript-5.9/bin/tsc" },
] as const;

/**
 * 利用者のコード。
 *
 * `@kintone/rest-api-client` を**入れていない**利用者を想定する。
 * これが通ることが「7MB を背負わせていない」証拠になる。
 */
const CONSUMER = `
import {
	FormDefinitionError,
	guard,
	toForm,
	type Field,
	type Form,
	type Properties,
	type Layout,
} from "kisekae";

declare const sink: (value: unknown) => void;
declare const properties: Properties;
declare const layout: Layout.OneOf[];

const form: Form = toForm(properties, layout);

// 種別で絞る。ガードは要らない（型述語推論が効く）
const numbers = form.fields.filter((f) => f.type === "NUMBER");
const texts = form.fields.filter(
	(f) => f.type === "SINGLE_LINE_TEXT" || f.type === "MULTI_LINE_TEXT",
);

// 所属で絞る。ここだけガードが要る
const inTable = form.fields.filter(guard.isInSubtable);
sink(inTable.map((f) => f.parent.code));
sink(inTable.map((f) => f.parent.label));

// 所属のラベルは親から直接引ける
const groupings = form.fields.map((f) => f.parent?.label ?? "");

// スペーサーも所属を持つ
const spacers = form.elements.filter((e) => e.type === "SPACER");
sink(spacers.map((s) => s.elementId));

// レイアウトに置かれていないものは別のバケツ
const disabled = form.unplaced.filter(
	(f) => f.type === "CATEGORY" && !f.enabled,
);

// 型は関数の引数にも書ける
declare const pick: (fields: Field.OneOf[]) => void;
pick(form.fields);

try {
	toForm({}, []);
} catch (error) {
	if (error instanceof FormDefinitionError) sink(error.message);
}

sink([numbers, texts, groupings, disabled, form.tables, form.groups]);
`;

/**
 * ルックアップの分割が出荷物でも効いていること。
 *
 * ここが kisekae の設計の中心。`.d.ts` を通したときに
 * `Lookup` が判別ユニオンを壊していないことを、利用者の立場で確かめる。
 * **絞れなかったら `f.unit` でエラーが出る**ので、期待する診断は空。
 */
const NARROWING = `
import { toForm, type Properties, type Layout } from "kisekae";

declare const sink: (value: unknown) => void;
declare const properties: Properties;
declare const layout: Layout.OneOf[];

const form = toForm(properties, layout);

for (const field of form.fields.filter((f) => f.type === "NUMBER")) {
	// 通常の数値かルックアップのキーか。type だけでは決まらないので in で分ける
	if ("lookup" in field) {
		sink(field.lookup.relatedApp.app);
		continue;
	}
	// ルックアップを除いたので、数値固有のプロパティに触れる
	sink(field.unit);
	sink(field.unitPosition === "BEFORE");
}

for (const field of form.fields.filter((f) => f.type === "CHECK_BOX")) {
	// チェックボックスはルックアップになれないので、1 段で絞れている
	sink(Object.keys(field.options));
	sink(field.align === "HORIZONTAL");
}
`;

/**
 * 実行時依存がゼロであることを、型の側からも確かめる。
 *
 * `@kintone/rest-api-client` を入れていない環境で `dist/*.d.ts` を
 * `skipLibCheck: false` で直接検査する。`.d.ts` があちらを参照していたら
 * ここで **TS2307（モジュールが見つからない）** が出る。
 */
const DIST_PROBE = `
export {};
`;

type Scenario = {
	readonly name: string;
	readonly files: { readonly [fileName: string]: string };
	readonly entries: readonly string[];
	/** 空配列は「診断が 1 つも出ないこと」 */
	readonly expected: readonly string[];
	readonly skipLibCheck?: boolean;
	readonly lib?: readonly string[];
	readonly note?: string;
};

const SCENARIOS: readonly Scenario[] = [
	{
		name: "@kintone/rest-api-client を入れていない利用者",
		files: { "consumer.ts": CONSUMER },
		entries: ["consumer.ts"],
		expected: [],
		note: "これが通ることが、型を自前で持つことにした目的（7MB を背負わせない）の証拠",
	},
	{
		name: "ルックアップの分割が出荷物でも効いている",
		files: { "narrowing.ts": NARROWING },
		entries: ["narrowing.ts"],
		expected: [],
		note: "絞れなくなると field.unit でエラーが出る。kisekae の設計の中心",
	},
	{
		name: "ブラウザの型が無い環境（Node / AWS Lambda 相当）",
		files: { "consumer.ts": CONSUMER },
		entries: ["consumer.ts"],
		expected: [],
		lib: ["ES2022"],
		note: "kisekae は DOM を参照しない。`lib` から DOM を外しても通ること",
	},
	{
		name: "dist/*.d.ts 自体を検査する（skipLibCheck: false）",
		files: { "probe.ts": DIST_PROBE },
		entries: ["probe.ts", "node_modules/kisekae/dist/index.d.ts"],
		expected: [],
		skipLibCheck: false,
		lib: ["ES2022"],
		note: "利用者は既定の skipLibCheck: true で使うので、こちらの .d.ts が壊れていてもエラーにならず型が黙って any に落ちる。ここだけは直接検査してその穴を塞ぐ",
	},
];

const run = (command: string, args: string[], cwd: string): string =>
	execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });

const main = (): void => {
	const root = process.cwd();
	const work = mkdtempSync(join(tmpdir(), "kisekae-pack-"));
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

	writeFileSync(
		join(work, "package.json"),
		`${JSON.stringify(
			{
				name: "kisekae-consumer",
				private: true,
				type: "module",
				dependencies: { kisekae: `file:./${tarball}` },
			},
			null,
			"\t",
		)}\n`,
	);
	console.log("\n利用者のプロジェクトに入れています…");
	run("pnpm", ["install", "--ignore-workspace"], work);

	// **外部依存がゼロであることを、依存の実体で確かめる。**
	// 型を自前で持つようにした目的がこれ。
	// うっかり dependencies や peerDependencies を足すと、
	// 利用者が気づかないうちに実行時依存を背負う
	const installed = readdirSync(join(work, "node_modules")).filter(
		(name) => !name.startsWith("."),
	);
	console.log(`\n入った依存: ${installed.join(", ")}`);
	const unexpected = installed.filter((name) => name !== "kisekae");
	if (unexpected.length > 0) {
		throw new Error(
			`kisekae だけを入れたのに他のものが入った: ${unexpected.join(", ")}。型を自前で持つことにした目的が崩れている`,
		);
	}

	const failures: string[] = [];
	for (const scenario of SCENARIOS) {
		console.log(`\n${scenario.name}`);
		if (scenario.note !== undefined) console.log(`  ${scenario.note}`);
		for (const [fileName, content] of Object.entries(scenario.files)) {
			writeFileSync(join(work, fileName), content);
		}

		for (const mode of MODES) {
			const configName = `tsconfig.${mode.name}.json`;
			writeFileSync(
				join(work, configName),
				`${JSON.stringify(
					{
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
					},
					null,
					"\t",
				)}\n`,
			);

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

	if (failures.length > 0) {
		throw new Error(
			`利用者の立場で問題が出ました:\n  ${failures.join("\n  ")}`,
		);
	}

	// 実行時に読み込めるか。dist/index.js が壊れていたらここで落ちる
	const exports = run(
		"node",
		[
			"--input-type=module",
			"-e",
			"const m = await import('kisekae'); console.log(Object.keys(m).sort().join(', '));",
		],
		work,
	).trim();
	console.log(`\n実行時に読み込めるか:\n  ✅ ${exports}`);

	console.log("\n利用者の立場から問題ありません。");
};

runScript(main);
