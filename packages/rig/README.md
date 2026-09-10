# @kintone-type/rig

実測の足場。**公開しない**（`private: true`）。

monosashi と kisekae が共有するのは、認証と kintone クライアントと
実行スクリプトの入口だけ。

| | |
|---|---|
| `env` | `.env` の読み込みと必須チェック。`op://` のまま渡ってきたら止める |
| `repoRoot` | リポジトリのルートを探す。`.env` はルートに 1 つ置く |
| `client` | kintone REST クライアント。ゲストスペースのパスとデプロイ待ちを含む |
| `describeError` | REST エラーの `errors` を展開する |
| `run` | 実行スクリプトの入口。失敗時の出力と終了コードを 1 箇所にする |

**ビルドしない。** `tsx` が TypeScript を直に実行するので、
`exports` はソースを指している。

## ここに入れないもの

- **検証アプリの構築**（`packages/monosashi/tools/fixture-app/`）。
  アプリの定義はレコードの実測が主な用途で、まだ monosashi にある。
  kisekae は建ったアプリを読むだけ
- **`pack:check`**。土台は共通だがシナリオが別物なので、
  各パッケージが自前に持つ（`docs/DECISIONS.md`「11. モノレポ」）
