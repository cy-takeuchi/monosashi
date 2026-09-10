import { createClient } from "@kintone-type/rig/client";
import { env } from "@kintone-type/rig/env";
import { test } from "@playwright/test";

/**
 * kintone の画面に、役割と名前で掴める操作要素があるかを調べる。
 *
 * 採取は原則 probe のボタンだけを押す。ただし `set()` と UI 操作では
 * 発火する change イベントが違うため、UI 操作も測らないと表が埋まらない。
 *
 * UI を操作するには kintone の DOM に触る必要があるが、
 * 内部セレクタ（.gaia-* など）は使用禁止。使えるのは役割と名前だけ。
 * **掴めるかどうかを推測せず、実物を見て決める**ための調査。
 *
 * 通常の採取では走らせない。INSPECT=1 のときだけ動く。
 */

test.skip(
	process.env.INSPECT === undefined,
	"調査用。INSPECT=1 のときだけ実行する",
);

test("レコード画面の操作要素を列挙する", async ({ page }) => {
	await page.goto(`/k/${env.fixtureAppId()}/edit`);
	await page.getByRole("button").first().waitFor({ state: "visible" });

	const controls = await page.evaluate(() => {
		const accessibleName = (el: Element): string =>
			(
				el.getAttribute("aria-label") ??
				el.getAttribute("title") ??
				el.getAttribute("alt") ??
				el.textContent ??
				""
			)
				.trim()
				.slice(0, 40);

		return [...document.querySelectorAll("button, a, input[type=button], img")]
			.map((el) => ({
				tag: el.tagName.toLowerCase(),
				role: el.getAttribute("role") ?? "",
				name: accessibleName(el),
				// 内部クラスは使わないが、どの要素かを人が判別するために出す
				hint: el.className.toString().slice(0, 50),
			}))
			.filter((c) => c.name !== "" || c.hint.includes("row"));
	});

	console.log(`\n=== 名前を持つ操作要素: ${controls.length} 件 ===`);
	for (const c of controls) {
		console.log(`  <${c.tag}> name="${c.name}"  class=${c.hint}`);
	}
});

test("フィールドのラベルと入力欄の関係を調べる", async ({ page }) => {
	await page.goto(`/k/${env.fixtureAppId()}/edit`);
	await page.getByRole("button").first().waitFor({ state: "visible" });

	// fields.ts で我々が決めたラベル。環境の言語では変わらない
	const labels = ["文字列1行", "文字列1行(必須)", "文字列1行(表)"];

	const report = await page.evaluate((targets) => {
		const out: string[] = [];
		for (const label of targets) {
			// ラベル文字列を持つ最も内側の要素を探す
			const holder = [...document.querySelectorAll("*")]
				.filter((el) => el.textContent?.trim() === label)
				.at(-1);
			if (holder === undefined) {
				out.push(`${label}: 見つからない`);
				continue;
			}
			// 入力欄を含む最も近い祖先まで登る
			let node: Element | null = holder;
			let depth = 0;
			while (node !== null && depth < 8) {
				const inputs = node.querySelectorAll("input, textarea, select");
				if (inputs.length > 0) {
					out.push(
						`${label}: 祖先 ${depth} 段上に入力欄 ${inputs.length} 件 ` +
							`(${[...inputs].map((i) => i.tagName.toLowerCase()).join(",")})` +
							` / 祖先タグ=${node.tagName.toLowerCase()}`,
					);
					break;
				}
				node = node.parentElement;
				depth += 1;
			}
			if (node === null || depth >= 8)
				out.push(`${label}: 入力欄が見つからない`);
		}
		return out;
	}, labels);

	console.log("\n=== ラベルと入力欄の関係 ===");
	for (const line of report) console.log(`  ${line}`);
});

test("ラベル起点で入力欄を掴めるかを候補ごとに試す", async ({ page }) => {
	await page.goto(`/k/${env.fixtureAppId()}/edit`);
	await page.getByRole("button").first().waitFor({ state: "visible" });

	// fields.ts で我々が決めたラベル。kintone の内部実装ではなく我々の資産で、
	// 環境の言語でも変わらない
	const label = "文字列1行";

	const anchor = page.getByText(label, { exact: true });
	const candidates: {
		name: string;
		locator: ReturnType<typeof page.locator>;
	}[] = [
		{
			name: 'getByText(...).locator("..").getByRole("textbox")',
			locator: anchor.locator("..").getByRole("textbox"),
		},
		{
			name: 'getByText(...).locator("../..").getByRole("textbox")',
			locator: anchor.locator("../..").getByRole("textbox"),
		},
		{
			name: 'getByText(...).locator("xpath=following::input[1]")',
			locator: anchor.locator("xpath=following::input[1]"),
		},
		{
			name: 'getByLabel("文字列1行")',
			locator: page.getByLabel(label, { exact: true }),
		},
	];

	console.log(`\n=== "${label}" の入力欄を掴む候補 ===`);
	console.log(`  ラベル要素そのもの: ${await anchor.count()} 件`);
	for (const { name, locator } of candidates) {
		try {
			const n = await locator.count();
			// 1 件に絞れて、実際に編集できるかまで見る
			const editable =
				n === 1
					? await locator
							.first()
							.isEditable()
							.catch(() => false)
					: false;
			console.log(`  ${n} 件  編集可=${editable}  ${name}`);
		} catch (error) {
			console.log(`  失敗  ${name}  (${String(error).split("\n")[0]})`);
		}
	}
});

test("表内セルを列ヘッダーから掴めるかを試す", async ({ page }) => {
	await page.goto(`/k/${env.fixtureAppId()}/edit`);
	await page.getByRole("button").first().waitFor({ state: "visible" });

	const header = "文字列1行(表)";

	// 表そのものは ARIA の table ロールで掴む。kintone 固有ではなく標準の役割
	const table = page
		.getByRole("table")
		.filter({ has: page.getByText(header, { exact: true }) })
		.first();

	console.log("\n=== 表内セルを掴む候補 ===");
	console.log(`  該当する table: ${await table.count()} 件`);

	const headers = table.getByRole("columnheader");
	const headerTexts = await headers.allTextContents();
	console.log(`  列ヘッダー: ${headerTexts.length} 件`);
	console.log(
		`    ${headerTexts
			.map((t) => t.trim())
			.slice(0, 6)
			.join(" | ")}`,
	);
	const index = headerTexts.findIndex((t) => t.trim() === header);
	console.log(`  "${header}" は ${index} 列目`);

	const rows = table.getByRole("row");
	console.log(`  row の数: ${await rows.count()} 件（ヘッダー行を含む）`);

	if (index >= 0) {
		// 本文の最初の行。ヘッダー行が row に含まれるかは環境依存なので両方見る
		for (const nth of [0, 1]) {
			const cell = rows.nth(nth).getByRole("cell").nth(index);
			const box = cell.getByRole("textbox");
			const n = await box.count();
			const editable =
				n === 1
					? await box
							.first()
							.isEditable()
							.catch(() => false)
					: false;
			console.log(
				`  rows.nth(${nth}) の ${index} 列目: textbox ${n} 件 編集可=${editable}`,
			);
		}
	}
});

test("モバイルの操作要素を調べる", async ({ page }) => {
	const app = env.fixtureAppId();

	// 保存・プロセス管理のアクション・削除を、モバイルでどう掴めるかを見る。
	// PC では別物だった（アクションは button ではなく span、確認が要る）ので
	// モバイルでも実物を見てから書く
	const client = createClient();
	const created = await client.record.addRecord({
		app,
		record: { singleLineTextRequired: { value: "モバイル操作の調査用" } },
	});

	try {
		const dump = async (label: string) => {
			// パネルが載る＝カスタマイズが動いている画面。
			// show イベントは load より後に飛ぶので、パネルを待つ
			await page
				.locator('[data-testid="krp-panel"]')
				.waitFor({ state: "visible" })
				.catch(() => undefined);

			const found = await page.evaluate(() => {
				// **`??` で繋がない。** `<button>` の `value` は `""` を返すので、
				// そこで止まって textContent に届かず、ボタンの文字が全部消える。
				// 実測でそれに引っかかり、採取パネルのボタン 10 個を
				// 「無い」と読み違えた（2026-09-05）
				const nameOf = (el: Element): string => {
					const candidates = [
						el.getAttribute("aria-label"),
						el.getAttribute("title"),
						el instanceof HTMLInputElement ? el.value : null,
						el.textContent,
					];
					return (
						candidates.find((text) => (text ?? "").trim() !== "") ?? ""
					).trim();
				};

				const named = [...document.querySelectorAll("a, button, [role], input")]
					.map((el) => ({
						tag: el.tagName.toLowerCase(),
						role: el.getAttribute("role"),
						name: nameOf(el).slice(0, 24),
					}))
					.filter((el) => el.name !== "");

				// アクション名は build.ts で我々が決めたもの。
				// 要素の種類を仮定せず、文字列で探す（PC では span だった）
				const actions = [...document.querySelectorAll("*")]
					.filter((el) =>
						[...el.childNodes]
							.filter((n) => n.nodeType === Node.TEXT_NODE)
							.map((n) => n.textContent ?? "")
							.join("")
							.trim()
							.startsWith("処理開始"),
					)
					.map((el) => ({
						tag: el.tagName.toLowerCase(),
						role: el.getAttribute("role"),
						title: el.getAttribute("title"),
						parent: el.parentElement?.tagName.toLowerCase() ?? null,
					}));

				return {
					named,
					actions,
					// 画面のどこかに文字として在るか。無いならメニューの中か、
					// そもそもモバイルでは出ないということ
					hasActionText: document.body.innerText.includes("処理開始"),
					hasStatusText: document.body.innerText.includes("未処理"),
					panel:
						document
							.querySelector('[data-testid="krp-panel"]')
							?.getAttribute("data-screen") ?? null,
					// パネルは在るのにボタンが列挙されなかった。
					// 推測を重ねずに中身そのものを見る
					panelHtml: (
						document.querySelector('[data-testid="krp-panel"]')?.outerHTML ?? ""
					).slice(0, 400),
					panelButtons: document.querySelectorAll(
						'[data-testid="krp-panel"] button',
					).length,
					// 画面に出ている文字。保存やアクションがどこにあるかの手がかり
					// 保存は画面の下にあることが多い。先頭だけ見ると切れる
					textTail: document.body.innerText.replace(/\s+/g, " ").slice(-500),
				};
			});

			console.log(`\n=== ${label} ===`);
			console.log(
				`  名前を持つ要素: ${[...new Set(found.named.map((el) => `${el.tag}:${el.name}`))].join(" | ")}`,
			);
			console.log(
				`  パネル: ${found.panel ?? "（無し）"} / ボタン ${found.panelButtons} 個`,
			);
			console.log(`  パネル HTML: ${found.panelHtml}`);
			console.log(`  画面の文字（末尾）: ${found.textTail}`);
			console.log(
				`  「処理開始」: 文字として在る=${found.hasActionText} / 「未処理」=${found.hasStatusText} / 要素=${JSON.stringify(found.actions)}`,
			);
		};

		await page.goto(`/k/m/${app}/edit`);
		await dump("モバイル 作成");

		await page.goto(`/k/m/${app}/show?record=${created.id}`);
		await dump("モバイル 詳細");

		await page.goto(`/k/m/${app}/edit?record=${created.id}`);
		await dump("モバイル 編集");
	} finally {
		await client.record.deleteRecords({ app, ids: [created.id] });
	}
});

test("削除の操作要素を探す", async ({ page }) => {
	const app = env.fixtureAppId();

	// 削除は UI からしか JS のイベントが飛ばない（REST では飛ばない）。
	// PC 詳細 / モバイル詳細 / PC 一覧の 3 経路があり、どれも
	// **そのままでは押せない**（メニューの中か、ホバーで現れる）。
	// 開くところまで実際にやって、確認ダイアログの文言も採る
	const client = createClient();
	const created = await client.record.addRecord({
		app,
		record: { singleLineTextRequired: { value: "削除の調査用" } },
	});

	try {
		const scan = async (label: string) => {
			const found = await page.evaluate(() => {
				const nameOf = (el: Element): string => {
					const candidates = [
						el.getAttribute("aria-label"),
						el.getAttribute("title"),
						el instanceof HTMLInputElement ? el.value : null,
						el.textContent,
					];
					return (
						candidates.find((text) => (text ?? "").trim() !== "") ?? ""
					).trim();
				};
				// **`offsetParent` で見えているかを判定しない。**
				// `position: fixed` の要素でも null になり、出ているメニューを
				// 「隠れている」と誤判定する（実測でそうなった）
				return [...document.querySelectorAll("a, button, [role], input")]
					.map((el) => ({
						tag: el.tagName.toLowerCase(),
						role: el.getAttribute("role"),
						name: nameOf(el).slice(0, 30),
						visible: el.getClientRects().length > 0,
					}))
					.filter(
						(el) =>
							el.visible &&
							/削除|Delete|Options|OK|Cancel|キャンセル/.test(el.name),
					);
			});
			console.log(`\n=== ${label} ===`);
			for (const el of found) console.log(`  ${JSON.stringify(el)}`);
			if (found.length === 0) console.log("  該当なし");
		};

		// --- PC 詳細 ---
		// **パネルが出るまで待つ。** ヘッダのボタンはレコード画面より先に出るので、
		// そこで見ると描画途中を拾う（モバイルで実際に取り違えた）
		await page.goto(`/k/${app}/show#record=${created.id}`);
		await page
			.locator('[data-testid="krp-panel"]')
			.waitFor({ state: "visible" });
		await scan("PC 詳細（そのまま）");

		await page.getByRole("button", { name: /^Options$/ }).click();
		await scan("PC 詳細（Options を開いた）");

		// メニュー項目の名前は「Delete record」であって「Delete」ではない。
		// 完全一致で `Delete` と書いて空振りした（実測 2026-09-05）
		await page
			.getByRole("menuitem", { name: /^(レコードを削除|Delete record)$/ })
			.click();
		await scan("PC 詳細（削除を押した＝確認が出るはず）");

		// --- モバイル 詳細 ---
		await page.goto(`/k/m/${app}/show?record=${created.id}`);
		await page
			.locator('[data-testid="krp-panel"]')
			.waitFor({ state: "visible" });
		await scan("モバイル 詳細（そのまま）");

		// --- PC 一覧 ---
		const { views } = await client.app.getViews({ app });
		const view = Object.values(views).find((v) => v.name === "すべて");
		await page.goto(`/k/${app}/?view=${view?.id ?? ""}`);
		await page
			.locator('[data-testid="krp-panel"]')
			.waitFor({ state: "visible" });

		// 行が出るまで待つ。ヘッダのボタンでは早すぎる
		const row = page
			.getByRole("row")
			.filter({ has: page.locator(`a[href*="record=${created.id}&"]`) });
		await row.waitFor({ state: "visible" });
		await scan("PC 一覧（そのまま）");

		await row.hover();
		await scan("PC 一覧（行にホバー）");
	} finally {
		await client.record.deleteRecords({ app, ids: [created.id] });
	}
});
