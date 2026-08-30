import { config } from "dotenv";

/**
 * dotenv は既存の process.env を上書きしない（override: false が既定）。
 * そのため `op run --env-file=.env -- ...` で起動した場合は
 * op が解決した実値が優先され、ここでの読み込みは素通りする。
 * op を使わない場合は .env の値がそのまま使われる。
 */
config({ path: ".env", quiet: true });

const required = (name: string): string => {
	const value = process.env[name];

	if (value === undefined || value === "") {
		throw new Error(
			`環境変数 ${name} が未設定です。.env.example をコピーして .env を作成してください。`,
		);
	}

	// op:// 参照のまま渡ってきた = op run を経由していない。
	// そのまま kintone に投げると 401 になり原因が分かりにくいので、ここで止める。
	if (value.startsWith("op://")) {
		throw new Error(
			[
				`${name} が 1Password の参照 (${value}) のままです。`,
				"op run 経由で実行してください:",
				"",
				"  op run --account <アカウント> --env-file=.env -- pnpm run <script>",
				"",
				"--account は環境変数 OP_ACCOUNT より優先されます。",
				"ユーザー全体の設定を変えずに、このリポジトリだけ別アカウントを使えます。",
				"アカウントの一覧は次で確認できます:",
				"",
				"  env -u OP_ACCOUNT op account list",
				"",
				"「No accounts configured」と出る場合は 1Password CLI の連携が未設定です。",
				"デスクトップアプリの 設定 → 開発者 → 1Password CLI と連携 をオンにしてください。",
			].join("\n"),
		);
	}

	return value;
};

const optional = (name: string): string | undefined =>
	process.env[name] || undefined;

export const env = {
	baseUrl: () => required("KINTONE_BASE_URL"),
	username: () => required("KINTONE_USERNAME"),
	password: () => required("KINTONE_PASSWORD"),
	fixtureAppId: () => required("FIXTURE_APP_ID"),
	lookupAppId: () => required("FIXTURE_LOOKUP_APP_ID"),

	/** 通常スペース。未設定ならスペース配下に作らない */
	spaceId: () => optional("KINTONE_SPACE_ID"),
	/**
	 * ゲストスペース。
	 * ゲストスペースは API のパスが /k/guest/{id}/v1/... になるため、
	 * クライアント生成時に guestSpaceId を渡す必要がある。
	 * そのため通常スペースとは別の環境変数として扱う。
	 */
	guestSpaceId: () => optional("KINTONE_GUEST_SPACE_ID"),
	/** アプリを作る対象のスペース。ゲストスペースが優先 */
	targetSpaceId: () =>
		optional("KINTONE_GUEST_SPACE_ID") ?? optional("KINTONE_SPACE_ID"),
	optional,
};
