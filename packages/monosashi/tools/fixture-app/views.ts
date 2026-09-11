import type { KintoneRestAPIClient } from "@kintone/rest-api-client";

/**
 * 採取で使う一覧の名前。**`build.ts` が宣言したもの。**
 *
 * kintone が既定で用意する一覧は `getViews` が返さない（実測 2026-09-05:
 * プロセス管理が足した「（作業者が自分）」1 件しか返らず、しかもその一覧は
 * 作業者が付くまで 0 件）。だから `build.ts` が自分で 1 つ宣言している。
 *
 * 名前は我々が決めたものなので、環境の言語では変わらない。
 */
export const LIST_VIEW_NAME = "すべて";

/**
 * 一覧の id を引く。
 *
 * **`view` を付けずにアプリを開かない。** 着地先が kintone 任せになり、
 * プロセス管理が自動で作る「（作業者が自分）」に着くことがある。
 * そこは作業者が付くまで 0 件なので、行が無くインライン編集を測れない。
 *
 * 同じ解決が `e2e/collect.spec.ts` と `e2e/inspect.spec.ts` にあった。
 * 片方だけ別の一覧を見るようになると、採取結果の食い違いの原因が読めない。
 */
export const listViewId = async (
	client: KintoneRestAPIClient,
	app: string,
): Promise<string> => {
	const { views } = await client.app.getViews({ app });
	const view = Object.values(views).find(
		(candidate) => candidate.name === LIST_VIEW_NAME,
	);
	if (view === undefined) {
		throw new Error(
			`「${LIST_VIEW_NAME}」一覧がありません。app:build を実行してください`,
		);
	}
	return view.id;
};
