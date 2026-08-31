import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ACTION } from "../src/probe/testIds";
import { createClient } from "../tools/shared/client";
import { env } from "../tools/shared/env";
import { ADD_ROW, DELETE_ROW, SAVE_BUTTON } from "./labels";
import {
	clearSamples,
	click,
	exportSamples,
	measureBlockedSubmit,
	measureUiCellChange,
	measureUiFieldChange,
	measureUiRowChange,
	registeredChangeEvents,
	waitForPanel,
} from "./panel";

/**
 * 実 kintone から採取する。
 *
 * ## 流れ
 *
 * レコード追加 → 詳細 → 編集 → 一覧 → 削除。
 *
 * 既存レコードを触らないので、実行を重ねても状態が累積的に汚れない。
 * リセット処理も要らない。毎回まっさらなレコードから始まるので
 * `$revision` は必ず 1 → 2 になり、正規化の対象にしなくてよい。
 *
 * 実行ごとに変わるのは recordId / 行 id / 時刻 / fileKey だけで、
 * これらは正規化層で吸収する。
 *
 * ## 何を採るか
 *
 * `test/contexts.ts` の `REQUIRED_CONTEXTS` が下限を定める。
 * ここで採り漏らすと、その文脈に依存している型の主張が根拠を失う。
 * 採取結果に対してテストを走らせるので、漏れていれば落ちる。
 *
 * ## kintone の DOM に触らない
 *
 * set() が change イベントを発火すると実測で分かったため、
 * フィールドへの入力は probe のボタンで行う。
 * Playwright が触るのは保存 / 編集など役割で特定できる要素だけ。
 */

const OUT_DIR = "fixtures/live";

const app = env.fixtureAppId();

/**
 * この実行で作ったレコードの id。後始末で消す。
 *
 * 消さないとレコードが実行のたびに増え、一覧画面の採取結果が毎回変わる。
 * 「操作を固定すれば同じ結果」という前提が崩れる。
 */
let createdRecordId: string | undefined;

test.afterEach(async () => {
	if (createdRecordId === undefined) return;
	const id = createdRecordId;
	createdRecordId = undefined;
	// 採取が途中で落ちても消す。afterEach なので失敗時も走る
	await createClient().record.deleteRecords({ app, ids: [id] });
});

test("実 kintone から採取する", async ({ page }) => {
	// --- 作成画面 -----------------------------------------------------------
	await page.goto(`/k/${app}/edit`);
	await waitForPanel(page, "screen.create");

	// 前回の残りを消す。この 1 回の実行で採れたものだけを基準にする
	await clearSamples(page);

	// クリアで create.show まで消えてしまうので採り直す。
	// event.record 系はハンドラ内でしか採れず、あとから採取し直せない
	await page.reload();
	await waitForPanel(page, "screen.create");

	// 「テーブルのコードの change は飛ばなかった」と言えるのは、
	// そのハンドラを登録していた場合だけ。登録漏れを発火しなかったことと
	// 取り違えないよう、測る前に聞いていたことを確かめる
	const watched = await registeredChangeEvents(page);
	const subtableWatchers = watched.filter((name) =>
		name.endsWith(".change.subtable"),
	);
	expect(
		subtableWatchers,
		`テーブルのコードの change ハンドラが登録されていない。この状態の観測は根拠にならない（登録済み ${watched.length} 件）`,
	).not.toHaveLength(0);
	expect(
		watched.filter((name) => name.endsWith(".change.t_singleLineText")),
		`表内フィールドの change ハンドラが登録されていない（登録済み ${watched.length} 件）`,
	).not.toHaveLength(0);

	await click(page, ACTION.jsApi); // screen.create
	await click(page, ACTION.setFlags); // screen.create.afterSet
	// **行操作を値の変更より先に行う。**
	// addRow は雛形の行を複製するので、先に setRow を実行すると
	// 雛形に値が入り、複製した行にも値が入る。すると飛んだ change が
	// 「行が増えたから」なのか「セルに値が入ったから」なのか区別できない。
	// 作成画面の初期の行は空なので、この順序なら純粋な行追加になる（#4）
	await click(page, ACTION.addRow);
	await click(page, ACTION.removeRow);

	await click(page, ACTION.setValue); // create.change.<コード>
	await click(page, ACTION.setRow); // create.change.<表内> + changes.row

	// UI 経由の操作。set() とは発火するイベントが違うので、
	// 同じ操作を両方の経路で測る。kintone の要素に触るが、
	// 掴むのは役割と、fields.ts で我々が決めたラベルだけ
	await measureUiFieldChange(page, "uiSetValue", "文字列1行", "ui-文字列1行");
	await measureUiCellChange(page, "uiSetCell", "文字列1行(表)", "ui-表内");
	await measureUiRowChange(page, "uiAddRow", ADD_ROW, 1);
	await measureUiRowChange(page, "uiRemoveRow", DELETE_ROW, -1);

	// 保存には必須フィールドが要る。
	// kintone のフィールド入力欄には accessible name が無いので getByRole で
	// 掴めず、.gaia-* は使用禁止（実測で確認）。DOM を経由せず set() で埋める
	await click(page, ACTION.fillRequired);

	// --- 保存 → 詳細画面 -----------------------------------------------------
	// まず保存を中断させる。error を返すと止まることの実測（#4 の 5）。
	// 通常の保存より先に行うのは、止まったあとにそのまま保存すれば
	// 1 レコードで両方を測れるため
	await measureBlockedSubmit(page, "保存を止める実測用", "screen.create");

	// create.submit と create.submit.success がここで飛ぶ
	await page.getByRole("button", { name: SAVE_BUTTON }).click();
	await waitForPanel(page, "screen.detail");

	// 詳細画面の URL は /k/{app}/show#record={id}。後始末のために控える
	const recordId = new URL(page.url()).hash.match(/record=(\d+)/)?.[1];
	// expect では型が絞られない。undefined のまま URL に埋めると
	// /show#record=undefined に遷移して、原因の分かりにくい失敗になる
	if (recordId === undefined) {
		throw new Error(
			`作成したレコードの id を URL から取得できない: ${page.url()}`,
		);
	}
	createdRecordId = recordId;

	await click(page, ACTION.jsApi); // screen.detail
	await click(page, ACTION.rest); // screen.detail / rest.getRecord

	// --- 編集画面 -----------------------------------------------------------
	// 編集ボタンを押さず URL で直接遷移する。ボタン名は表示言語で変わるが
	// URL は変わらないので、環境の言語設定に依存しない
	await page.goto(`/k/${app}/show#record=${recordId}&mode=edit`);
	await waitForPanel(page, "screen.edit");

	await click(page, ACTION.jsApi); // screen.edit
	await click(page, ACTION.rest); // screen.edit / rest.getRecord
	await click(page, ACTION.setFlags); // screen.edit.afterSet
	await click(page, ACTION.setValue); // edit.change.*
	await click(page, ACTION.setRow); // edit.change.<表>
	// 保存済みレコードで行を足すと、新規行の id が何になるかを測る。
	// 作成画面では全行が null なので区別がつかない
	await click(page, ACTION.addRow);
	await click(page, ACTION.removeRow);

	await measureUiFieldChange(
		page,
		"uiSetValue",
		"文字列1行",
		"ui-編集-文字列1行",
	);
	await measureUiCellChange(page, "uiSetCell", "文字列1行(表)", "ui-編集-表内");
	await measureUiRowChange(page, "uiAddRow", ADD_ROW, 1);
	await measureUiRowChange(page, "uiRemoveRow", DELETE_ROW, -1);

	await measureBlockedSubmit(page, "保存を止める実測用", "screen.edit");

	// edit.submit と edit.submit.success がここで飛ぶ
	await page.getByRole("button", { name: SAVE_BUTTON }).click();
	await waitForPanel(page, "screen.detail");

	// --- 一覧画面 -----------------------------------------------------------
	await page.goto(`/k/${app}/`);
	await waitForPanel(page, "screen.index");

	await click(page, ACTION.rest); // screen.index / rest.getRecords

	// --- 取り出し -----------------------------------------------------------
	const json = await exportSamples(page);
	const store = JSON.parse(json) as { samples: unknown[] };
	expect(store.samples.length).toBeGreaterThan(0);

	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(`${OUT_DIR}/raw.json`, json);
});
