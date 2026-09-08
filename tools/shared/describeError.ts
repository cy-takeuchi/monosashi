/**
 * エラーを読める文字列にする。**REST クライアントに依存しない。**
 *
 * `client.ts` に置いていたが、この関数は kintone の何にも触らない。
 * `run.ts` から使うため、`packCheck.ts` のような kintone を使わない
 * スクリプトが `@kintone/rest-api-client` を引き込まずに済むよう分けた。
 */

/**
 * kintone のエラーを読める形にする。
 *
 * KintoneRestAPIError の message は「入力内容が正しくありません」までしか言わない。
 * どのフィールドのどのプロパティが悪いかは errors に入っているので、必ず展開する。
 */
export const describeError = (error: unknown): string => {
	if (typeof error !== "object" || error === null) return String(error);

	const { message, code, status, errors } = error as {
		message?: string;
		code?: string;
		status?: number;
		errors?: Record<string, { messages?: string[] }>;
	};

	const lines = [`${message ?? String(error)}`];
	if (code !== undefined) lines.push(`code=${code} status=${status ?? "-"}`);

	if (errors !== undefined && Object.keys(errors).length > 0) {
		lines.push("");
		lines.push("詳細:");
		for (const [key, detail] of Object.entries(errors)) {
			const messages = detail.messages ?? [];
			lines.push(`  ${key}: ${messages.join(" / ")}`);
		}
	}

	return lines.join("\n");
};
