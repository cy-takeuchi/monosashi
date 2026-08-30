import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { env } from "./env";

export const createClient = (): KintoneRestAPIClient => {
	const guestSpaceId = env.guestSpaceId();
	return new KintoneRestAPIClient({
		baseUrl: env.baseUrl(),
		auth: { username: env.username(), password: env.password() },
		// ゲストスペースは API のパスが /k/guest/{id}/v1/... になるため、
		// クライアント生成時に渡さないと全リクエストが 404 になる
		...(guestSpaceId === undefined ? {} : { guestSpaceId }),
	});
};

/**
 * スペースの存在確認。
 *
 * 指定ミス（通常スペースの ID を KINTONE_GUEST_SPACE_ID に入れた等）は
 * アプリ作成時に分かりにくいエラーになるので、先に確かめて具体的に案内する。
 */
export const resolveSpace = async (
	client: KintoneRestAPIClient,
): Promise<{ id: string; name: string; isGuest: boolean } | undefined> => {
	const id = env.targetSpaceId();
	if (id === undefined) return undefined;

	try {
		const space = await client.space.getSpace({ id });
		return { id, name: space.name, isGuest: space.isGuest };
	} catch (error) {
		const asGuest = env.guestSpaceId() !== undefined;
		throw new Error(
			[
				`スペース id=${id} を取得できませんでした。`,
				asGuest
					? "KINTONE_GUEST_SPACE_ID に指定していますが、通常スペースの可能性があります。KINTONE_SPACE_ID に移してください。"
					: "KINTONE_SPACE_ID に指定していますが、ゲストスペースの可能性があります。KINTONE_GUEST_SPACE_ID に移してください。",
				`元のエラー: ${String(error)}`,
			].join("\n"),
		);
	}
};

/** 画面 URL のベース。ゲストスペースはパスが変わる */
export const appUrl = (app: string): string => {
	const guestSpaceId = env.guestSpaceId();
	const base = guestSpaceId === undefined ? "/k" : `/k/guest/${guestSpaceId}`;
	return `${env.baseUrl()}${base}/${app}/`;
};

/**
 * アプリのデプロイ完了を待つ。
 *
 * kintone のデプロイは非同期。完了前に次の操作を投げると失敗する。
 * e2e-test-kit のルールに従い固定待機はせず、状態をポーリングする。
 */
export const waitForDeploy = async (
	client: KintoneRestAPIClient,
	apps: string[],
	timeoutMs = 120_000,
): Promise<void> => {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const { apps: statuses } = await client.app.getDeployStatus({ apps });
		if (statuses.every((s) => s.status === "SUCCESS")) return;
		const failed = statuses.find(
			(s) => s.status === "FAIL" || s.status === "CANCEL",
		);
		if (failed !== undefined) {
			throw new Error(
				`デプロイに失敗しました: app=${failed.app} status=${failed.status}`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	throw new Error(`デプロイがタイムアウトしました: ${apps.join(", ")}`);
};

export const log = (message: string): void => {
	process.stdout.write(`${message}\n`);
};

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
