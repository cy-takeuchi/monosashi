import { readFileSync } from "node:fs";
import { log } from "@jissoku/rig/client";
import { writeJson } from "@jissoku/rig/json";
import { runScript } from "@jissoku/rig/run";
import { countFields, normalizeForm } from "./normalizeForm";

/**
 * 採取したフォーム定義を正規化して、比較・検証の基準にする。
 *
 * 生データ（`fixtures/live/form-raw.json`）はアプリ ID と識別子を含むのでコミットしない。
 * コミットするのはここが出す `fixtures/form/definition.json` だけ。
 *
 * **`fixtures/` 直下に置かない。** `test/fixtures.ts` の `loadSamples` が
 * `fixtures/` の `.json` を全部読んで `store.samples` を展開するので、
 * `samples` を持たないファイルを直下に置くと**レコードのテストが全部壊れる**
 * （実際に 22 件落とした）。`fixtures/live/` と同じくサブディレクトリに置く。
 *
 * `e2e` → `fixture:build` と同じ分け方（採取と正規化を分ける）。
 * 伏せ方の中身は `normalizeForm.ts`。
 *
 *   pnpm run fixture:form [入力] [出力]
 */

const IN = process.argv[2] ?? "fixtures/live/form-raw.json";
const OUT = process.argv[3] ?? "fixtures/form/definition.json";

const main = (): void => {
	const raw: unknown = JSON.parse(readFileSync(IN, "utf8"));
	const normalized = normalizeForm(raw);

	// 整形と末尾改行の理由は writeJson の JSDoc
	writeJson(OUT, normalized);

	log(`${IN} (${normalized.apps.length} アプリ) → ${OUT}`);
	for (const { role, count } of countFields(normalized)) {
		log(`  ${role}: フィールド ${count} 件`);
	}
};

runScript(main);
