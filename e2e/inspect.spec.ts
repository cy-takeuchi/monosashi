import { test } from "@playwright/test";
import { env } from "../tools/shared/env";

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

test("詳細・一覧・印刷の操作要素を調べる", async ({ page }) => {
	const app = env.fixtureAppId();

	const dump = async (label: string) => {
		const names = await page.evaluate(() =>
			[...document.querySelectorAll("button, a")]
				.map((el) =>
					(
						el.getAttribute("aria-label") ??
						el.getAttribute("title") ??
						el.textContent ??
						""
					)
						.trim()
						.slice(0, 30),
				)
				.filter((n) => n !== ""),
		);
		console.log(`\n=== ${label}: ${names.length} 件 ===`);
		console.log(`  ${[...new Set(names)].join(" | ")}`);
		const panel = await page
			.locator('[data-testid="krp-panel"]')
			.getAttribute("data-screen")
			.catch(() => null);
		console.log(`  パネルの画面判定: ${panel ?? "（パネル無し）"}`);
	};

	// 詳細画面。プロセス管理のアクションボタンがあるか
	await page.goto(`/k/${app}/show#record=1`);
	await page.getByRole("button").first().waitFor({ state: "visible" });
	await dump("詳細画面");

	// 一覧画面。インライン編集のボタンがあるか
	await page.goto(`/k/${app}/`);
	await page.getByRole("button").first().waitFor({ state: "visible" });
	await dump("一覧画面");

	// 印刷画面。そもそもパネルが出るか（採取できるか）
	await page.goto(`/k/${app}/print?record=1`);
	await page.waitForLoadState("load");
	await dump("印刷画面");
});
