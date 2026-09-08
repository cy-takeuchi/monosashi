import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 公開したときに利用者が本当に使えるかを、tarball を入れて確かめる。
 *
 * ## なぜ build:check では足りないか
 *
 * `test/dist/consumer.ts` は `../../dist/index` と**相対パスで**読んでいる。
 * これは `.d.ts` の劣化は捕まえられるが、
 *
 *   - `exports` マップ
 *   - `files` に入れ忘れたファイル
 *   - `types` の指し先
 *   - `moduleResolution` の違い
 *   - そもそも実行時に読み込めるか
 *
 * を一切通らない。**パッケージ名で解決していない**のが穴で、
 * `exports` が壊れていても build:check は緑のままになる。
 *
 * ここでは `pnpm pack` した tarball を空のプロジェクトに入れ、
 * `monosashi` という名前で読む。利用者と同じ経路になる。
 *
 * kintone に接続しないので、認証情報なしでいつでも回せる。
 */

/**
 * 検査する解決方式。
 *
 * 利用者の tsconfig はまちまちで、`exports` マップの扱いが方式ごとに違う。
 * ここが食い違うと、こちらの `exports` が壊れていても片方だけ通ってしまう。
 *
 * `node10` は入れていない。**TypeScript 7 で削除された**
 * （`Option 'moduleResolution=node10' has been removed`）ので、
 * このパッケージが要求する TS では指定そのものができない。
 */
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
 */
const COMPILERS = [
	{ name: "7", bin: "node_modules/typescript/bin/tsc" },
	{ name: "5.9", bin: "node_modules/typescript-5.9/bin/tsc" },
] as const;

const MODES = [
	{ name: "bundler", module: "ESNext", resolution: "bundler" },
	{ name: "nodenext", module: "nodenext", resolution: "nodenext" },
] as const;

/**
 * `@kintone/rest-api-client` を入れていない利用者。
 *
 * 本体は REST に依存しないので、**これが通らなければ切り出しが失敗している**。
 * 逆にここが通ることが、ブラウザ側だけの利用者に 7MB を背負わせていない証拠になる。
 */
const CONSUMER = `
// グローバル拡張はこの副作用 import でのみ有効になる
import "monosashi/kintone";
import {
	type Api,
	type EventOf,
	field,
	guard,
	type LooseField,
	type LooseRecord,
	type Rest,
	type RestRecord,
	setValue,
	toUpdateParams,
} from "monosashi";

const text = field.singleLineText("a");
const record: LooseRecord = { text };
setValue(record, "text", "b");
const params: { app: string; id: string } = toUpdateParams("1", record);

declare const cell: LooseField;
if (guard.isSingleLineText(cell)) console.log(cell.type);

// REST の型も本体から出る。外部依存は要らない
declare const restRecord: RestRecord;
declare const restNumber: Rest.Number;

// イベント名から event の形が引けること
type Detail = EventOf<"app.record.detail.show">;
declare const detail: Detail;
const recordId: number = detail.recordId;

// グローバルが生えていること
kintone.events.on("app.record.detail.show", (event) => event);

// **dts-gen にしか無かったもの**が生えていること
const appId: number | null = kintone.app.getId();
const user: string = kintone.getLoginUser().name;
const pluginConfig = kintone.plugin.app.getConfig("id");

// **dts-gen に無い、公式ドキュメントの API** が生えていること
declare const fields: Promise<Record<string, { type: string }>>;
const form: typeof fields = kintone.app.getFormFields();
const answer: Promise<"OK" | "CANCEL" | "CLOSE"> = kintone.showConfirmDialog({
	title: "確認",
});
const shown: Promise<void> = kintone.app.record.setFieldStyle("code", {
	content: { color: "red" },
});
const state: Promise<"VISIBLE" | "HIDDEN"> =
	kintone.app.record.getPagerDisplayState();

// JS API の値の型はルートから引ける
declare const loginUser: Api.LoginUser;

console.log(appId, user, pluginConfig, form, answer, shown, state, loginUser);

console.log(params, recordId, restRecord, restNumber);
`;

/**
 * 自前の `kintone.d.ts` を持つプロジェクトが、
 * **JS API の宣言はそのまま使い、レコードの値の型だけ monosashi から取る**形。
 *
 * `monosashi/kintone` は import しない。代わりに自分の `declare global` の中で
 * `EditingRecord` / `SetRecord` / `EventOf` を参照する。
 * 名前空間のマージが起きないので、順序に依存しない。
 *
 * `getFormFields` は monosashi 側に無い宣言で、
 * **併用しても自前の宣言を失わない**ことの証拠として置いている。
 */
const OWN_AMBIENT = `
import type {
	EditingRecord,
	EventOf,
	KintoneEventName,
	SetRecord,
} from "monosashi";

declare global {
	namespace kintone {
		namespace app {
			namespace record {
				function get(): { record: EditingRecord } | null;
				function set(record: { record: SetRecord }): void;
			}
			function getFormFields(): Promise<{ [code: string]: { type: string } }>;
		}
		namespace events {
			function on<Name extends KintoneEventName>(
				event: Name | Name[],
				handler: (event: EventOf<Name>) => unknown,
			): void;
		}
	}
}
`;

/** 併用したときにぶつかる相手。`get()` が any のまま残っている自前宣言 */
const OWN_ANY_AMBIENT = `
export {};
declare global {
	namespace kintone {
		namespace app {
			namespace record {
				function get(): any;
			}
		}
	}
}
`;

/** 自前 ambient に monosashi の型を差し込んだプロジェクトの利用コード */
const OWN_AMBIENT_CONSUMER = `
import { guard } from "monosashi";

// 自前にしか無い宣言が生きている
const fields = kintone.app.getFormFields();

// get() の値の型は monosashi から来ている
const got = kintone.app.record.get();
if (got !== null) {
	const cell = got.record.text;
	if (guard.isSingleLineText(cell) && guard.hasValue(cell)) {
		const value: string = cell.value;
		console.log(value);
	}
}

// set() は type 必須（実測 2026-08-30）
kintone.app.record.set({
	record: { text: { type: "SINGLE_LINE_TEXT", value: "x" } },
});

// イベントも自前の宣言経由で引ける
kintone.events.on("app.record.detail.show", (event) => {
	const recordId: number = event.recordId;
	console.log(recordId);
});

console.log(fields);
`;

/**
 * 名前空間がマージされたときに、monosashi 側が採用されたかを見る踏み台。
 *
 * monosashi が勝てば「そんなプロパティは無い」で落ちる。
 * 自前の any が勝てば **1 つも落ちない**。
 * `any` は TS2339 を出しようがないので、この 1 つで勝敗が決まる。
 */
const MERGE_PROBE = `
import "monosashi/kintone";

const got = kintone.app.record.get();
if (got === null) throw new Error("一覧画面では null");
const value: string = got.record.text.存在しないプロパティ;
export { value };
`;

/**
 * AWS SAM の Lambda 相当。**`kintone` グローバルも DOM も無い**。
 *
 * `monosashi/kintone` を import しない。ルートだけを使う。
 * ここが通ることが、サーバサイドで本体だけ使えることの証拠になる。
 */
const NODE_CONSUMER = `
import {
	type Api,
	field,
	guard,
	type RestRecord,
	toRestWrite,
	toUpdateParams,
} from "monosashi";

declare const sink: (value: unknown) => void;
declare const record: RestRecord;

const params = toUpdateParams("1", { text: field.singleLineText("x") });
const converted = toRestWrite({ text: field.singleLineText("x") });
if (guard.isSingleLineText(record.code)) sink(record.code.value);

// DOM を参照する型もルートから引ける。DOM が無い環境でも解決できること
declare const upload: Api.ProxyUploadData;
declare const dialog: Api.DialogConfig;

sink([params, converted, upload, dialog]);
`;

type Scenario = {
	readonly name: string;
	readonly files: { readonly [fileName: string]: string };
	/** tsconfig の files。**並び順に意味がある**（下の「順序で勝敗が変わる」を参照） */
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

const SCENARIOS: readonly Scenario[] = [
	{
		name: "monosashi/kintone をそのまま使う",
		files: { "consumer.ts": CONSUMER },
		entries: ["consumer.ts"],
		expected: [],
	},
	{
		name: "自前 ambient に monosashi の型を差し込む（推奨）",
		files: { "own.d.ts": OWN_AMBIENT, "own-consumer.ts": OWN_AMBIENT_CONSUMER },
		entries: ["own.d.ts", "own-consumer.ts"],
		expected: [],
	},
	{
		name: "併用: 自前 ambient が先。monosashi が勝つ",
		files: { "own-any.d.ts": OWN_ANY_AMBIENT, "probe.ts": MERGE_PROBE },
		entries: ["own-any.d.ts", "probe.ts"],
		expected: ["TS2339"],
	},
	{
		name: "併用: monosashi が先。自前の any が黙って勝つ",
		files: { "own-any.d.ts": OWN_ANY_AMBIENT, "probe.ts": MERGE_PROBE },
		entries: ["probe.ts", "own-any.d.ts"],
		expected: [],
		note:
			"**これは望ましい結果ではない。** 同じ名前空間をマージすると、" +
			"同名の関数はオーバーロードとして併存し、先に宣言された側が採用される。" +
			"TypeScript は Duplicate identifier を出さないので、" +
			"型が any に落ちたことに誰も気づけない。" +
			"1 つ上との違いは files の並びだけで、どちらも診断はゼロ。" +
			"この挙動が変わったら README を直す",
	},
	{
		name: "Node（AWS SAM 相当）。kintone グローバルも DOM も無い",
		files: { "node-consumer.ts": NODE_CONSUMER },
		entries: ["node-consumer.ts"],
		expected: [],
		lib: ["ES2022"],
		// **skipLibCheck を切る。** 切らないと、こちらの .d.ts が DOM を
		// 参照していても TS2304 が出ず、型が黙って any に落ちる。
		// 2026-09-08 まで実際にそうなっていた（Element / Blob を直接書いていた）
		skipLibCheck: false,
	},
	{
		name: "dist/*.d.ts 自体を検査する（skipLibCheck: false）",
		files: { "consumer.ts": CONSUMER },
		entries: ["consumer.ts"],
		expected: [],
		skipLibCheck: false,
		note:
			"利用者は既定の skipLibCheck: true で使うので、" +
			"**こちらの .d.ts が壊れていてもエラーにならず、型が黙って any に落ちる**。" +
			"上のシナリオはどれも「通ること」しか見ていないので、any でも緑になる。" +
			"ここだけは .d.ts を直接検査して、その穴を塞ぐ",
	},
];

const run = (command: string, args: string[], cwd: string): string =>
	execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });

const main = (): void => {
	const root = process.cwd();
	const work = mkdtempSync(join(tmpdir(), "monosashi-pack-"));
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
				name: "monosashi-consumer",
				private: true,
				type: "module",
				dependencies: { monosashi: `file:./${tarball}` },
			},
			null,
			"\t",
		)}\n`,
	);
	console.log("\n利用者のプロジェクトに入れています…");
	run("pnpm", ["install", "--ignore-workspace"], work);

	// **外部依存がゼロであることを、依存の実体で確かめる。**
	// REST の型を自前で持つようにした目的がこれ。
	// うっかり dependencies や peerDependencies を足すと、利用者が
	// 気づかないうちに実行時依存を背負う
	const installed = readdirSync(join(work, "node_modules")).filter(
		(name) => !name.startsWith("."),
	);
	console.log(`\n入った依存: ${installed.join(", ")}`);
	const unexpected = installed.filter((name) => name !== "monosashi");
	if (unexpected.length > 0) {
		throw new Error(
			`monosashi だけを入れたのに他のものが入った: ${unexpected.join(", ")}。` +
				"REST の型を自前で持つことにした目的が崩れている",
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
				const unexpected =
					scenario.expected.length === 0 && output.trim() !== "";

				if (missing.length === 0 && !unexpected) {
					console.log(`  ✅ ${label}`);
					continue;
				}
				console.log(`  ❌ ${label}`);
				if (missing.length > 0) {
					console.log(
						`      出るはずの診断が出ていない: ${missing.join(", ")}`,
					);
				}
				for (const line of output.split("\n").slice(0, 8)) {
					if (line.trim() !== "") console.log(`      ${line}`);
				}
				failures.push(`${scenario.name} / ${label}`);
			}
		}
	}

	// 型が通っても読み込めなければ意味がない
	console.log("\n実行時に読み込めるか:");
	try {
		const out = run(
			"node",
			[
				"--input-type=module",
				"-e",
				"const m = await import('monosashi'); console.log(Object.keys(m).sort().join(', '));",
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
		throw new Error(`利用者の立場で失敗: ${failures.join(", ")}`);
	}
	console.log("\n利用者の立場から問題ありません。");
};

main();
