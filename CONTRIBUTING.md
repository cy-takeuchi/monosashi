# 開発する

このリポジトリに手を入れるときの手順。**利用するだけなら読む必要はない**
（使い方は [README](README.md)）。

このプロジェクトの原則は 1 つ。**型に書く前に測る。**
推測で書いた型は実際に何度も外れている（README の「なぜ実測が要るのか」）。
以下の手順は、その原則を運用可能にするためにある。

- [セットアップ](#セットアップ)
- [実測の手順](#実測の手順)
- [検査する](#検査する)
- [公開する](#公開する)
- [設計上の要点](#設計上の要点)

判断の記録は [`docs/DECISIONS.md`](docs/DECISIONS.md)。
何を決めたか、**何を捨てたか、なぜ捨てたか**、
そして**測り方を間違えた記録**が入っている。

## セットアップ

```sh
pnpm install
pnpm approve-builds   # 対話式。esbuild のビルドを許可する
cp .env.example .env
```

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

`op://` のまま渡ってきた場合は `tools/shared/env.ts` が検出して止める
（そのまま kintone に投げると 401 になり原因が分かりにくいため）。

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

## 実測の手順

kintone に接続するコマンドは、`op` を使う場合すべて

```sh
env $(env | grep -o '^[A-Z_]*=op://' | sed 's/=op:\/\//\ /' | sed 's/^/-u /') \
  op run --account <アカウント> --env-file=.env -- <コマンド>
```

の形で実行する（`env -u` の理由は「認証情報の渡し方」を参照）。

### 一度だけ: 検証アプリを用意する

```sh
# 1. 検証アプリを構築（測定用 + ルックアップ参照先 + テストレコード 2 件）
#    完了後 .env に FIXTURE_APP_ID / FIXTURE_LOOKUP_APP_ID が書き込まれる。
#    再実行すると既存のアプリを作り直す（アプリは増えない）
pnpm run app:build

# 2. カテゴリー設定を手動で有効化
#    kintone にカテゴリー設定の REST API は存在しないため、ここだけ手作業
#    アプリ設定 → カテゴリー → 有効化

# 3. 構成を検証（カテゴリー設定漏れ・ルックアップ未実行などを検出）
pnpm run app:verify

# 4. 採取カスタマイズを適用（システム管理権限 + アプリ管理権限が要る）
pnpm run probe:build
pnpm run app:deploy-probe
```

### 毎回: 採取して基準データを作り直す

```sh
pnpm run e2e            # 実 kintone を操作して採取（fixtures/live/raw.json）
pnpm run fixture:build  # 正規化して fixtures/measured.json を作る
pnpm test               # 型の主張を新しい実測に対して検証
```

`e2e/collect.spec.ts` が 1 本のテストで次を辿る。

| | 流れ |
| --- | --- |
| PC | レコード追加 → 詳細 → プロセス管理 → 印刷 → 編集 → 一覧（インライン編集） |
| モバイル | 一覧 → 作成 → 保存 → 詳細 → プロセス管理 → 編集 → 保存 |
| 最後 | 3 経路（PC 詳細 / モバイル詳細 / PC 一覧）から UI で削除 |

削除を UI で行うのは、**REST で消すと削除イベントが飛ばない**ため。
後始末がそのまま採取になっている。

### 採取を変えたら必ず確かめること

**2 回続けて実行し、`fixtures/measured.json` に差分が出ないこと。**

```sh
pnpm run e2e && pnpm run fixture:build && git diff --stat fixtures/measured.json
```

UI 操作の直後は kintone がまだ計算中のことがあり、
動いている対象を採ると同じ操作でも結果が変わる（実際 `t_calc` でそうなった）。
差分が出るなら待ち方が足りていない。

また、新しい採取を足したら **`test/contexts.ts` の `REQUIRED_CONTEXTS` にも足す**。
足さないと、その採取を将来除いてもテストが緑のまま根拠だけ消える。

### 手で採ることもできる

各画面のヘッダに操作パネルが出る。e2e はこのパネルを押している。

| 操作 | 内容 |
| --- | --- |
| ラベル欄 | `未入力` / `入力済み` などを入れる。分析時の突き合わせに使う |
| JS API で採取 | `kintone.app.record.get()` の結果を採る |
| REST で採取 | 同じレコードを REST `getRecord` で採る |
| 両方採取 | 上記 2 つを続けて実行。**同一レコードでの突き合わせが目的なのでこれを推奨** |
| set() 系 | 値・表・行の追加削除。`change` イベントの発火条件を測る |
| カバレッジ | 採取済みの (イベント, 経路) の組を console に出す |
| エクスポート | 蓄積した全サンプルを 1 ファイルでダウンロード |

`event.record` は `kintone.events.on` のハンドラ内で自動的に採取される
（`kintone.app.record.get()` はハンドラ内では動作しないため、経路を分けている）。

### 画面の要素を調べる

kintone の DOM をどう掴めるかは推測せず実物を見る。
`e2e/inspect.spec.ts` が調査用で、`INSPECT=1` のときだけ動く。

```sh
INSPECT=1 pnpm run e2e --grep "ラベル起点"
```

答えの出た調査は消してよい。判明したことは `docs/DECISIONS.md` に残す。

### set() の受け入れ挙動を測る

`toSetRecord` の根拠になるもの（#14）。ケース定義は `src/probe/setCases.ts`。

```sh
pnpm run probe:build && pnpm run app:deploy-probe   # 貼り直し。システム管理権限が要る
pnpm run e2e                                        # 採取。set() のケースも走る
pnpm run fixture:build                              # 正規化
pnpm run fixture:set-behavior                       # fixtures/set-behavior.md を生成
```

**判定は e2e が行う。** probe は set() の失敗を検出できない
（不正な値でも例外が飛ばず、kintone が画面にエラーを出すだけ）。
手でボタンを押して走らせる口は用意していない。

ケース定義だけなら実 kintone なしで検査できる。

```sh
pnpm exec vitest run src/probe/setCases.test.ts
```

**probe を変えたら貼り直しを忘れない。** `app:check-probe` が配信物の
ハッシュを比べているので、貼り直すまで週次のライブ検証が失敗する。

## 検査する

```sh
pnpm run check
```

**CI（`.github/workflows/check.yml`）が走らせるのはこれだけ。**
手元と CI で同じものが回る。ワークフローにステップを並べると、
手元で「CI と同じもの」を回すのに YAML を読むことになり、
片方だけ更新されても誰も気づかない。定義は `package.json` の 1 箇所に置く。

中身は Biome / `tsc` / テスト / 採取カスタマイズのビルド / `pack:check`。
実 kintone には接続しないので数秒で終わる。
**高速で常時グリーンであることが、テストがコメントアウトされないための条件。**

### 公開の器を確かめる（`pack:check`）

```sh
pnpm run pack:check
```

`pnpm pack` した tarball を空のプロジェクトに入れ、
**`monosashi` という名前で**読めるかを確かめる。kintone には接続しない。

`build:check`（`test/dist/consumer.ts`）は `.d.ts` の劣化を捕まえるが、
`../../dist/index` と**相対パスで**読んでいるので

- `exports` マップ
- `files` に入れ忘れたファイル
- `moduleResolution` の違い（`bundler` / `nodenext`）
- 実行時に読み込めるか
- `@kintone/rest-api-client` が**入らない**こと（optional な peer なので）

を通らない。実際、`exports` から `./kintone` を消しても `build:check` は緑のまま、
`pack:check` は落ちることを確認してある。

### `pnpm publish` は手元で実行しない

**`--dry-run` を付けても実行しない。** 既定レジストリが社内プロキシに向いているため、
出力ゼロのまま固まる。公開物の検証は `pack:check`、publish 自体の検証は CI 側で行う。

### 依存を上げるとき

`ncu -u` は `packageManager` も更新対象にする。pnpm はそのフィールドを見て
自分を差し替えるので、**依存更新のついでに pnpm 本体が入れ替わる**。
一度これで pnpm が壊れて動かなくなった（経緯と復旧手順は
[`docs/DECISIONS.md`](docs/DECISIONS.md)）。

`.ncurc.json` で `pnpm` を除外してあるので、そのまま `ncu -u` を使ってよい。
pnpm を上げるときは `packageManager` を手で書き換え、**そのあと `pnpm install` を回す**。
pnpm 12 から lockfile にも pnpm 自身が入るようになったので、両方を揃える必要がある。

**TypeScript は 2 つ入っている。** `typescript`（7 系）と
`typescript-5.9`（別名で入れた 5.9）。導入先が
「型チェックは 7、エディタは 5.9」という二重構成で、
さらに AWS SAM 側が 5 系の別プロジェクトのため、
`pack:check` が両方で `dist` を検査する。**上げるときは両方を上げる。**
片方だけ上げると、検査しているつもりの版が実物とずれる。

## 公開する

publish は **`.github/workflows/release.yml`** だけが行う。手元からは実行しない
（理由は「[`pnpm publish` は手元で実行しない](#pnpm-publish-は手元で実行しない)」）。

```sh
# 1. version を上げる
#    タグと package.json の version が食い違うとワークフローが止まる
vim package.json

# 2. コミットしてタグを打つ
git commit -am "chore: version を 0.2.0 にする"
git tag v0.2.0
git push origin main --tags
```

タグを押すと CI が `pnpm run check` を通してから
`pnpm stage publish --provenance` する。provenance は「どのリポジトリの
どのワークフローがこの tarball を作ったか」の署名で、`id-token: write` と対で効く。

**この時点ではまだ公開されていない。**

```sh
# 3. npmjs.com で 2FA を通して承認する
#    https://www.npmjs.com/package/monosashi
#    承認して初めて公開される
```

`pnpm stage list` / `view` / `approve` / `reject` でも扱えるが、手元は
既定レジストリが社内プロキシを向いているので `--registry` の明示と
npmjs への認証が要る。ブラウザで承認するほうが速い。

### 認証にトークンを使っていない

publish の認証は **OIDC Trusted Publishing**。`release.yml` に
`NODE_AUTH_TOKEN` は無く、GitHub Secrets にも npm のトークンは置いていない。
pnpm が GitHub の id-token から npm 向けのトークンを自分で交換する
（`permissions: id-token: write` がそのために要る）。0.1.1 で動作を確認済み。

`setup-node` に **`registry-url` を書いてはいけない**。`.npmrc` に
`_authToken` のプレースホルダが仕込まれ、OIDC が失敗したときに
それで publish を試みて `401 Unauthorized` になる。本当の失敗理由が隠れる
（`docs/DECISIONS.md`「失敗の理由を 401 に隠さない」）。

npmjs.com 側は次の状態にしてある。**この 3 つが揃って初めて publish が通る。**

| 設定 | 値 |
| --- | --- |
| Trusted Publisher | GitHub Actions / `cy-takeuchi` / `monosashi` / `release.yml` |
| Allowed actions | **未チェック**（staged publish のみ。直接公開は禁止） |
| Publishing access | Require two-factor authentication and disallow bypass 2fa tokens |

つまり **`release.yml` 以外から npm に何かを置く経路は無く、置かれたものも
人間が 2FA を通すまで公開されない。** リポジトリが破られても、そこで一段止まる。

ワークフローのファイル名を変えると stage が落ちるので、
改名するときは npmjs.com 側の Trusted Publisher も直すこと。
`release.yml` を `pnpm publish` に戻した場合も、Allowed actions が禁じているので落ちる。

## 設計上の要点

### `JSON.stringify` を使わない

```js
JSON.stringify({ error: undefined }) === "{}"   // キーが消える
```

測定目的は `disabled?` / `error?` / `$id?` が optional かどうかの判定、
つまり**キーの有無そのもの**。素朴なダンプでは目的が最初の一手で壊れる。
`src/probe/serialize.ts` は `Object.keys()` でキー集合を保持し、
各値を種別つきで包むことで `undefined` / `null` / `""` / `[]` を区別する。

### 採取と正規化を分離する

ブラウザ側（`src/probe/`）は生データの採取だけを行い、
環境依存の値を伏せるのは Node 側（`tools/fixture/normalize.ts`）が担当する。

分けている理由は 2 つ。採取カスタマイズを再アップロードせずに
正規化の規則だけ何度でも直せること。そして
**採取したままの生データにはレコード ID・時刻・ユーザー情報が入る**ので、
コミットするものと切り離せること（`fixtures/live/raw.json` は gitignore）。

正規化はフィールドの**コードではなく `type` で判定する**。
組み込みフィールドのコードは環境の言語で変わるため。

### 採取コードを二重に持たない

`probe-dist/probe.js` は1つの成果物であり、
人間が手でアプリに登録するのも、CI が `updateAppCustomize` で適用するのも同じもの。
採取コードをテンプレート文字列などで二重に持つと、
手動で採った実測と CI が検証している実測が別物になる。

### CI では実 kintone に接続しない

PR で回すのは型チェック・Lint・凍結フィクスチャに対するテストのみ。
実 kintone を使う検証は定期スケジュールジョブに分離し、
そこでは**フィクスチャと実測の diff** で落とす。
PR ごとにライブ実行すると遅く不安定になり、やがてテストが無効化される。

### フィールド種別の重複はテストで縛る

型 / `VALUE_SHAPE` / ガード / 構築子は、読みやすさのために
それぞれが全種別を書き下している。条件型で導出すると
ホバー表示とエラーメッセージが壊れるため（kintone-typeguard が失敗した道）。

重複そのものは許すが、**ずれたまま気づかない**ことは許さない。
`test/fieldTypes.ts` の一覧を軸に、フィクスチャ・型・実装の 3 方向を
`test/coverage.test.ts` と `test/coverage.test-d.ts` が突き合わせる。
詳細は [`docs/DECISIONS.md`](docs/DECISIONS.md)。
