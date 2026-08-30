import { expect, test as setup } from "@playwright/test";
import { env } from "../tools/shared/env";
import { LOGIN_BUTTON, LOGIN_NAME, PASSWORD } from "./labels";

/**
 * ログインして storageState に保存する。
 *
 * kintone のセッションは cookie ベース。毎回ログインする必要はないので、
 * 1 回だけ行って以降のテストで使い回す（e2e-test-kit / auth-session）。
 */

const AUTH_FILE = "e2e/.auth/user.json";

setup("ログインする", async ({ page }) => {
	await page.goto("/");

	// ログイン済みの storageState が無い初回は、ログイン画面に飛ばされる。
	// 既にログイン済みならフォームは出ない
	const loginName = page.getByRole("textbox", { name: LOGIN_NAME });
	await loginName.waitFor({ state: "visible" });

	await loginName.fill(env.username());
	await page.getByRole("textbox", { name: PASSWORD }).fill(env.password());
	await page.getByRole("button", { name: LOGIN_BUTTON }).click();

	// 着地点を URL で判定しない。ログイン後に着くのは cybozu.com の
	// 共通ポータル（/）で、kintone（/k/）ではない（実測）。
	// サブドメインや契約によっても変わりうるので、
	// 「ログインフォームが消えたこと」を成功の signal にする
	await loginName.waitFor({ state: "detached" });

	// セッションが kintone に対して有効かをここで確かめる。
	// 共通ポータルに入れても kintone に入れないケースを、
	// 採取の途中ではなくログインの段階で失敗させる
	await page.goto("/k/");
	await expect(
		page.getByRole("textbox", { name: LOGIN_NAME }),
		"kintone でログイン画面に戻された。セッションが有効でない",
	).toHaveCount(0);

	await page.context().storageState({ path: AUTH_FILE });
});
