import { readFileSync, writeFileSync } from "node:fs";
import type { ProbeStore, Sample } from "../../src/probe/store";
import { log } from "../shared/client";

/**
 * 実測データから、採取ツールの不具合で誤ラベルされたサンプルを除外する。
 *
 * 画面判定を直す前（イベント名からの判定を入れる前）は、編集画面での
 * kintone.app.record.get() が screen.detail として記録されていた。
 * kintone の編集画面は URL が /k/{app}/show#record=N&mode=edit で
 * 詳細画面とパスが同じであるため。
 *
 * これを残したまま型を起こすと「詳細画面の値は undefined になりうる」という
 * 誤った型を書くことになる。実測では詳細画面に undefined は一度も現れていない。
 *
 * 判定は「screen.detail なのに undefined を含む」で行う。
 * 時刻ではなく中身で判定するのは、同じ誤りが再発したときにも効くようにするため。
 */

const IN = process.argv[2];
const OUT = process.argv[3];

if (IN === undefined || OUT === undefined) {
	process.stderr.write("使い方: tsx tools/fixture/clean.ts <入力> <出力>\n");
	process.exit(1);
}

/** 詳細・一覧・REST・保存完了では、実測上 undefined は一度も現れない */
const NORMALIZED_CONTEXTS = ["screen.detail", "screen.index"];

const hasUndefinedValue = (sample: Sample): boolean => {
	const data = sample.data;
	if (data.k !== "object") return false;
	return data.keys.some((code) => {
		const field = data.props[code];
		if (field === undefined || field.k !== "object") return false;
		return field.props.value?.k === "undefined";
	});
};

const store = JSON.parse(readFileSync(IN, "utf8")) as ProbeStore;

const dropped: Sample[] = [];
const kept = store.samples.filter((sample) => {
	const suspicious =
		NORMALIZED_CONTEXTS.includes(sample.event) && hasUndefinedValue(sample);
	if (suspicious) dropped.push(sample);
	return !suspicious;
});

writeFileSync(OUT, JSON.stringify({ version: 1, samples: kept }));

log(`入力: ${store.samples.length} サンプル`);
log(`除外: ${dropped.length} サンプル（画面判定の誤りによる誤ラベル）`);
for (const sample of dropped) {
	log(
		`  ${sample.at} ${sample.event} / ${sample.source} record=${sample.recordId}`,
	);
}
log(`出力: ${kept.length} サンプル -> ${OUT}`);
