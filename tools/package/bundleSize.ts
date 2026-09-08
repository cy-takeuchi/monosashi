import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import { runScript } from "../shared/run";

/**
 * README の「実行時に載る量」を測り、書いてある表と一致するか確かめる。
 *
 * ## なぜ仕掛けにするか
 *
 * この表は手で測って書いたもので、**測り方がどこにも残っていなかった**。
 * 0.2.0 の準備で測り直したら 3 行とも古くなっていた
 * （`toSetRecord` と 28 個のガードが入った分）。
 *
 * | | 書いてあった値 | 実際 |
 * |---|--:|--:|
 * | `guard.*` だけ | 2,006 B | 2,194 B |
 * | 全部 | 8,916 B | 9,630 B |
 *
 * 公開フォームへ 1 ファイルで配る利用者はこの数字で判断する。
 * **古い数字は無い方がまし**なので、`pack:check` から呼んで
 * README とずれたら落とす。
 *
 * ## 入口を再輸出だけにする
 *
 * `import` して使う形の入口にすると、**入口自身のコードが混ざる**。
 * 最初にそう書いて「型だけ」が 0 B にならず、73 B と出た。
 * 再輸出だけなら出た量がそのまま monosashi の分になる。
 *
 * `sourcemap` は切る。`//# sourceMappingURL=` の 33 B が混ざる。
 */

/** 測る使い方。README の表の行と 1 対 1 で対応する */
const CASES = [
	{
		label: "**型だけ**（`import type`）",
		source: 'export type { SavedRecord } from "monosashi";\n',
	},
	{ label: "`guard.*` だけ", source: 'export { guard } from "monosashi";\n' },
	{ label: "全部（`import * as`）", source: 'export * from "monosashi";\n' },
] as const;

type Measured = { label: string; raw: number; gzip: number };

const measure = async (source: string): Promise<Omit<Measured, "label">> => {
	const entry = join(
		mkdtempSync(join(tmpdir(), "monosashi-size-")),
		"entry.ts",
	);
	writeFileSync(entry, source);

	const result = await build({
		logLevel: "silent",
		resolve: { alias: { monosashi: join(process.cwd(), "dist/index.js") } },
		build: {
			write: false,
			sourcemap: false,
			minify: "esbuild",
			lib: { entry, formats: ["es"], fileName: "out" },
		},
	});
	const output = Array.isArray(result) ? result[0]?.output : undefined;
	const chunk = output?.find((item) => item.type === "chunk");
	if (chunk === undefined || chunk.type !== "chunk") {
		throw new Error("バンドルの結果が取れない");
	}

	const raw = Buffer.from(chunk.code);
	return { raw: raw.length, gzip: raw.length === 0 ? 0 : gzipSync(raw).length };
};

const groups = (value: number): string => value.toLocaleString("en-US");

/** README の表から、この 3 行の値を読む */
const fromReadme = (): Map<string, { raw: string; gzip: string }> => {
	const readme = readFileSync("README.md", "utf8");
	const rows = new Map<string, { raw: string; gzip: string }>();
	for (const line of readme.split("\n")) {
		const cells = line.split("|").map((cell) => cell.trim());
		if (cells.length < 5) continue;
		const label = cells[1] ?? "";
		if (!CASES.some((item) => item.label === label)) continue;
		// **`**` を先に落としてから末尾の ` B` を落とす。**
		// 1 つの正規表現でまとめると `**0 B**` の末尾が `**` なので
		// `B$` に一致せず、`0 B` のまま残る（それで実際にずれた）
		const value = (cell: string): string =>
			cell.replaceAll("**", "").trim().replace(/\s*B$/, "");
		rows.set(label, {
			raw: value(cells[2] ?? ""),
			gzip: value(cells[3] ?? ""),
		});
	}
	return rows;
};

const main = async (): Promise<void> => {
	const measured: Measured[] = [];
	for (const item of CASES) {
		measured.push({ label: item.label, ...(await measure(item.source)) });
	}

	const readme = fromReadme();
	const problems: string[] = [];

	for (const row of measured) {
		const written = readme.get(row.label);
		process.stdout.write(
			`${row.label}\t${groups(row.raw)} B\tgzip ${groups(row.gzip)} B\n`,
		);
		if (written === undefined) {
			problems.push(`README に「${row.label}」の行が無い`);
			continue;
		}
		if (written.raw !== groups(row.raw) || written.gzip !== groups(row.gzip)) {
			problems.push(
				`${row.label}: README は ${written.raw} B / ${written.gzip} B、実測は ${groups(row.raw)} B / ${groups(row.gzip)} B`,
			);
		}
	}

	if (problems.length > 0) {
		throw new Error(
			["README の「実行時に載る量」がずれている:", ...problems].join("\n  "),
		);
	}
	process.stdout.write("README の「実行時に載る量」は実測と一致\n");
};

runScript(main);
