# ツールチェーンの判断

リポジトリ全体に効く判断。パッケージ固有のものは各
`packages/*/docs/DECISIONS.md`。

> **移行中。** monosashi の `docs/DECISIONS.md` にある環境・ツールチェーンの記述
> （pnpm / publish / ncu / Secret / Actions / TypeScript 2 版検査）は、
> まだ移していない。ここには**モノレポ化で新しく決めたこと**だけがある。

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
既存の `v*` タグと `.github/workflows/release.yml` というパスを変えなければ、
monosashi の接続がそのまま生きる。

リポジトリ名を変える場合は npmjs.com で接続を貼り直す。
**失敗するのは次に publish しようとした瞬間**なので、改名とリリースを
同じ日にやらないと原因が分からなくなる。

## パッケージは 3 つ。共有するのは足場だけ

| | 公開 | 中身 |
|---|---|---|
| `packages/monosashi` | する | レコード。検証アプリの定義もここ |
| `packages/kisekae` | する | フォーム定義 |
| `packages/rig` | **しない** | 認証・kintone クライアント・実行の入口 |

### rig に入れるもの / 入れないもの

**入れたのは 5 つだけ**（`env` / `repoRoot` / `client` / `describeError` / `run`）。

**検証アプリの構築（`tools/fixture-app/`）は monosashi に残した。**
アプリの定義はレコードの実測が主な用途で、kisekae は建ったアプリを読むだけ。
共有しているのは**建っているアプリそのもの**で、定義するコードではない。

**`pack:check` も共有しない。** 土台（pack → 空プロジェクトへ install →
依存の実体を確かめる → 2 モード × 2 バージョンで型検査）は共通だが、
**シナリオが別物**。monosashi の 507 行のうち大半は利用者側のソースを
文字列で埋め込んだシナリオで、25 箇所が monosashi 固有だった。
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
monosashi は移行前から `.gitignore` に `/dist`（先頭スラッシュ）と書いて
この罠を避けていた。モノレポではその手が使えないので、階層を明示する。

**`biome.json` は JSON でコメントを置けない。** 理由はここに書く。

移行で実際に 1 件踏んだ。`biome.json` の `"!fixtures"` はルート直下前提で、
`packages/*/fixtures` に移った 4.6 MiB の `measured.json` を
biome が処理しようとして警告が出た（`--error-on-warnings` なので落ちる）。

## リリースはタグの前置で分ける

| パッケージ | タグ | ワークフロー |
|---|---|---|
| monosashi | `v*` | `release.yml`（**変えない**） |
| kisekae | `kisekae-v*` | `release-kisekae.yml` |

**1 つのワークフローで両方を publish しない。** Trusted Publishing の接続が
workflow filename に紐づくので、片方の接続を触るためにもう片方も
貼り直すことになる。

`release.yml` のファイル名とタグの形は monosashi の既存の接続が
紐づいているので**動かさない**。kisekae は新規なのでどうせ新しく登録する。

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
