# 開発する

このリポジトリに手を入れるときの**共通の手順**。
**利用するだけなら読む必要はない**（使い方は各パッケージの README）。

パッケージ固有の手順は各パッケージにある。

| | |
|---|---|
| [monosashi](packages/monosashi/CONTRIBUTING.md) | レコードの実測。検証アプリの構築と採取カスタマイズ |
| [kisekae](packages/kisekae/CONTRIBUTING.md) | フォーム定義の実測 |

このプロジェクトの原則は 1 つ。**型に書く前に測る。**
推測で書いた型は実際に何度も外れている。

判断の記録は 3 層に割ってある（基準は
[`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「ドキュメントは 3 層に割る」）。

| | 場所 |
|---|---|
| kintone 自体の挙動 | [`docs/KINTONE.md`](docs/KINTONE.md) |
| 環境とツールチェーン | [`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md) |
| パッケージの設計判断 | `packages/*/docs/DECISIONS.md` |

- [セットアップ](#セットアップ)
- [検査する](#検査する)
- [依存を上げるとき](#依存を上げるとき)
- [公開する](#公開する)

## セットアップ

```sh
pnpm install
pnpm approve-builds   # 対話式。esbuild のビルドを許可する
cp .env.example .env
```

**`.env` はリポジトリのルートに 1 つ。** パッケージごとには置かない
（理由は [`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「`.env` はリポジトリのルートに 1 つ」）。
どのパッケージのディレクトリから実行しても、`@jissoku/rig` が
ルートを探して読む。

### 認証情報の渡し方

`.env` に直接書くか、1Password の参照を書いて `op run` で解決するかを選べる。

```sh
# .env
KINTONE_USERNAME=op://<vault>/<item>/username
KINTONE_PASSWORD=op://<vault>/<item>/password
```

```sh
op run --account <アカウント> --env-file=.env -- pnpm run app:build
```

`op run` は秘密情報をプロセスの環境変数にだけ渡すので、ディスクに残らない。
dotenv は既存の `process.env` を上書きしないため、コード側の変更は不要。

**継承した環境変数に `op://` 参照があると巻き込まれる。**
`op run` は env ファイルだけでなく、既に設定されている環境変数の参照も解決しようとする。
それが別アカウントの vault を指していると、無関係なエラーでコマンドが落ちる。
該当するものは `env -u` で外す。

```sh
env $(env | grep -o '^[A-Z_]*=op://' | sed 's/=op:\/\//\ /' | sed 's/^/-u /') \
  op run --account <アカウント> --env-file=.env -- pnpm run <script>
```

**このリポジトリでは `--account my.1password.com`。**
`.env` の参照が `op://Private/...` で、`Private` は個人アカウントの既定 vault のため。
`OP_ACCOUNT` に業務アカウントが入っている環境では、
明示しないと `"Private" isn't a vault in this account` で落ちる。

**`--account` を明示するのは、環境変数 `OP_ACCOUNT` を上書きするため。**
`OP_ACCOUNT` がユーザー全体（`~/.claude/settings.json` など）で設定されていると
そのアカウントだけを探しに行くので、このリポジトリで別のアカウントを使いたい場合に必要になる。
`--account` は `OP_ACCOUNT` より優先される。

アカウントの一覧は次で確認する。

```sh
env -u OP_ACCOUNT op account list
```

`No accounts configured` と出る場合は 1Password CLI の連携が未設定。
デスクトップアプリの **設定 → 開発者 → 1Password CLI と連携** をオンにする。

`op://` のまま渡ってきた場合は `@jissoku/rig` の `env` が検出して止める
（そのまま kintone に投げると 401 になり原因が分かりにくいため）。

### 実 kintone に接続するコマンドの形

`op` を使う場合、両パッケージのどのコマンドも次の形で実行する。

```sh
env $(env | grep -o '^[A-Z_]*=op://' | sed 's/=op:\/\//\ /' | sed 's/^/-u /') \
  op run --account <アカウント> --env-file=.env -- <コマンド>
```

`env -u` の理由は「[認証情報の渡し方](#認証情報の渡し方)」を参照。

### アプリを作るスペース

`.env` でスペースを指定すると、検証アプリ2つをそのスペース配下に作る。

```sh
KINTONE_SPACE_ID=12          # 通常スペース
KINTONE_GUEST_SPACE_ID=      # ゲストスペースの場合はこちらだけを設定
```

どちらも未設定ならスペース配下には作らない。

ゲストスペースを別の環境変数にしているのは、kintone の API パスが
`/k/guest/{id}/v1/...` に変わり、`KintoneRestAPIClient` の生成時に
`guestSpaceId` を渡す必要があるため（後から切り替えられない）。
指定を取り違えた場合は `app:build` がスペース取得の時点で止まり、
どちらに移すべきかを案内する。

スペース ID はスペースの URL から取れる。

| | URL | ID |
|---|---|---|
| 通常 | `https://example.cybozu.com/k/#/space/12` | `12` |
| ゲスト | `https://example.cybozu.com/k/guest/34/` | `34` |

## 検査する

```sh
pnpm run check
```

**CI（`.github/workflows/check.yml`）が走らせるのはこれだけ。**
手元と CI で同じものが回る。ワークフローにステップを並べると、
手元で「CI と同じもの」を回すのに YAML を読むことになり、
片方だけ更新されても誰も気づかない。定義は `package.json` の 1 箇所に置く。

中身は biome（ルートで 1 回）→ 各パッケージの `check`。
実 kintone には接続しないので数秒で終わる。
**高速で常時グリーンであることが、テストがコメントアウトされないための条件。**

パッケージ 1 つだけを回すこともできる。

```sh
pnpm --filter monosashi run check
pnpm --filter kisekae run check
```

**検証アプリは 1 つで、2 つのパッケージが同じアプリを測る。**
そのためライブ検証（`.github/workflows/live.yml`）は 1 つのジョブに直列で入れ、
concurrency を共有している（理由は
[`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「ライブ検証は 1 つのジョブに直列で入れる」）。

## 依存を上げるとき

`ncu -u` は `packageManager` も更新対象にする。pnpm はそのフィールドを見て
自分を差し替えるので、**依存更新のついでに pnpm 本体が入れ替わる**。
一度これで pnpm が壊れて動かなくなった（経緯と復旧手順は
[`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「`ncu -u` に `packageManager` を触らせない」）。

`.ncurc.json` で `pnpm` を除外してあるので、そのまま `ncu -u` を使ってよい。
pnpm を上げるときは `packageManager` を手で書き換え、**そのあと `pnpm install` を回す**。
pnpm 12 から lockfile にも pnpm 自身が入るようになったので、両方を揃える必要がある。

**`pnpm install` の差分は `git diff --stat` で見る。** `packageManagerDependencies` の
19 行が pnpm の入れ方で出たり消えたりする（
[`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「この節は環境で内容が変わる」）。
過去 2 回、無自覚に混ぜている。

**TypeScript は 2 つ入っている。** `typescript`（7 系）と
`typescript-5.9`（別名で入れた 5.9）。導入先が
「型チェックは 7、エディタは 5.9」という二重構成で、
さらに AWS SAM 側が 5 系の別プロジェクトのため、
`pack:check` が両方で `dist` を検査する。**上げるときは両方を上げる。**
片方だけ上げると、検査しているつもりの版が実物とずれる。

## 公開する

publish はタグを打ったときのワークフローだけが行う。**手元からは実行しない。**

| パッケージ | タグ | ワークフロー |
|---|---|---|
| monosashi | `monosashi-v*` | `.github/workflows/release-monosashi.yml` |
| kisekae | `kisekae-v*` | `.github/workflows/release-kisekae.yml` |

**ワークフローのファイル名を変えない。** npm の Trusted Publishing は
owner / repository / **workflow filename** に紐づき、接続は作ったあと編集できない
（削除して作り直すしかない）。しかも**失敗するのは次に publish しようとした瞬間**。

```sh
# 1. version を上げる
#    タグと package.json の version が食い違うとワークフローが止まる
vim packages/<パッケージ>/package.json

# 2. コミットしてタグを打つ
git commit -am "chore(<パッケージ>): 0.3.1"
git tag -a <パッケージ>-v0.3.1 -m "<パッケージ> 0.3.1"
git push origin main
git push origin <パッケージ>-v0.3.1

# 3. npmjs.com で 2FA を通して承認する
#    承認して初めて公開される
```

タグを押すと CI が `pnpm run check` を通してから
`pnpm stage publish --provenance` する。provenance は「どのリポジトリの
どのワークフローがこの tarball を作ったか」の署名で、`id-token: write` と対で効く。

**stage した時点ではまだ公開されていない。**
`pnpm stage list` / `view` / `approve` / `reject` でも扱えるが、手元は
既定レジストリが社内プロキシを向いているので `--registry` の明示と
npmjs への認証が要る。ブラウザで承認するほうが速い。

### `pnpm publish` は手元で実行しない

**`--dry-run` を付けても実行しない。** 既定レジストリが社内プロキシに向いているため、
出力ゼロのまま固まる（[`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「この環境で
`pnpm publish` を手元から実行しない」）。
公開物の検証は各パッケージの `pack:check`、publish 自体の検証は CI 側で行う。

### 認証にトークンを使っていない

publish の認証は **OIDC Trusted Publishing**。リリースワークフローに
`NODE_AUTH_TOKEN` は無く、GitHub Secrets にも npm のトークンは置いていない。
pnpm が GitHub の id-token から npm 向けのトークンを自分で交換する
（`permissions: id-token: write` がそのために要る）。

`setup-node` に **`registry-url` を書いてはいけない**。`.npmrc` に
`_authToken` のプレースホルダが仕込まれ、OIDC が失敗したときに
それで publish を試みて `401 Unauthorized` になる。本当の失敗理由が隠れる
（[`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「失敗の理由を 401 に隠さない」）。

npmjs.com 側は各パッケージについて次の状態にしてある。
**この 3 つが揃って初めて publish が通る。**

| 設定 | 値 |
| --- | --- |
| Trusted Publisher | GitHub Actions / `cy-takeuchi` / `jissoku` / `release-<パッケージ>.yml` |
| Allowed actions | **未チェック**（staged publish のみ。直接公開は禁止） |
| Publishing access | Require two-factor authentication and disallow bypass 2fa tokens |

つまり **リリースワークフロー以外から npm に何かを置く経路は無く、置かれたものも
人間が 2FA を通すまで公開されない。** リポジトリが破られても、そこで一段止まる。

### 新しいパッケージの初回公開だけは別

npm はパッケージが存在しないと Trusted Publisher を設定できないので、
**最初の version だけは OIDC で publish できない。** 手順は
[`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md)「新しいパッケージの初回公開は
monosashi の前例が通らない」。**2027-01 以降はその手順も使えなくなる。**
