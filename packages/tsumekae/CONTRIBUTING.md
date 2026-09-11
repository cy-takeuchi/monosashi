# 開発する（tsumekae）

**tsumekae 固有の手順**。共通の手順は
[リポジトリのルートの CONTRIBUTING](../../CONTRIBUTING.md) にある
（セットアップ / 認証情報 / スペース / 検査 / 依存 / 公開）。
**利用するだけなら読む必要はない**（使い方は [README](README.md)）。

このパッケージが測るのは**レコードの値**。
検証アプリの構築と採取カスタマイズもここにある（kisekae は建ったアプリを読むだけ）。

- [実測の手順](#実測の手順)
- [公開の器を確かめる（pack:check）](#公開の器を確かめるpackcheck)
- [公開する](#公開する)
- [設計上の要点](#設計上の要点)

判断の記録は [`docs/DECISIONS.md`](docs/DECISIONS.md)。
何を決めたか、**何を捨てたか、なぜ捨てたか**、
そして**測り方を間違えた記録**が入っている。

## 実測の手順

kintone に接続するコマンドの実行の形は
[ルートの CONTRIBUTING](../../CONTRIBUTING.md#実-kintone-に接続するコマンドの形)。

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

## 公開の器を確かめる（`pack:check`）

```sh
pnpm run pack:check
```

`pnpm pack` した tarball を空のプロジェクトに入れ、
**`tsumekae` という名前で**読めるかを確かめる。kintone には接続しない。

`build:check`（`test/dist/consumer.ts`）は `.d.ts` の劣化を捕まえるが、
`../../dist/index` と**相対パスで**読んでいるので

- `exports` マップ
- `files` に入れ忘れたファイル
- `moduleResolution` の違い（`bundler` / `nodenext`）
- 実行時に読み込めるか
- `@kintone/rest-api-client` が**入らない**こと（optional な peer なので）

を通らない。実際、`exports` から `./kintone` を消しても `build:check` は緑のまま、
`pack:check` は落ちることを確認してある。

## 公開する

手順と npmjs.com 側の設定は
[ルートの CONTRIBUTING](../../CONTRIBUTING.md#公開する)。
tsumekae 固有なのは次の 2 つだけ。

| | |
|---|---|
| タグ | **`tsumekae-v*`**（`v*` ではない。モノレポではどちらのパッケージか言えないため） |
| ワークフロー | `.github/workflows/release-tsumekae.yml` |

```sh
vim packages/tsumekae/package.json      # version を上げる
git commit -am "chore(tsumekae): 0.3.1"
git tag -a tsumekae-v0.3.1 -m "tsumekae 0.3.1"
git push origin main && git push origin tsumekae-v0.3.1
```

承認は https://www.npmjs.com/package/tsumekae で行う。

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
