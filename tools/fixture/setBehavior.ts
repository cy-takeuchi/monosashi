import { readFileSync, writeFileSync } from "node:fs";
import type { Probed } from "../../src/probe/serialize";
import type { ProbeStore, SetCaseResult } from "../../src/probe/store";
import { log } from "../shared/client";

/**
 * `set()` の受け入れ挙動を、読める表にする（#14）。
 *
 * 生データは `fixtures/measured.json` の `setBehavior` に入っている。
 * そのままでは Probed に包まれていて読めないので、
 * `fixtures/write-behavior.md` と同じ形式の md にする。
 *
 *   pnpm run fixture:set-behavior [入力] [出力]
 *
 * ## なぜ md を別に持つのか
 *
 * 判断の根拠として**人が読む**ため。
 * `measured.json` は機械が突き合わせるもので、
 * 4.6 MB の中から該当箇所を探すのは根拠の確認にならない。
 * `write-behavior.md` が REST に対して果たしているのと同じ役割。
 */

const IN = process.argv[2] ?? "fixtures/measured.json";
const OUT = process.argv[3] ?? "fixtures/set-behavior.md";

/** Probed を読める文字列に戻す。表の 1 セルに収める */
const show = (probed: Probed | undefined): string => {
	if (probed === undefined) return "";
	const revive = (p: Probed): unknown => {
		switch (p.k) {
			case "undefined":
				return "<undefined>";
			case "null":
				return null;
			case "string":
			case "number":
			case "boolean":
				return p.v;
			case "array":
				return p.items.map(revive);
			case "object": {
				const out: { [key: string]: unknown } = {};
				for (const key of p.keys) {
					const child = p.props[key];
					out[key] = child === undefined ? "<undefined>" : revive(child);
				}
				return out;
			}
			default:
				return "<不明>";
		}
	};
	return JSON.stringify(revive(probed));
};

/**
 * 監視対象フィールドの **value だけ**を `コード=値` の形で並べる。
 *
 * レコード全体を出すと `{"dropDown":{"type":"DROP_DOWN","value":...}}` になり、
 * 表の幅で `value` が切り落ちる。**変化を見るための列なのに変化が見えない。**
 * 見たいのは値なので、値だけにする。
 */
const values = (probed: Probed | undefined): string => {
	if (probed === undefined || probed.k !== "object") return "";
	const parts: string[] = [];
	for (const code of probed.keys) {
		const field = probed.props[code];
		if (field === undefined) {
			parts.push(`${code}=<undefined>`);
			continue;
		}
		if (field.k !== "object") {
			parts.push(`${code}=${show(field)}`);
			continue;
		}
		parts.push(`${code}=${show(field.props.value)}`);
	}
	return parts.join(" ");
};

/** 表のセルに入れる。パイプは壊れるので逃がし、長すぎるものは切る */
const cell = (text: string, limit = 60): string => {
	const escaped = text.replace(/\|/g, "\\|");
	return escaped.length > limit ? `${escaped.slice(0, limit)}…` : escaped;
};

/**
 * 1 ケースの結論。
 *
 * ## 材料が 2 つ要る
 *
 * `set()` に不正な値を渡しても**例外は飛ばない**。
 * kintone が画面にエラーを出すだけなので、
 * **判定は e2e が見た `errorShown` に依る**。
 *
 * さらに、エラーが出なくても値が変わっていなければ
 * 「黙って無視された」であって「受け入れ」ではない。
 * 2 つを組み合わせて初めて結論が出る。
 */
const verdict = (result: SetCaseResult): string => {
	if (result.skipped !== undefined) return "測っていない";
	// **判定を e2e から受け取れていないものは、結論を出さない。**
	// 手でボタンを押して走らせた場合がこれ。
	// 「エラーが出なかった」と取り違えると誤った結論が基準になる
	if (result.errorShown === undefined) return "判定なし";
	if (result.errorShown) return "**拒否**";
	// **観測できないものを「無視された」と書かない。**
	// get() が値を見せないフィールド（FILE）は、
	// 変わらなかったのか見えていないのかが区別できない
	if (result.observable === false) return "エラーなし（変化は未観測）";
	if (values(result.before) === values(result.after)) return "無視された";
	return "受け入れ";
};

const main = (): void => {
	const store = JSON.parse(readFileSync(IN, "utf8")) as ProbeStore;
	const results = store.setBehavior;
	if (results === undefined || results.length === 0) {
		log(`${IN} に setBehavior がありません。まだ測っていません（#14）`);
		process.exitCode = 1;
		return;
	}

	// **判定が 1 つも無ければ止める。** 「判定なし」だけの表を出すと
	// 根拠として使われる危険がある
	if (results.every(({ errorShown }) => errorShown === undefined)) {
		log(
			[
				"どのケースにも判定（errorShown）がありません。",
				"probe は set() の失敗を検出できないので、e2e を通す必要があります:",
				"",
				"  pnpm run e2e && pnpm run fixture:build",
			].join("\n"),
		);
		process.exitCode = 1;
		return;
	}

	const lines: string[] = [
		"# kintone.app.record.set() の受け入れ挙動",
		"",
		`ケース数: ${results.length}`,
		"",
		"`toSetRecord`（未実装）が何を落とし、何を変換すべきかの根拠。",
		"「落とすべき」を仕様の推測で決めず、実際に渡した結果で決める（#14）。",
		"",
		"**採取日時は載せない。** 正規化で伏せているため",
		"（2 回続けて採るとバイト単位で同じ結果になる、という性質を保つ）。",
		"",
		"## 結論",
		"",
		"| 確かめたこと | 画面 | 結果 | 前 | 後 |",
		"| --- | --- | --- | --- | --- |",
	];

	for (const result of results) {
		const note =
			result.skipped === undefined
				? [cell(values(result.before), 34), cell(values(result.after), 34)]
				: [cell(result.skipped, 34), ""];
		// 行 id の比較は真偽値でしか残せない（正規化で伏せられるため）
		const rowIds =
			result.rowIdsPreserved === undefined
				? ""
				: result.rowIdsPreserved
					? " ／ 行 id は保たれた"
					: " ／ **行 id が変わった**";
		lines.push(
			`| ${cell(result.question, 80)} | ${result.screen} | ${verdict(result)}${rowIds} | ${note[0]} | ${note[1]} |`,
		);
	}

	lines.push("");
	lines.push("## 判定の根拠");
	lines.push("");
	lines.push(
		"`set()` は不正な値を渡しても**例外を投げない**。" +
			"kintone が「カスタマイズ用の JavaScript の実行時にエラーが発生しました」を" +
			"画面に出すだけで、呼び出し元には何も返らない。",
	);
	lines.push("");
	lines.push(
		"そのため判定は e2e が画面を見て行う。**エラー文言は汎用で、" +
			"どのフィールドが原因かは出ない**ので、1 ケースずつ画面を読み直して走らせ、" +
			"直後の表示を見て 1 対 1 で対応づけている。",
	);
	lines.push("");
	lines.push("| 結論 | 判定 |");
	lines.push("| --- | --- |");
	lines.push("| **拒否** | kintone がエラーを表示した |");
	lines.push("| 無視された | エラーは出ないが値も変わらない |");
	lines.push("| 受け入れ | エラーも出ず、値が変わった |");
	lines.push(
		"| エラーなし（変化は未観測） | エラーは出ないが、`get()` がその値を見せない（FILE） |",
	);
	lines.push("| 判定なし | e2e を通していない（手動実行など） |");
	lines.push("| 測っていない | その画面に対象のフィールドが無い |");
	lines.push("");

	lines.push("## 渡したもの");
	lines.push("");
	for (const result of results) {
		if (result.sent === undefined) continue;
		lines.push(`### ${result.id}`);
		lines.push("");
		lines.push("```json");
		lines.push(show(result.sent));
		lines.push("```");
		lines.push("");
	}

	writeFileSync(OUT, `${lines.join("\n")}\n`);
	log(`${OUT} を生成しました（${results.length} ケース）`);
};

main();
