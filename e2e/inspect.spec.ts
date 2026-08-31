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
