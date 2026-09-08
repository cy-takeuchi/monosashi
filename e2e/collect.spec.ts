import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ACTION } from "../src/probe/testIds";
import { createClient } from "../tools/shared/client";
import { env } from "../tools/shared/env";
import {
	ADD_ROW,
	DELETE_CONFIRM,
	DELETE_RECORD,
	DELETE_ROW,
	MOBILE_RECORD_MENU,
	OPTIONS_MENU,
	SAVE_BUTTON,
} from "./labels";
import {
	clearSamples,
	click,
	deleteRecord,
	exportSamples,
	measureBlockedSubmit,
	measureInlineEdit,
	measureSetBehavior,
	measureUiCellChange,
	measureUiFieldChange,
	measureUiRowChange,
	proceedProcess,
	registeredChangeEvents,
	waitForPanel,
	waitForSample,
} from "./panel";

/**
 * 実 kintone から採取する。
 *
 * ## 流れ
 *
 * PC: レコード追加 → 詳細 → プロセス管理 → 印刷 → 編集 → 一覧（インライン編集）。
 * モバイル: 一覧 → 作成 → 保存 → 詳細 → プロセス管理 → 編集 → 保存。
 * 最後に UI から削除する（REST で消すと削除イベントが飛ばないため）。
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
const createdRecordIds: string[] = [];

test.afterEach(async () => {
	const ids = createdRecordIds.splice(0);
	if (ids.length === 0) return;
	// 採取が途中で落ちても消す。afterEach なので失敗時も走る
	await createClient().record.deleteRecords({ app, ids });
});

/**
 * 前の実行が途中で落ちて残ったレコードを消す。
 *
 * **採取の途中で失敗すると、作ったレコードの id を控える前に落ちることがある**
 * （実測 2026-09-05。モバイルの保存直後に落ちて 1 件残った）。
 * 残ったまま次を走らせると一覧の採取結果が変わり、
 * 「操作を固定すれば同じ結果」という前提が崩れる。
 *
 * `app:build` が投入するテストレコードは 2 件で、必ず最初に作られる。
 * つまり `$id` が小さい 2 件が本物で、それより後のものは全て取りこぼし。
 */
const removeLeftovers = async (): Promise<void> => {
	const client = createClient();
	const { records } = await client.record.getRecords({ app, fields: ["$id"] });
	const ids = records
		.map((record) => String(record.$id?.value ?? ""))
		.filter((id) => id !== "")
		.sort((a, b) => Number(a) - Number(b))
		.slice(2);
	if (ids.length === 0) return;
	console.log(`前回の取りこぼしを削除: ${ids.join(", ")}`);
	await client.record.deleteRecords({ app, ids });
};

test("実 kintone から採取する", async ({ page }) => {
	await removeLeftovers();

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
	createdRecordIds.push(recordId);

	await click(page, ACTION.jsApi); // screen.detail
	await click(page, ACTION.rest); // screen.detail / rest.getRecord

	// --- プロセス管理 ---------------------------------------------------------
	// ProcessProceedEvent の action / status / nextStatus はどれも未実測だった。
	// 詳細画面の採取の**あと**に実行する。先に進めると、詳細画面のサンプルが
	// 遷移後のステータスのものになる。
	//
	// **アクションは button ではなく `<span title="処理開始">`**（実測 2026-09-05）。
	// role が無いので getByRole では掴めない。title は標準の HTML 属性で、
	// 値は build.ts で我々が決めたアクション名なので環境の言語では変わらない。
	// 作業者が空だとこのボタン自体が出ない（だから build.ts で作成者を入れた）。
	//
	// **押しただけでは実行されない。** 次のステータスと作業者を示す
	// ポップアップが開き、確定して初めてイベントが飛ぶ（実測 2026-09-05）。
	// 作業者は既に選択済みなので、確定を押すだけでよい
	await proceedProcess(page, page.getByTitle("処理開始"));
	await waitForSample(
		page,
		"app.record.detail.process.proceed",
		"event.record",
	);

	// --- 印刷画面 -----------------------------------------------------------
	// この画面にはパネルを載せるヘッダが無い。だが採取に必要なのは
	// ハンドラが動くことだけで、パネルは要らない（実測 2026-09-02）。
	// 採れるのは event.record だけ。get() / REST はボタン起動なので採れない。
	//
	// kintone は印刷画面で window.print() を呼ぶ。ブラウザの印刷ダイアログは
	// Playwright から閉じられず、開くと以降の操作が全て止まる。遷移前に無効化する。
	// 差し替えるのは window の API で、kintone の DOM には触っていない
	await page.addInitScript(() => {
		window.print = () => {};
	});
	await page.goto(`/k/${app}/print?record=${recordId}`);
	// パネルが無いので waitForPanel が使えない。採取そのものを待つ
	await waitForSample(page, "app.record.print.show", "event.record");

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
	// **一覧を id で指定する。** view を付けないと着地先が kintone 任せになり、
	// プロセス管理が自動で作る「（作業者が自分）」に着くことがある。
	// そこは作業者が付くまで 0 件なので、行が無くインライン編集を測れない。
	// 「すべて」は build.ts で我々が宣言した一覧なので、名前で引ける
	const { views } = await createClient().app.getViews({ app });
	const listView = Object.values(views).find((view) => view.name === "すべて");
	if (listView === undefined) {
		throw new Error("「すべて」一覧がありません。app:build を実行してください");
	}

	await page.goto(`/k/${app}/?view=${listView.id}`);
	await waitForPanel(page, "screen.index");

	await click(page, ACTION.rest); // screen.index / rest.getRecords

	// 一覧のインライン編集。app.record.index.edit.* はここでしか採れない。
	// **rest の採取より後に行う。** 先に編集すると、一覧から採るレコードが
	// 編集済みのものになり、何を採ったのかが操作順に左右される
	//
	// **「文字列1行」は使えない。** インライン編集で入力欄にならず、値が
	// ただの文字のまま出る（実測 2026-09-05）。関連レコード一覧の
	// 「表示するレコードの条件」に指定されているフィールドだから
	//（fields.ts の referenceTable の condition.field。開発者が実機で確認）。
	// 「文字列1行(必須)」と「数値」は入力欄になる
	await measureInlineEdit(
		page,
		recordId,
		"文字列1行(必須)",
		"ui-インライン編集",
		"singleLineTextRequired",
	);

	// --- モバイル -------------------------------------------------------------
	// mobile.* のイベントはここでしか採れない。
	//
	// **モバイルでもパネルは完全に動く**（実測 2026-09-05。
	// `kintone.mobile.app.getHeaderSpaceElement` がある）。
	// ボタン起動の採取もできる。サンプルのキーは probe 側で `mobile.` を
	// 前置してあるので、PC と混ざらない。
	//
	// **show イベントは load より後に飛ぶ**ので、採取そのものを待つ。
	//
	// PC のレコードを使い回さず、モバイルで 1 件作って辿る。
	// 作成 → 保存 → 詳細 → プロセス管理 → 編集 → 保存 を 1 本で通せば、
	// mobile の submit / change / process をまとめて採れる
	await page.goto(`/k/m/${app}/?view=${listView.id}`);
	await waitForSample(page, "mobile.app.record.index.show", "event.records");

	await page.goto(`/k/m/${app}/edit`);
	await waitForPanel(page, "screen.create");
	await waitForSample(page, "mobile.app.record.create.show", "event.record");

	await click(page, ACTION.jsApi); // mobile.screen.create
	// 必須を埋めると set() が走り、それ自体が change イベントになる。
	// 保存に必要な操作がそのまま採取になる
	await click(page, ACTION.fillRequired);
	await waitForSample(page, "mobile.app.record.create.change.", "event.record");

	await page.getByRole("button", { name: SAVE_BUTTON }).click();
	await waitForSample(
		page,
		"mobile.app.record.create.submit.success",
		"event.record",
	);

	// **submit.success は遷移の前に飛ぶ。**
	// この時点の URL はまだ作成画面のまま（実測: `/k/m/2/edit#command=save`）。
	// 詳細画面に移るのを待ってから id を採る
	await waitForPanel(page, "screen.detail");

	const mobileRecordId = new URL(page.url()).searchParams.get("record");
	if (mobileRecordId === null) {
		throw new Error(
			`モバイルで作ったレコードの id を URL から取得できない: ${page.url()}`,
		);
	}
	createdRecordIds.push(mobileRecordId);
	await click(page, ACTION.jsApi); // mobile.screen.detail
	await click(page, ACTION.rest); // mobile.screen.detail / rest.getRecord

	// プロセス管理。**PC とは掴み方が違う。**
	// PC は role を持たない `<span title="処理開始">` だったが、
	// モバイルは本物の button で、名前が「処理開始 (Proceed status)」になる
	// （アクション名のあとに kintone の説明が付く）。前方一致で掴む。
	// 確定のダイアログが開くところは PC と同じ
	await proceedProcess(page, page.getByRole("button", { name: /^処理開始/ }));
	await waitForSample(
		page,
		"mobile.app.record.detail.process.proceed",
		"event.record",
	);

	// 編集。URL で直接開く（`show?record=N#mode=edit` に転送される）
	await page.goto(`/k/m/${app}/edit?record=${mobileRecordId}`);
	await waitForPanel(page, "screen.edit");
	await waitForSample(page, "mobile.app.record.edit.show", "event.record");

	await click(page, ACTION.jsApi); // mobile.screen.edit
	await click(page, ACTION.rest); // mobile.screen.edit / rest.getRecord
	await click(page, ACTION.setValue); // mobile.app.record.edit.change.<コード>
	await waitForSample(page, "mobile.app.record.edit.change.", "event.record");

	await page.getByRole("button", { name: SAVE_BUTTON }).click();
	await waitForSample(
		page,
		"mobile.app.record.edit.submit.success",
		"event.record",
	);

	// --- 削除 -----------------------------------------------------------------
	// **REST で消しても JS のイベントは飛ばない。** UI から消すしかないので、
	// 後始末をそのまま採取に使う。
	//
	// 3 経路（PC 詳細 / モバイル詳細 / PC 一覧）でイベント名が違う。
	// **他の採取が全部済んでから**やる。先に消すと一覧の採取結果が変わる。
	//
	// 一覧からの削除にはもう 1 件要るので、ここで REST で作る。
	// 一覧の採取はもう済んでいるので、増えても影響しない
	const forget = (id: string): void => {
		const at = createdRecordIds.indexOf(id);
		if (at >= 0) createdRecordIds.splice(at, 1);
	};

	// モバイル詳細から削除。**操作メニューを開かないと押せない。**
	// DOM には描画されているので「押せる」と誤判断しやすい（実測で空振りした）
	await page.goto(`/k/m/${app}/show?record=${mobileRecordId}`);
	await waitForPanel(page, "screen.detail");
	await page.getByRole("button", { name: MOBILE_RECORD_MENU }).click();
	await deleteRecord(page, page.getByRole("menuitem", { name: DELETE_RECORD }));
	await waitForSample(
		page,
		"mobile.app.record.detail.delete.submit",
		"event.record",
	);
	forget(mobileRecordId);
	// **削除すると kintone が一覧へ遷移する。**
	// その最中に次の goto を始めると net::ERR_ABORTED で落ちる（実測）。
	// 着地を待ってから次へ進む
	await waitForPanel(page, "screen.index");

	// PC 詳細から削除。Options を開かないと出てこない（実測）
	await page.goto(`/k/${app}/show#record=${recordId}`);
	await waitForPanel(page, "screen.detail");
	await page.getByRole("button", { name: OPTIONS_MENU }).click();
	await deleteRecord(page, page.getByRole("menuitem", { name: DELETE_RECORD }));
	await waitForSample(page, "app.record.detail.delete.submit", "event.record");
	forget(recordId);
	// 詳細画面から削除しても一覧へ遷移する。同じく着地を待つ
	await waitForPanel(page, "screen.index");

	// PC 一覧から削除。行ごとのボタンで、ホバーは要らなかった（実測）
	const extra = await createClient().record.addRecord({
		app,
		record: { singleLineTextRequired: { value: "一覧からの削除用" } },
	});
	createdRecordIds.push(extra.id);

	await page.goto(`/k/${app}/?view=${listView.id}`);
	await waitForPanel(page, "screen.index");
	const extraRow = page
		.getByRole("row")
		.filter({ has: page.locator(`a[href*="record=${extra.id}&"]`) });
	await deleteRecord(
		page,
		extraRow.getByRole("button", { name: DELETE_CONFIRM }),
	);
	await waitForSample(page, "app.record.index.delete.submit", "event.record");
	forget(extra.id);

	// --- set() の受け入れ挙動（#14）-------------------------------------------
	// **必ず最後に、専用のレコードで測る。**
	// 不正な値を渡すので kintone のカスタマイズエラー表示が出る。
	// 一度出ると後続の set() も失敗するので、途中に混ぜると採取全体が壊れる。
	//
	// 保存しない。測るのは「set() が何を受け付けるか」で、
	// 保存できるかは別の話（REST 側は write-behavior.md で測ってある）。
	const setProbeRecord = await createClient().record.addRecord({
		app,
		record: { singleLineTextRequired: { value: "set() の受け入れ測定用" } },
	});
	createdRecordIds.push(setProbeRecord.id);

	const measuredCases = await measureSetBehavior(page, app, setProbeRecord.id);
	expect(measuredCases).toBeGreaterThan(0);

	// 汚れた編集画面から離れる。離脱確認が出たら受け入れる。
	// Playwright は既定で window.confirm をキャンセルするので明示的に accept する
	page.once("dialog", (dialog) => {
		void dialog.accept();
	});
	await page.goto(`/k/${app}/?view=${listView.id}`);
	await waitForPanel(page, "screen.index");

	// --- 取り出し -----------------------------------------------------------
	const json = await exportSamples(page);
	const store = JSON.parse(json) as {
		samples: unknown[];
		setBehavior?: unknown[];
	};
	expect(store.samples.length).toBeGreaterThan(0);
	// 0 件だと「測ったが全部飛ばされた」と「ボタンを押していない」の
	// 区別がつかない。押した以上は何か記録されているはず
	expect(store.setBehavior?.length ?? 0).toBeGreaterThan(0);
	// **判定が付いていることを確かめる。** errorShown が無いと
	// fixture:set-behavior が結論を出せない
	expect(
		(store.setBehavior ?? []).filter(
			(result) => (result as { errorShown?: unknown }).errorShown !== undefined,
		).length,
	).toBeGreaterThan(0);

	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(`${OUT_DIR}/raw.json`, json);
});
