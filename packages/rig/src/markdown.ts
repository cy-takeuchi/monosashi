/**
 * Markdown から相対リンクを拾う。
 *
 * ## なぜ rig が持つのか
 *
 * **同じ抽出が 3 箇所にあった。**
 *
 * | 場所 | 何に対して解決するか |
 * |---|---|
 * | `docRefs.test.ts` | リポジトリの中 |
 * | monosashi の `packCheck.ts` | tarball の中 |
 * | kisekae の `packCheck.ts` | tarball の中 |
 *
 * **解決先は違うが、抽出は同じ。** 3 つとも同じ正規表現と同じ除外条件
 * （`http(s):` と `mailto:` を飛ばす）を写していた。
 * リンクの書き方を 1 つでも取りこぼすと、その形のリンクだけが
 * どこでも検査されないまま残る。
 */

/**
 * `[文字](リンク先)` の相対リンク。
 *
 * 絶対 URL（`http:` / `https:` / `mailto:`）と、
 * アンカーだけのもの（`(#見出し)`）は返さない。どちらもファイルを指さない。
 *
 * アンカー付きの相対リンク（`docs/X.md#見出し`）は
 * **アンカーを落として**ファイルの部分だけを返す。
 */
export const relativeLinks = (markdown: string): string[] =>
	[...markdown.matchAll(/\]\(([^)#][^)]*)\)/g)].flatMap(([, link]) => {
		if (link === undefined || /^(https?|mailto):/.test(link)) return [];
		return [link.split("#")[0] ?? ""];
	});
