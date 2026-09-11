# ツールチェーンの判断

リポジトリ全体に効く判断。パッケージ固有のものは各
`packages/*/docs/DECISIONS.md`。

kintone 自体の事実は [`KINTONE.md`](KINTONE.md)、
パッケージの設計判断は各 `packages/*/docs/DECISIONS.md`。

> **この文書は日付つきの記録なので、当時の名前をそのまま残している。**
> `tsumekae` は 0.4.0 まで `monosashi` という名前だった（2026-09-11 に改名）。
> リポジトリ名（`cy-takeuchi/monosashi` → `cy-takeuchi/jissoku`）・npm の
> publish 履歴・既に打ったタグ（`monosashi-v*`）はどれも実際に起きたことなので、
> 書き換えると記録が嘘になる。**「いまこうなっている」を述べている節だけ**
> 新しい名前にしてある（パッケージの一覧・リリースのタグ表）。

## モノレポは既存の monosashi のリポジトリを使う

**2026-09-10。** kisekae を作るにあたって、リポジトリを分けるか 1 つにするかを決めた。

**1 つにする。理由は実測の根拠が割れると静かに腐るから。**
kisekae の実測は、monosashi のリポジトリにある `fields.ts` / `layout.ts` が
定義したアプリを測ったもの。別リポジトリだと、フィールドを 1 つ変えた瞬間に
kisekae の実測が**古いアプリの記録**になり、それを検出する仕組みがどこにも作れない。
1 リポジトリなら 1 コミットで両方が動き、`check` 1 回で見える。

**新しいリポジトリを作らずに既存のものを使う**のは、npm の Trusted Publishing が
owner / repository / workflow filename に紐づいていて、
**接続は作ったあと編集できない**（削除して作り直すしかない）ため。
**リポジトリ名を変えると、この 3 つのうち repository が変わるので
接続を作り直すことになる。** そのついでにワークフロー名とタグの形も
揃えた（`release-monosashi.yml` / `monosashi-v*`）── どうせ 1 回の
作り直しで済むので、追加コストがゼロだった。

リポジトリ名を変える場合は npmjs.com で接続を貼り直す。
**失敗するのは次に publish しようとした瞬間**なので、改名とリリースを
同じ日にやらないと原因が分からなくなる。

### 名前は jissoku にした

既存のリポジトリを使う決定はそのままで、**名前だけ変えた**
（`cy-takeuchi/monosashi` → `cy-takeuchi/jissoku`）。

パッケージが 2 つ入ったリポジトリが片方の名前を持っていると
`monosashi/packages/kisekae` という読みにくいパスになり、
**「monosashi が主で kisekae が従」と読める。特別ではない。**

改名で変わるものを同じ日に全部変えた。

| | |
| --- | --- |
| リポジトリ | `cy-takeuchi/jissoku` |
| ワークフロー | `release.yml` → `release-monosashi.yml`、`release-kisekae.yml` を新設 |
| タグ | `v*` → `monosashi-v*` / `kisekae-v*` |
| Trusted Publisher | 両方を削除して作り直し（owner / repository / **workflow filename** に紐づく） |
| 各パッケージの repository / homepage / bugs | jissoku を指すように |
| ワークスペースの `name` | `kintone-type-workspace` → `jissoku` |
| rig のスコープ | `@kintone-type/rig` → `@jissoku/rig`（28 ファイル） |

**下の 2 つは後から気づいて直した。** 改名で変わるのは GitHub 上の名前だけではない。
`@kintone-type/rig` は**非公開パッケージなのでスコープは何でもよく、
古いままでも動く**。動かなくなる場所が無いぶん残りやすかった。

**改名の手順には `git grep` で古い名前を探すところまでを含める。**

## パッケージは 3 つ。共有するのは足場だけ

| | 公開 | 中身 |
|---|---|---|
| `packages/tsumekae` | する | レコード。検証アプリの定義もここ |
| `packages/kisekae` | する | フォーム定義 |
| `packages/rig` | **しない** | 認証・kintone クライアント・実行の入口 |

### rig に入れるもの / 入れないもの

**入れたのは 5 つだけ**（`env` / `repoRoot` / `client` / `describeError` / `run`）。

**検証アプリの構築（`tools/fixture-app/`）は tsumekae に残した。**
アプリの定義はレコードの実測が主な用途で、kisekae は建ったアプリを読むだけ。
共有しているのは**建っているアプリそのもの**で、定義するコードではない。

**`pack:check` も共有しない。** 土台（pack → 空プロジェクトへ install →
依存の実体を確かめる → 2 モード × 2 バージョンで型検査）は共通だが、
**シナリオが別物**。tsumekae の 507 行のうち大半は利用者側のソースを
文字列で埋め込んだシナリオで、25 箇所が tsumekae 固有だった。
kisekae には `declare global` も `/kintone` サブパスも無い。

引数化して一般化はしない。シナリオを書くための DSL を作ることになる。
**2 つ書いてみて初めて境界が正確に引ける。**

### 規約は rig が持ち、適用は各パッケージがする

`runScript` を通していない入口を探す走査は rig
（`toolConvention`）に置き、各パッケージが自分の `tools/` に適用する。

検査を各パッケージに写して回ると、`runScript` の意図が変わったときに
片方だけ古くなる。それは `runScript` を作った理由そのもの
（7 本のうち 1 本だけ `describeError` ではなく `String(error)` だった）。

**実際にこの検査が働いた。** kisekae の `tools/packCheck.ts` が
`main()` を直接呼んでいるのを、置いた直後に捕まえた。

## `.env` はリポジトリのルートに 1 つ

`pnpm run` はスクリプトを**そのパッケージのディレクトリ**で実行するので、
cwd 相対の `".env"` はモノレポにした時点で壊れる。

`rig` の `repoRoot` が `pnpm-workspace.yaml` を目印に上へ探す。
`.git` を使わないのは、worktree や submodule ではファイルだったり
別の場所を指したりするため。`pnpm-workspace.yaml` は
「pnpm がワークスペースのルートだと見なす場所」そのもの。

見つからなければ**落ちる**。黙って cwd を使うと、`.env` が無いのではなく
「環境変数が未設定です」という別の症状で現れて原因が読めなくなる。

## 除外パターンは `**/dist` にしない

`.gitignore` と `biome.json` の両方で同じ罠がある。

**`packages/*/dist` と書く。** `**/dist` にすると、検査対象のソースである
`packages/*/test/dist/consumer.ts` まで巻き込む。
tsumekae は移行前から `.gitignore` に `/dist`（先頭スラッシュ）と書いて
この罠を避けていた。モノレポではその手が使えないので、階層を明示する。

**`biome.json` は JSON でコメントを置けない。** 理由はここに書く。

移行で実際に 1 件踏んだ。`biome.json` の `"!fixtures"` はルート直下前提で、
`packages/*/fixtures` に移った 4.6 MiB の `measured.json` を
biome が処理しようとして警告が出た（`--error-on-warnings` なので落ちる）。

## リリースはタグの前置で分ける

| パッケージ | タグ | ワークフロー |
|---|---|---|
| tsumekae | `tsumekae-v*` | `release-tsumekae.yml` |
| kisekae | `kisekae-v*` | `release-kisekae.yml` |

**1 つのワークフローで両方を publish しない。** Trusted Publishing の接続が
workflow filename に紐づくので、片方の接続を触るためにもう片方も
貼り直すことになる。

**ファイル名とタグの形は、接続を作り直すときにだけ変えられる。**
リポジトリ改名と同時にやれば手作業は 1 回で済む。
別の日にやると npmjs.com を 2 度開くことになり、しかも
**貼り直し忘れは次に publish しようとした瞬間まで気づけない**。

## ライブ検証は 1 つのジョブに直列で入れる

2 つのパッケージが**同じ検証アプリ**を測るので、
`concurrency: group: live-verification` を共有する。

ジョブを分けると `app:build` や採取が並行して走り、
「たまに落ちる不安定なジョブ」として現れる。
原因が並行実行だと気づくまでに時間がかかる種類の失敗。

順序はレコードの採取（Playwright）→ フォーム定義の採取（REST のみ）。
kisekae の採取はブラウザを使わない。

## 変更されたパッケージだけ検査する仕組みは、まだ入れない

`pnpm --filter "...[origin/main]" check` は入れない。
3 パッケージなら常に検査しても数秒で、先に入れると
**「浅い clone で base ref が取れず全部スキップされて緑になる」**という、
いちばん見つけにくい失敗を抱える。

速度が実際に痛くなってから移る。

---

## 週次ライブ検証の判定を、PR の CI ではなくジョブ内で行う

当初は「フィクスチャ更新 PR を立て、その PR 上で既存の CI に判定させる」設計だった。
既存の CI は `on: pull_request` で走るので追加設定が要らない、という理由。

**成立しない。GITHUB_TOKEN で作った PR は他のワークフローを起動しない**（GitHub の仕様）。
再帰的なワークフロー実行を防ぐための制限で、PAT か GitHub App のトークンを使わない限り回避できない。

秘密情報を 1 つ増やすより、**ライブ検証のジョブ自身が新しい実測に対してテストを走らせ、
結果を PR のタイトルと本文に載せる**ほうが単純。
`continue-on-error` にして、テストが落ちても PR は立てる。
落ちたときこそ、新しい実測データが手元に必要になる。

型の主張が壊れたときはジョブ自体も失敗させる。
スケジュール実行の失敗はワークフローを最後に更新した人に通知されるので、
PR が立つだけより気づかれやすい。

## 短い値を Secret にしない

`FIXTURE_APP_ID=2` を GitHub の Secret にすると、
**ログ中のあらゆる `2` が伏せられる**。実際にこうなった。

```
Run pnpm run e***e:install          ← "e2e" の 2
[403] [CB_NO0***] 権限がありません   ← エラーコード CB_NO02
適用に失敗した（*** 回目）
```

このジョブは「何が変わったか」を診断するのが仕事なので、ログが読めないのは致命的。
アプリ ID は URL に出る情報で秘密ではない。Variable に置く。

## スケジュール実行は放置すると止まる

GitHub はリポジトリが 60 日間非アクティブだと `schedule:` を自動で無効化する。
「人が忘れても動く」ことが目的の仕組みなので、この性質は目的と正面から衝突する。
ワークフローの冒頭にコメントで残してある。

## Actions が PR を作れるようにする設定が要る

`peter-evans/create-pull-request` は既定では失敗する。

```
GitHub Actions is not permitted to create or approve pull requests.
```

Settings → Actions → General → Workflow permissions の
「Allow GitHub Actions to create and approve pull requests」で有効にする。

**この設定は「作成」と「承認」を同じトグルで制御する。**
承認まで許すので既定で無効なのは妥当。有効にすると、main にマージされた
ワークフローが PR を自己承認できるようになる。
このリポジトリにその経路は書いていないが、緩和したことは意識しておく。

避ける手もある。ジョブはブランチを push するだけにして、PR は人が開く方式。
設定変更は要らないが、「人が忘れても動く」という目的は弱まる。

## `ncu -u` に `packageManager` を触らせない

`npm-check-updates` は `packageManager` フィールドも**更新対象として扱う**。
`ncu -u` を打つと依存と一緒に pnpm 自身のバージョンが書き換わる。

```
 pnpm                11.6.0  →    12.3.4
```

pnpm 11 以降はこのフィールドを見て、一致しないバージョンを自分で取りに行く
（manage-package-manager-versions）。つまり **`ncu -u` はその場では何も壊さず、
次に `pnpm` を打った瞬間に pnpm 本体を差し替える。**

2026-09-05 にこれで手元の pnpm が壊れた。書き込まれた `pnpm@11.25.0` を pnpm が
取りに行き、`~/Library/pnpm/store/v11/links/@pnpm/exe/11.25.0/` に**中身のない**
ものが入った。以降このリポジトリで `pnpm` を打つと必ずそこへ委譲され、こうなる。

```
node_modules/@pnpm/exe/pnpm: line 1: This: command not found
```

`pnpm` 自体が動かないので `pnpm install` では戻せない。手で消すしかない。

```sh
git checkout package.json                                # packageManager を戻す
rm -rf ~/Library/pnpm/store/v11/links/@pnpm/exe/11.25.0  # 壊れたものを消す
pnpm --version                                           # 戻ることを確認
```

**取り込みが壊れた原因は特定できていない。** `~/.npmrc` の `ignore-scripts=true` を
疑ったが、後から入った `12.3.4` は同じ設定のまま正常な実行ファイルとして入った。
確実に言えるのは、この経路で壊れることが一度起きた、ということだけ。

### 対処

`.ncurc.json` で `pnpm` を除外する。設定ファイルが効くことは確認済み。

```json
{ "reject": ["pnpm"] }
```

pnpm を上げたいときは意図して上げる。`packageManager` は
**動かす pnpm を決める設定**であって、依存ではない。
依存の一括更新のついでに動くと、更新した本人にも何が変わったのか見えない。

## この環境で `pnpm publish` を手元から実行しない

`pnpm publish --dry-run` が**出力ゼロのまま固まった**。`~/.npmrc` の既定レジストリが
社内のプロキシに向いているためで、認証の入力待ちと見ている。
`package.json` の `publishConfig.registry` は npmjs を指しているので公開先自体は正しいが、
`--dry-run` の経路はそこを見に行かない。

公開物が利用者から読めるかは **`pnpm run pack:check`** で確かめる。
`pnpm pack` した tarball を空のプロジェクトに入れ、`exports` / `files` /
`moduleResolution` / 実行時 import / 依存が入らないことまで通す。
レジストリに触らないので固まらない。

publish 自体は **パッケージごとのリリースワークフロー**が行う。
`v*` のタグを押したときだけ走り、`pnpm run check` を通してから publish する。

## publish に npm CLI を使わない

pnpm 11.6.0 の `pnpm publish` には **`--provenance` が無い**（`--help` にも
バイナリ内の文字列にも存在しない）。provenance は「どのリポジトリのどの
ワークフローがこの tarball を作ったか」を sigstore で署名するもので、
**実測を売りにするパッケージが出所を証明できないのは筋が通らない**。

選択肢は 2 つあった。

| | 得るもの | 代償 |
| --- | --- | --- |
| CI の publish だけ `npm publish` にする | provenance と **OIDC Trusted Publishing の両方が確実** | ツールが 2 つ混ざる。`pack:check` が検証する tarball の生成元と実際の出荷物がずれる |
| pnpm 12 に上げる | pnpm 一本のまま `--provenance` が使える | **OIDC Trusted Publishing に対応しているか確認できていない** |

**pnpm 12 を選んだ。** ツールを 1 つに保つことを優先している。

選んだ時点では代償が確定していなかった。npm のドキュメントは「npm CLI は OIDC 環境を
自動検出してトークンより優先する」と明言しているが、pnpm 側は 12.0.0 のリリースノートにも
settings のドキュメントにも `pnpm publish --help` にも OIDC の記載が無く、
**トークンを捨てられるかは実際に試すまで分からなかった。**

### 2026-09-06: pnpm は OIDC を実装していた

0.1.0 の公開ログで判明した。pnpm は自分から GitHub の ID トークンを取りに行っている。

```
GET .../idtoken/...?audience=npm%3Aregistry.npmjs.org 200 289ms
[WARN] Skipped OIDC: ERR_PNPM_AUTH_TOKEN_EXCHANGE: Failed token exchange request
       with body message: Unknown error (status code 404)
```

`audience=npm:registry.npmjs.org` の取得は 200 で成功し、npm への交換だけが 404 で落ちた。
**この時点でパッケージが存在せず Trusted Publisher も未設定だったため**で、想定どおり
トークンにフォールバックして公開された。ドキュメントに書かれていないだけで実装はある。

つまり pnpm を選んだ代償は無かった。Trusted Publisher を設定したのでトークンは捨てた。

**0.1.1 で確定した。** `Skipped OIDC` の警告が消え、トークンを一切持たない状態で
stage できた。`ERR_PNPM_AUTH_TOKEN_EXCHANGE` の 404 は
**Trusted Publisher が npm 側に登録されていなかった**ことが原因だった。

### 失敗の理由を 401 に隠さない

0.1.1 の最初の試行は `401 Unauthorized` で落ちた。これは症状であって原因ではない。

`actions/setup-node` に `registry-url` を書くと、`.npmrc` に
`_authToken=${NODE_AUTH_TOKEN}` が仕込まれる。`NPM_TOKEN` の Secret を消した後は
その中身が setup-node のプレースホルダ `XXXXX-XXXXX-XXXXX-XXXXX` のままになる。
OIDC が 404 で失敗したあと pnpm がそれで publish を試み、401 になった。

**本当の失敗理由（404）が 401 に置き換わって見えなくなる。**
認証を OIDC だけに任せるなら `.npmrc` に authToken を置く理由がないので、
`registry-url` は書かない。公開先は `publishConfig.registry` が決める。

なお pnpm は静的な `_authToken` より OIDC を優先する（PR #11495、2026-05）ので、
これが OIDC を潰していたわけではない。潰していたのは診断のしやすさだけ。

### CI に公開させない（staged publish）

npm の Trusted Publisher には Allowed actions がある。`npm stage publish`
（pnpm では `pnpm stage publish`。**pnpm 12 にも実装がある**）は常に許可され、
直接の `publish` を許すかは選択制。

**直接 publish を許可しない。** npm の設定画面自身がこう書いている。

> Not recommended. For stronger security, leave unchecked to allow staged publishing only.

CI は `pnpm stage publish` で npm に置くだけで、その時点では誰からも見えない。
人間が 2FA を通して承認して初めて公開される。

一度「ワークフローが固定されトークン経路も塞がっているのだから
直接 publish でよい」と判断したが、**撤回した。** 残るリスクとして挙げた
「ワークフロー自体の乗っ取り」を「そこまで想定するならリポジトリの書き込み権限が
すでに破られている」と切り捨てたのが誤り。近年の npm のサプライチェーン攻撃は
まさにその経路であり、npm が staged publish を作ったのもそのため。
**リポジトリが破られた「あと」に人間の 2FA がもう一段あることに意味がある。**

代償はリリースごとに手作業が 1 つ増えること。リリースワークフローは stage したあと
`::notice::` で承認を促す。

| サブコマンド | 用途 |
| --- | --- |
| `pnpm stage publish` | CI が置く |
| `pnpm stage list` / `view` | 置かれているものを見る |
| `pnpm stage approve` / `reject` | 承認 / 却下 |

**承認は npmjs.com のブラウザで行う。** `pnpm stage approve` も使えるが、
手元は既定レジストリが社内プロキシを向いており、`--registry` の明示と
npmjs への認証が別途要る（この環境で `pnpm publish` が固まったのと同じ理由）。

### 2026-09-10: 新しいパッケージの初回公開は monosashi の前例が通らない

**npm はパッケージが存在しないと Trusted Publisher を設定できない。** 設定画面が
パッケージの下にしかないためで、初回だけは OIDC で publish できない（npm/cli#8544）。
そこは monosashi 0.1.0 と同じだが、**その先が変わっていた。**

kisekae 0.1.0 は 3 回落ちてから通った。落ち方がそれぞれ違う原因を指していて、
**エラーが変わったことが手がかりになった。**

| | 返り | 意味 |
| --- | --- | --- |
| 1 | `403 E_STAGE_REQUIRED` | トークンは有効。だが **stage しかできない** |
| 2 | `404 {"error":"Not found"}` | トークンが**通っていない** |
| 3 | 成功 | |

1 回目の本文が全部書いてあった。

```
Cannot publish "kisekae": this token can only publish to a staging area,
and "kisekae" does not exist yet. Create it first with a direct-capable
token, then use `npm stage publish`. (E_STAGE_REQUIRED)
```

**壁は 2 重。** stage は既存パッケージにしか使えないので、stage しかできない
トークンでは新しい名前を作れない。

原因は granular access token の **`Bypass two-factor authentication`** の
チェックを入れていなかったこと。入れないとアカウントの 2FA 要求が効き、
CI には対話の 2FA が無いので direct publish が落ちて stage だけが残る。
`kisekae` はまだ存在しないので **`Only select packages` では選べない**（`All packages` が要る）。

**monosashi 0.1.0 のときはこの壁が無かった。** npm が 2026-07-31 に
2FA bypass トークンの扱いを変えている。同じ changelog は
**2027-01 に bypass トークンから direct publish を取り上げる**と予告している。
そのときこの手順は使えなくなる。**新しいパッケージを作るなら、それより前に名前だけ取る。**

2 回目の 404 は別の話で、npm 側でトークンを作り直したのに GitHub の Secret を
更新していなかった。**npm は認証失敗を 401 ではなく 404 で返す**
（PUT できない匿名ユーザにパッケージの存在を漏らさないため）。
`gh api .../actions/secrets/NPM_TOKEN --jq .updated_at` を見れば分かる。

#### 初回公開の手順

一時変更は **1 コミットに閉じて `git revert` で戻す。** 手で戻すと取りこぼす。
`registry-url` が残るのが一番まずい（上の「失敗の理由を 401 に隠さない」）。

1. granular access token を作る。**`Bypass two-factor authentication` を入れる**。
   `All packages` / `Read and write` / 期限は最短
2. `gh secret set NPM_TOKEN`。**更新されたかを `updated_at` で確かめる**
3. リリースワークフローを一時変更して 1 コミットにする
   - `setup-node` に `registry-url: https://registry.npmjs.org` を足す
   - `pnpm stage publish` → `pnpm publish`（stage は Trusted Publishing の機能なので使えない）
   - publish ステップに `NODE_AUTH_TOKEN` を渡す
4. タグを打つ。**`--provenance` はトークン経路でも効く**ので初回から署名が付く
   （`package.json` の `repository.url` が実リポジトリと一致していることが条件。
   リポジトリ改名を先に済ませておく）
5. npmjs.com で Trusted Publisher を作る。Allowed actions は未チェック
6. `git revert` で 3 を戻す
7. Secret を消し、npm 側のトークンも revoke する

**初回だけは即時公開になる。** stage を通れないので、人間が 2FA で承認する関門が
無いまま出る。一度きりの例外として受け入れる。

## pnpm 12 は lockfile に pnpm 自身を書く

pnpm 12.3.4 に上げると `pnpm-lock.yaml` の**先頭に YAML ドキュメントがもう 1 つ**増える。

```yaml
---
lockfileVersion: '9.0'
importers:
  .:
    packageManagerDependencies:
      pnpm:
        specifier: 12.3.4
        version: 12.3.4
packages:
  '@pnpm/exe.darwin-arm64@12.3.4': ...   # 全プラットフォーム分
---
lockfileVersion: '9.0'                    # ここから下が従来の依存グラフ（無変更）
```

既存の依存グラフは 1 行も変わらず、純粋な追加だった（101 行）。
`pnpm install --frozen-lockfile` を 2 回続けても md5 が変わらないことを確認している。

これは `packageManager` フィールドと**二重に** pnpm のバージョンを固定する。
`packageManager` は「どの pnpm を動かすか」、lockfile は「その pnpm の実体は何か」。
pnpm を上げるときは `packageManager` を手で書き換えたあと
**`pnpm install` を回して lockfile も更新する**必要がある。

### この節は環境で内容が変わる

`packageManagerDependencies` に `@pnpm/exe` が入るかどうかは、
**pnpm がどう入っているかで変わる**。mise が入れた pnpm を経由すると
`@pnpm/exe` とその全プラットフォーム分（19 行）が書かれ、
`pnpm/action-setup` が入れた pnpm では書かれない。

しかも **`--frozen-lockfile` でも書き換わる。** frozen が守るのは依存グラフで、
この節は対象外らしい。同じ環境で 2 回続ければ安定するが、
環境をまたぐと 19 行が出たり消えたりする。どちらの形でも CI は通る。

実害は差分のノイズだけだが、`git add -A` で無自覚に混ぜ込みやすい
（2026-09-06 に実際に混ぜた）。**コミット前に `git diff --stat` を見る。**

## TypeScript は 5.9 と 7 の両方で dist を検査する

**2026-09-08。** 導入先（kintone-plugins）は**型チェックが 7、エディタが 5.9**
という二重構成で、さらに AWS SAM 側は 5 系の別プロジェクト。
**どちらか片方でしか通らない `.d.ts` を出すと、片方が黙って `any` に落ちる。**

`typescript-5.9` という別名で 5.9.3 を devDependency に入れ、
`pack:check` が両方で走る（6 シナリオ × 2 解決方式 × 2 版 = 24 通り）。
`pnpm exec tsc` をやめて、それぞれのバイナリを絶対パスで呼ぶ。

**言語機能の差では落ちない。** TS 7 は 5.9 の移植なので構文はほぼ同じ。
5.9 レーンが拾うのは解決の挙動の差（`@types` の暗黙取り込み、
`moduleResolution` の扱い）で、そこが本番の食い違いどころでもある。
レーンが空回りしていないことは、素の型エラーを入れて
**両方が独立に落ちる**ことで確かめた。

最低サポート版を **5.9** として README に明記した。

## 積んだ PR は下から先にマージすると上が消える

#28（base: `main`）と #29（base: `refactor/run-script`）を
**20 秒差**でマージした。順番が逆だった。

| PR | base | マージ時刻 |
|---|---|--:|
| #28 | `main` | 15:18:**29** |
| #29 | `refactor/run-script` | 15:18:**49** |

#28 が `refactor/run-script` を `main` に取り込んだ時点で、
そのブランチは行き先を失っている。そこへ #29 を入れても
**どこにも届かない。** #29 は「MERGED」と表示され、
GitHub 上は成功して見える。

見つかったのは 0.2.0 の準備で `main` の履歴を見たとき。
`test/deadExports.test.ts` が無く、`Api.DomElement` も戻っていた。
**リリース直前でなければ気づかなかった。**

`git log main..<ブランチ>` が空であることを、マージ後に確かめる。
積むときは**上から先にマージする**か、`main` に向けて 1 本ずつ出す。

## ドキュメントは 3 層に割る

**2026-09-10。** monosashi の `docs/DECISIONS.md` は 3,384 行あり、
3 つの塊が混ざっていた。

| | 場所 | 行数 |
|---|---|---|
| kintone 自体の挙動 | `docs/KINTONE.md` | 572 |
| 環境とツールチェーン | `docs/TOOLCHAIN.md`（この文書） | 287 |
| monosashi の設計判断 | `packages/monosashi/docs/DECISIONS.md` | 2,526 |

**基準は「kintone の挙動そのものか / 環境とツールチェーンか / そのパッケージの判断か」。**
「どちらのパッケージが今必要としているか」では切らない。
`set()` の受け入れ挙動は kisekae には要らないが、**kintone の事実**なので上に置く。
パッケージを増やしたときに再測定しなくて済むことが目的。

`CLAUDE.md` も同じ形に割った。ルートに共通ルール、各パッケージに固有のもの。
**Claude Code は作業ディレクトリとその祖先から読む**ので、
`packages/kisekae` で作業すれば両方が効き、共通ルールを 2 箇所に書かずに済む。

### 分割は 1 コミットで、リンクは機械で確かめる

見出しを移すと参照が静かに切れる。**リポジトリの `.md` 全件について、
リンク先のファイルと見出しの存在を突き合わせるスクリプトで 0 件を確認した。**

実際に 6 件見つかった（移動した節への相対パス 5 件と、
`LICENSE` がルートに移ったことによる 1 件）。
うち 1 件は**移動前から古かった参照**（存在しない見出しを指していた）。

コードのコメントからの参照も同じように洗った。
`grep -rn "DECISIONS"` で 30 箇所を確認し、4 件を直した。

### CONTRIBUTING も 3 層に割る

**2026-09-10。** kisekae に `CONTRIBUTING.md` が無く、
**共通の手順が monosashi の中にだけ書かれていた。**
セットアップ・認証情報・スペース・依存の上げ方・publish の仕組みは
どちらのパッケージでも同じもので、kisekae で作業する人が
monosashi のディレクトリを読みに行く形になっていた。

| | 場所 | 中身 |
| --- | --- | --- |
| 共通 | `CONTRIBUTING.md` | セットアップ / 認証情報 / スペース / 検査 / 依存 / 公開 |
| monosashi 固有 | `packages/monosashi/CONTRIBUTING.md` | 検証アプリの構築、採取カスタマイズ、e2e |
| kisekae 固有 | `packages/kisekae/CONTRIBUTING.md` | フォーム定義の採取、3 点の縛り |

`CLAUDE.md` と `DECISIONS.md` と同じ基準（**共通か / そのパッケージのものか**）。

移したときに**モノレポ化で古くなっていた記述が 3 件見つかった**。
共通部分が 1 箇所に無かったので、直す機会が来ていなかった。

| | |
| --- | --- |
| `cp .env.example .env` | `.env.example` はルートにあるので、パッケージのディレクトリでは失敗する |
| `git tag v0.2.0` / `git push --tags` | タグは `monosashi-v*` に変わっている。**打っても何も起きない** |
| 「失敗の理由を 401 に隠さない」の参照 | 節はこの文書に移っていたのに、`DECISIONS` を指したままだった |

### 参照の検査をテストにする

**上の「リンクを機械で確かめた」は、確かめたのがファイルの存在だけだった。**
本文がファイル名に `「見出し名」` を続ける形で指している参照は見ていない。
**リンクではなく地の文なので、壊れても誰も気づけない。**

あとから 6 件見つかった。

| 内訳 | |
| --- | --- |
| 移動した見出しを古いファイルで指していた | 3 件 |
| 存在しない見出し名を指していた | 2 件 |
| 移動したファイルを古いパスで指していた | 1 件 |

`packages/rig/src/docRefs.test.ts` が `pnpm run check` の一部として、
リポジトリ全体の `.md` / `.ts` / `.yml` について

- Markdown のリンク先が実在すること
- 地の文が指す見出しがそのファイルに在ること
- 公開するパッケージに 4 つのドキュメントが揃っていること

を見る。**4 種の壊し方を入れて、それぞれ独立に落ちることを確かめた**
（見出し名を変える / リンク先を消す / `CONTRIBUTING.md` を消す /
参照そのものを全部消す）。最後のものは「参照を実際に拾えている」が受け持つ。

比較は**空白を全部落として**行う。日本語は行の折り返しに空白を入れないので、
行をまたぐ参照を空白で繋ぐと見出しと一致しなくなる。
行頭のコメント記号（`#` / `*` / `//`）も落とす。
どちらも実際にこの検査が誤検出して気づいた。

**許容リストは作らない。** この節を書いた時点で、検査が**この説明文自身**を
壊れた参照として報告した。壊れた例を verbatim で引用していたため。
除外の仕組みを足すのではなく、**例の書き方を変えた**
（ファイル名と `「…」` を隣に並べない）。逃げ道を作ると、
そこに本物の壊れも入る。

## 出荷される README のリンクは tarball の中で解決させる

**2026-09-10。** モノレポ化で LICENSE がパッケージの外に出たとき、
`pnpm pack` の結果に `package/LICENSE` が入ることを確かめて問題なしと判断した
（pnpm はワークスペースのルートの LICENSE をコピーする。
`files: ["dist"]` に書いていなくても入る）。

**確かめたのはファイルが入ることだけで、README の `[MIT](../../LICENSE)` が
そこに届くかは見ていなかった。** `../../` はパッケージのルートより上を指すので、
tarball の中では解決しない。**「キーの存在を確かめて値の意味まで結論した」
のと同じ間違い**をツールチェーンの側でやっていた。

### 各パッケージに LICENSE を置く

`packages/monosashi/LICENSE` と `packages/kisekae/LICENSE` を置いた。
リンクが `[MIT](LICENSE)` になり、**tarball の中だけで解決する。**
ルートの LICENSE も残す（リポジトリ自体のもの）。

npmjs.com は README の相対リンクを `repository` + `directory` に対して
解決するらしく、**そちらでは繋がっていた可能性がある。**
だが Cloudflare に阻まれて実際の描画を測れなかったので、当てにしない。
**特定のサイトの描画に依存しないほうを選ぶ。**

### 出荷しないものへのリンクは絶対 URL にする

`docs/DECISIONS.md` / `CONTRIBUTING.md` / `fixtures/*` は出荷しない
（`fixtures/measured.json` は 4.6 MiB あるので入れる選択肢が無い）。
これらは `https://github.com/cy-takeuchi/jissoku/blob/main/...` に変えた。
monosashi 7 件、kisekae 3 件。

**判断の基準はこうなる。**

| リンク先 | 書き方 |
| --- | --- |
| tarball に入るもの（`LICENSE` / `dist/*`） | 相対 |
| 入らないもの | 絶対 URL |

### 検査は pack:check が持つ

両パッケージの `pack:check` が、tarball の同梱物一覧に対して
README の相対リンクを突き合わせる。`../../LICENSE` に戻すと落ちることを確かめた。

**リポジトリ内のリンク検査（`packages/rig/src/docRefs.test.ts`）では見えない。**
あちらは「リポジトリの中で」解決するかを見るので、
`../../LICENSE` はリポジトリのルートに実在して通ってしまう。
**同じリンクが、見る場所によって生きているか死んでいるかが変わる。**

`pack:check` は 2 つのパッケージで別々に持っている（「rig に入れるもの /
入れないもの」）。共通化していないので同じコードを 2 度書いたが、
検査の対象が「そのパッケージの出荷物」なのでそれで正しい。

## リリースワークフローの名前とタグは、接続を作り直すときに揃える

**2026-09-10。** `release.yml` を `release-monosashi.yml` に、
タグを `v*` から `monosashi-v*` に変えた。

**タグを変えたのは、モノレポでは `v*` がどのパッケージのものか言えないから。**
`v0.4.0` を見て monosashi のことだと分かるのは経緯を知っている人だけ。
`kisekae-v*` と並べたときに片方だけ前置が無いのは、
「monosashi が特別」という意味に読める。特別ではない。

**ワークフロー名を変えられたのは、リポジトリ改名で Trusted Publisher を
どうせ作り直すから。** 紐づけは owner / repository / workflow filename の 3 つで、
repository が変わる時点で作り直しが必要になる。同じ 1 回の作業に
ファイル名の変更を乗せれば追加コストがゼロ。

**別の日にやると npmjs.com を 2 度開くことになる。** しかも貼り直し忘れは
**次に publish しようとした瞬間まで気づけない**（npm はエラーを publish 時にしか出さない）。
名前を変えるなら、変えるものを全部同時に変える。

タグの前置そのものは紐づけに含まれないので、いつでも変えられる。
**変えにくいのはワークフローのファイル名の方**という非対称がある。

## パッケージ名を monosashi から tsumekae に変えた

**2026-09-11。** `monosashi` 0.4.0 を最後に、`tsumekae` 0.1.0 として出し直す。

**理由はリポジトリ名と同じ層を指していたから。**

| | 名前が指していたもの |
|---|---|
| `jissoku`（リポジトリ） | 方法論（推測ではなく実測で型を書く） |
| `monosashi` | **方法論の比喩（測る道具）── リポジトリと同じ層** |
| `kisekae` | パッケージの仕事（フォーム定義を整形する） |
| `rig` | 役割（足場）。**実際に「測る道具」なのはこれ** |

`kisekae` だけが「何をするか」で名付けられていて、`monosashi` は
「このリポジトリがどういう前提か」で名付けられていた。
しかも**測っているのは `rig` と `e2e/` と `src/probe/`** で、
`monosashi` はその成果物。道具の名前が成果物に付いていた。

`tsumekae`（詰め替え）は変換関数がやっていることの直訳で、
`kisekae` と韻も軸も揃う。**同じ中身を別の容器に移す**
── `toRestWrite` / `toSetRecord` はまさにそれで、
「書き込みは REST と `set()` で要件が違う」は**容器ごとに詰め方が違う**と読める。

### 0.4.0 の続きではなく 0.1.0 から始める

npm 上は別のパッケージなので、版を引き継ぐ理由がない。
`monosashi` 0.4.0 の利用者から見ると、`tsumekae` 0.1.0 は**中身が同じ別物**。
版を 0.5.0 から始めると「0.4.0 からの続き」に見えて、
npm 上に 0.1.0〜0.4.0 が無いことの説明が要る。

### 初回公開は OIDC が使えない

[新しいパッケージの初回公開は monosashi の前例が通らない](#2026-09-10-新しいパッケージの初回公開は-monosashi-の前例が通らない)
と同じ壁を踏む。**その手順は 2027-01 以降は使えなくなる**ので、
改名するなら今しかなかった、というのが時期を決めた理由でもある。

| | |
| --- | --- |
| ワークフロー | `release-monosashi.yml` を `release-tsumekae.yml` にリネーム |
| タグ | `monosashi-v*` → `tsumekae-v*` |
| Trusted Publisher | **初回 publish のあとに npmjs.com で作る**（パッケージが存在しないと設定できない） |
| 旧パッケージ | `npm deprecate monosashi "renamed to tsumekae"` を人が実行する |

`release-monosashi.yml` は消した。`monosashi` はもう publish しないので、
残しても `packages/monosashi` が無くて失敗するだけになる。

