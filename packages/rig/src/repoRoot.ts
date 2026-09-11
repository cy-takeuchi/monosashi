import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * リポジトリのルートを探す。
 *
 * ## なぜ要るか
 *
 * `.env` は**リポジトリのルートに 1 つ**置く。認証情報と検証アプリの ID は
 * パッケージごとに違うものではないので、複製すると片方だけ古くなる。
 *
 * 一方 `pnpm run` はスクリプトを**そのパッケージのディレクトリ**で実行するので、
 * cwd 相対の `".env"` はパッケージの中を指してしまう。
 * モノレポにした時点で壊れる（`tools/` が `packages/tsumekae/tools/` に移る）。
 *
 * ## 目印は pnpm-workspace.yaml
 *
 * `.git` ではなく `pnpm-workspace.yaml` を探す。
 * git worktree や submodule では `.git` がファイルだったり別の場所を指したりする。
 * `pnpm-workspace.yaml` は「pnpm がワークスペースのルートだと見なす場所」そのもので、
 * スクリプトが動く前提と一致する。
 *
 * 見つからなければ**落ちる**。cwd を黙って使うと、`.env` が無いのではなく
 * 「環境変数が未設定です」という別の症状で現れて原因が読めなくなる。
 */
export const repoRoot = (from: string = process.cwd()): string => {
	let current = resolve(from);
	for (;;) {
		if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
		const parent = dirname(current);
		if (parent === current) {
			throw new Error(
				`pnpm-workspace.yaml が見つかりません（${resolve(from)} から上へ探索）。リポジトリの外で実行していないか確認してください`,
			);
		}
		current = parent;
	}
};

/** リポジトリのルートの `.env` */
export const envPath = (): string => join(repoRoot(), ".env");
