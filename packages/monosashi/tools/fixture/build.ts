import { readFileSync } from "node:fs";
import { log } from "@jissoku/rig/client";
import { writeJson } from "@jissoku/rig/json";
import { runScript } from "@jissoku/rig/run";
import type { ProbeStore } from "../../src/probe/store";
import { normalize } from "./normalize";

/**
 * e2e が採取した生データを正規化して、比較・検証の基準にする。
 *
 * 生データ（fixtures/live/raw.json）は個人情報と環境依存値を含むのでコミットしない。
 * コミットするのはここが出す正規化済みの fixtures/measured.json だけ。
 *
 * この 1 ファイルが「型の根拠」であり「テストの対象」であり
 * 「定期ライブ検証の比較基準」でもある（Q3 / Q7）。
 *
 *   pnpm run fixture:build [入力] [出力]
 */

const IN = process.argv[2] ?? "fixtures/live/raw.json";
const OUT = process.argv[3] ?? "fixtures/measured.json";

const main = (): void => {
	const store = JSON.parse(readFileSync(IN, "utf8")) as ProbeStore;
	const normalized = normalize(store);

	// 整形と末尾改行の理由は writeJson の JSDoc
	writeJson(OUT, normalized);

	log(`${IN} (${store.samples.length} サンプル) → ${OUT}`);
	if (normalized.setBehavior !== undefined) {
		log(`set() の受け入れ: ${normalized.setBehavior.length} ケース`);
	}
};

runScript(main);
