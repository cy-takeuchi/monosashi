import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Probed } from "../../src/probe/serialize";
import type { ProbeStore, Sample } from "../../src/probe/store";
import { fieldTypeOf, shapeOf } from "./shape";

/**
 * 実測 JSON から差分レポートを生成する。
 *
 * ブラウザ側では一切スキーマ化しない（Q4）。
 * 生データの採取と分析を分けることで、
 * 採取カスタマイズを再アップロードせずに分析だけ何度でも回せる。
 *
 * 入力: fixtures/raw/*.json （採取カスタマイズのエクスポート）
 * 出力: fixtures/report.md
 */

/**
 * 凍結した実測データの置き場。
 * fixtures/raw/ はブラウザからのエクスポートを一時的に置く場所で、
 * そこから採用したものを fixtures/ 直下に置いてコミットする。
 */
const FIXTURE_DIR = "fixtures";
const RAW_DIR = "fixtures/raw";
const OUT = "fixtures/report.md";

/** (フィールド種別, 文脈) ごとの観測 */
type Observation = {
	/** そのキーが存在したサンプル数 */
	keyPresence: Map<string, number>;
	/** キーごとに観測された形の集合 */
	keyShapes: Map<string, Set<string>>;
	/** サンプル総数 */
	total: number;
};

const emptyObservation = (): Observation => ({
	keyPresence: new Map(),
	keyShapes: new Map(),
	total: 0,
});

const contextOf = (sample: Sample): string =>
	`${sample.event} / ${sample.source}`;

const observeField = (
	obs: Observation,
	field: Probed,
	/** 形の展開深さ。SUBTABLE のように入れ子が深いものは浅く切る */
	maxDepth = Number.POSITIVE_INFINITY,
): void => {
	if (field.k !== "object") return;
	obs.total += 1;
	for (const key of field.keys) {
		obs.keyPresence.set(key, (obs.keyPresence.get(key) ?? 0) + 1);
		const child = field.props[key];
		if (child === undefined) continue;
		const set = obs.keyShapes.get(key) ?? new Set<string>();
		set.add(shapeOf(child, maxDepth));
		obs.keyShapes.set(key, set);
	}
};

type Visit = (
	fieldCode: string,
	field: Probed,
	/** サブテーブル内のフィールドは文脈を分けて集計する */
	options: { inSubtable: boolean },
) => void;

/**
 * レコード（フィールドの集合）を走査する。records 配列の場合は各要素へ。
 *
 * SUBTABLE は中に入る。展開したまま集計すると
 * 行ごとの形が全部ユニオンになって 1 セルが数千文字になり、レポートが読めなくなる。
 * 代わりに
 *   - SUBTABLE 自体は行の形を浅く切って記録
 *   - 行オブジェクト (id / value) を SUBTABLE_ROW として記録
 *   - 行の中のフィールドは「表内」文脈として個別に記録
 * の 3 つに分けて集計する。
 */
const walkRecord = (data: Probed, visit: Visit): void => {
	if (data.k === "array") {
		for (const item of data.items) walkRecord(item, visit);
		return;
	}
	if (data.k !== "object") return;

	for (const code of data.keys) {
		const field = data.props[code];
		if (field === undefined) continue;

		visit(code, field, { inSubtable: false });

		if (fieldTypeOf(field) !== "SUBTABLE") continue;
		if (field.k !== "object") continue;

		const rows = field.props.value;
		if (rows === undefined || rows.k !== "array") continue;

		for (const row of rows.items) {
			visit("__row__", row, { inSubtable: false });
			if (row.k !== "object") continue;

			const inner = row.props.value;
			if (inner === undefined || inner.k !== "object") continue;

			for (const innerCode of inner.keys) {
				const innerField = inner.props[innerCode];
				if (innerField !== undefined) {
					visit(innerCode, innerField, { inSubtable: true });
				}
			}
		}
	}
};

const load = (): Sample[] => {
	const collect = (dir: string): string[] => {
		try {
			return readdirSync(dir)
				.filter((name) => name.endsWith(".json"))
				.map((name) => join(dir, name));
		} catch {
			return [];
		}
	};

	// 凍結済みのフィクスチャと、まだ採用していない生エクスポートの両方を読む
	const files = [...collect(FIXTURE_DIR), ...collect(RAW_DIR)];
	if (files.length === 0) {
		throw new Error(
			`${FIXTURE_DIR} にも ${RAW_DIR} にも JSON がありません。採取結果を置いてください。`,
		);
	}
	return files.flatMap((path) => {
		const store = JSON.parse(readFileSync(path, "utf8")) as ProbeStore;
		return store.samples;
	});
};

const main = (): void => {
	const samples = load();

	// fieldType -> context -> Observation
	const table = new Map<string, Map<string, Observation>>();
	const contexts = new Set<string>();
	/** レコードに現れなかったフィールドの検出用。全サンプルで見たフィールドコード */
	const seenCodes = new Map<string, Set<string>>();

	for (const sample of samples) {
		const context = contextOf(sample);
		contexts.add(context);
		walkRecord(sample.data, (code, field, { inSubtable }) => {
			const type =
				code === "__row__"
					? "SUBTABLE_ROW"
					: (fieldTypeOf(field) ?? "(type なし)");
			// SUBTABLE と行オブジェクトの value は、行の中身まで展開すると
			// 1 セルが数千文字になって読めない。中身は〔表内〕の行で個別に見るので浅く切る。
			// 行オブジェクトで見たいのは id の形なので、そちらは切らずに残る。
			const maxDepth =
				type === "SUBTABLE"
					? 1
					: type === "SUBTABLE_ROW"
						? 0
						: Number.POSITIVE_INFINITY;
			const fullContext = inSubtable ? `${context} 〔表内〕` : context;

			const byContext = table.get(type) ?? new Map<string, Observation>();
			const obs = byContext.get(fullContext) ?? emptyObservation();
			observeField(obs, field, maxDepth);
			byContext.set(fullContext, obs);
			table.set(type, byContext);

			if (code === "__row__") return;
			const codes = seenCodes.get(fullContext) ?? new Set<string>();
			codes.add(code);
			seenCodes.set(fullContext, codes);
		});
	}

	const lines: string[] = [];
	lines.push("# kintone レコード実測レポート");
	lines.push("");
	lines.push(`サンプル総数: ${samples.length}`);
	lines.push(`文脈数: ${contexts.size}`);
	lines.push("");
	lines.push(
		"`必須` はその文脈の全サンプルでキーが存在したもの、`optional` は一部のみ存在したもの。",
	);
	lines.push(
		"型を optional にするかどうかは、この列を根拠にする（推測で決めない）。",
	);
	lines.push("");

	for (const type of [...table.keys()].sort()) {
		const byContext = table.get(type);
		if (byContext === undefined) continue;

		lines.push(`## ${type}`);
		lines.push("");
		lines.push("| 文脈 | n | キー | 出現 | 形 |");
		lines.push("| --- | --- | --- | --- | --- |");

		for (const context of [...byContext.keys()].sort()) {
			const obs = byContext.get(context);
			if (obs === undefined) continue;
			const keys = [...obs.keyPresence.keys()].sort();
			for (const [i, key] of keys.entries()) {
				const n = obs.keyPresence.get(key) ?? 0;
				const required =
					n === obs.total ? "必須" : `optional (${n}/${obs.total})`;
				const shapes = [...(obs.keyShapes.get(key) ?? [])].sort().join(" \\| ");
				lines.push(
					`| ${i === 0 ? context : ""} | ${i === 0 ? obs.total : ""} | \`${key}\` | ${required} | \`${shapes}\` |`,
				);
			}
		}
		lines.push("");

		// 文脈間でキー集合が食い違う箇所を明示する。これが型を分ける根拠になる
		const keySets = [...byContext.entries()].map(
			([context, obs]) => [context, new Set(obs.keyPresence.keys())] as const,
		);
		const allKeys = new Set(keySets.flatMap(([, keys]) => [...keys]));
		const divergent = [...allKeys].filter(
			(key) => !keySets.every(([, keys]) => keys.has(key)),
		);
		if (divergent.length > 0) {
			lines.push(
				`**文脈によって有無が変わるキー**: ${divergent.map((k) => `\`${k}\``).join(", ")}`,
			);
			lines.push("");
		}
	}

	lines.push("## 文脈ごとに観測されたフィールドコード");
	lines.push("");
	lines.push(
		"レコードに現れないフィールド（GROUP / REFERENCE_TABLE など）の確認用。",
	);
	lines.push("");
	for (const context of [...seenCodes.keys()].sort()) {
		const codes = [...(seenCodes.get(context) ?? [])].sort();
		lines.push(`- **${context}** (${codes.length}): ${codes.join(", ")}`);
	}
	lines.push("");

	writeFileSync(OUT, lines.join("\n"));
	process.stdout.write(`${OUT} を生成しました (${samples.length} サンプル)\n`);
};

main();
