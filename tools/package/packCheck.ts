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
 * `kintone-record` という名前で読む。利用者と同じ経路になる。
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
import "kintone-record/kintone";
import {
	type EventOf,
	field,
	guard,
	type LooseField,
	type LooseRecord,
	setValue,
	toUpdateParams,
} from "kintone-record";

const text = field.singleLineText("a");
const record: LooseRecord = { text };
setValue(record, "text", "b");
const params: { app: string; id: string } = toUpdateParams("1", record);

declare const cell: LooseField;
if (guard.isSingleLineText(cell)) console.log(cell.type);

// イベント名から event の形が引けること
type Detail = EventOf<"app.record.detail.show">;
declare const detail: Detail;
const recordId: number = detail.recordId;

// グローバルが生えていること
kintone.events.on("app.record.detail.show", (event) => event);

console.log(params, recordId);
`;

/**
 * REST の型を使う利用者。
 *
 * `@kintone/rest-api-client` を**入れていない**状態で読むと、
 * `skipLibCheck: true`（TS の既定）では型がエラーにならず `any` に落ちる
 * （実測 2026-09-05）。切り出しはこの危険を消すのではなく、
 * 「REST の型を明示的に読んだ人」だけに限定するもの。
 * その事実自体をここで固定しておく。変わったら気づけるように。
 */
const REST_CONSUMER = `
import type { Rest, RestRecord } from "kintone-record/rest";

declare const record: RestRecord;
// rest-api-client を入れていなければ any に落ちるので、これが通ってしまう
const loose: Rest.Number = { type: "SINGLE_LINE_TEXT", value: 123 };
console.log(record, loose);
`;

const run = (command: string, args: string[], cwd: string): string =>
	execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });

const main = (): void => {
	const root = process.cwd();
	const work = mkdtempSync(join(tmpdir(), "kintone-record-pack-"));
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
				name: "kintone-record-consumer",
				private: true,
				type: "module",
				dependencies: { "kintone-record": `file:./${tarball}` },
			},
			null,
			"\t",
		)}\n`,
	);
	writeFileSync(join(work, "consumer.ts"), CONSUMER);
	writeFileSync(join(work, "rest.ts"), REST_CONSUMER);

	console.log("\n利用者のプロジェクトに入れています…");
	run("pnpm", ["install", "--ignore-workspace"], work);

	// 本体が REST に依存していないことを、依存の実体で確かめる。
	// peerDependenciesMeta.optional なので入らないはず
	const installed = readdirSync(join(work, "node_modules"));
	const hasRest = installed.includes("@kintone");
	console.log(
		`\n@kintone/rest-api-client が入ったか: ${hasRest ? "★ 入っている" : "入っていない（想定どおり）"}`,
	);
	if (hasRest) {
		throw new Error(
			"本体だけを入れたのに @kintone/rest-api-client が入っている。" +
				"peerDependenciesMeta.optional が効いていない",
		);
	}

	const failures: string[] = [];
	for (const mode of MODES) {
		writeFileSync(
			join(work, `tsconfig.${mode.name}.json`),
			`${JSON.stringify(
				{
					compilerOptions: {
						strict: true,
						noEmit: true,
						target: "ES2022",
						module: mode.module,
						moduleResolution: mode.resolution,
						skipLibCheck: true,
					},
					files: ["consumer.ts"],
				},
				null,
				"\t",
			)}\n`,
		);

		try {
			run("pnpm", ["exec", "tsc", "-p", `tsconfig.${mode.name}.json`], work);
			console.log(`  ✅ ${mode.name}`);
		} catch (error) {
			const output = String(
				(error as { stdout?: string }).stdout ?? String(error),
			);
			console.log(`  ❌ ${mode.name}`);
			for (const line of output.split("\n").slice(0, 8)) {
				if (line.trim() !== "") console.log(`      ${line}`);
			}
			failures.push(mode.name);
		}
	}

	// 「入れていないと any に落ちる」ことを固定する。
	// 消せない危険なので、せめて変わったら気づけるようにする
	console.log("\n@kintone/rest-api-client 未インストールで REST の型を読むと:");
	writeFileSync(
		join(work, "tsconfig.rest.json"),
		`${JSON.stringify(
			{
				compilerOptions: {
					strict: true,
					noEmit: true,
					target: "ES2022",
					module: "ESNext",
					moduleResolution: "bundler",
					skipLibCheck: true,
				},
				files: ["rest.ts"],
			},
			null,
			"\t",
		)}\n`,
	);
	try {
		run("pnpm", ["exec", "tsc", "-p", "tsconfig.rest.json"], work);
		console.log("  any に落ちる（既知。README と src/rest.ts に明記してある）");
	} catch {
		console.log("  ✅ 型が効いている。README の注意書きを見直すこと");
	}

	// 型が通っても読み込めなければ意味がない
	console.log("\n実行時に読み込めるか:");
	try {
		const out = run(
			"node",
			[
				"--input-type=module",
				"-e",
				"const m = await import('kintone-record'); console.log(Object.keys(m).sort().join(', '));",
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
