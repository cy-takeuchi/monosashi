# kintone-record

実測に基づく kintone レコードの型・変換関数・型ガード。

`@kintone/dts-gen` の `kintone.d.ts` は `kintone.app.record.get()` も
`kintone.events.on()` のハンドラ引数も `any` で、レコード周りの型を提供していない。
`@kintone/rest-api-client` は REST API の型しか持たない。
そのため実務では JS API・`event.record`・REST API の3経路が混ざり、
境界のたびに `as` が必要になる。

このリポジトリはその3経路の実際の値を**測定した上で**型を書き、
境界の変換を関数として提供することを目的とする。

## 現在地

実測 → 型 → 変換 → 構築 / 代入 → ガード → パッケージまで完成。
残るのは定期ライブ検証。

- [x] 検証アプリの REST 構築スクリプト
- [x] 実測採取カスタマイズ
- [x] 差分レポート生成
- [x] シリアライザのテスト
- [x] 実測の実施（84 サンプル + REST 書き込み挙動 20 ケース）
- [x] フィールド型・レコード型（`Saved` / `Editing` / `Rest`）
- [x] イベント型（`KintoneEventMap`）と `kintone.d.ts` のレコード周り
- [x] 変換関数（`toRestWrite` / `toRest`）
- [x] 構築 API（`field.*`）・代入 API（`setValue`）
- [x] 型ガード（`guard.*`）
- [x] パッケージのビルド（`pnpm pack` して別プロジェクトから利用できることを確認済み）
- [x] 種別の網羅を突き合わせるテスト（`test/coverage.test.ts`）
- [x] ビルド成果物に対する型検査（`build:check`）
- [x] Playwright による採取（2 回の実行がバイト単位で一致することを確認済み）
- [x] 実測の根拠を e2e 採取に置き換え
- [x] 定期ライブ検証のワークフロー（`.github/workflows/live.yml`。Secrets の設定待ち）

## 使う

```sh
pnpm add kintone-record
```

```ts
// kintone グローバルの型はこの副作用 import で有効になる。プロジェクトに 1 回だけ書く
import "kintone-record/kintone";

import { field, guard, setValue, toUpdateParams } from "kintone-record";

kintone.events.on("app.record.detail.show", (event) => {
  event.recordId;  // number
  event.record;    // SavedRecord
  return event;
});

// JS API で取得したレコードを REST API に渡す
const got = kintone.app.record.get();
if (got !== null) {
  setValue(got.record, "数値", "42");
  await client.record.updateRecord(toUpdateParams(app, got.record));
}
```

### グローバル型を明示的に取り込む理由

`kintone-record` を import しても `kintone` グローバルは型付けされない。
有効にするには `kintone-record/kintone` を明示的に import する。

ライブラリが利用者のグローバルスコープを勝手に書き換えないため。
`toRestWrite` や `field.*` は `@kintone/rest-api-client` と組み合わせて
サーバサイドでも使えるが、そこで `kintone` グローバルが生えていると

```ts
kintone.events.on(...)   // 型は通る。実行時は kintone is not defined
```

が**コンパイルを通ってしまう**。存在しないものを型が保証する状態になり、
このライブラリの目的と正反対になる。

`@kintone/dts-gen` の `kintone.d.ts` と併用しても壊れない。
`tsconfig` の `include` の順に関わらず、こちらの型が優先されることを確認済み
（`kintone.events.on` と `kintone.app.record.get` の両方）。

### API

| | 用途 |
|---|---|
| `SavedRecord` / `EditingRecord` / `RestRecord` | レコード型。取得元で `value` の型が違う |
| `Saved` / `Editing` / `Rest` | フィールド型の名前空間（`Rest` は `@kintone/rest-api-client` の型そのもの） |
| `EventOf<"app.record.detail.show">` | イベント名から event の形を引く |
| `toUpdateParams` / `toAddParams` | REST に渡すパラメータを作る |
| `toRestWrite` / `toRest` | 変換の下位 API |
| `field.*` | フィールドの構築 |
| `setValue` / `canSetValue` | 型安全な代入 |
| `guard.*` | 型ガード |

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

```sh
# 以下の kintone に接続するコマンドは、op を使う場合すべて
#   op run --account <アカウント> --env-file=.env -- <コマンド>
# の形で実行する

# 1. 検証アプリを構築（測定用アプリ + ルックアップ参照先アプリ + テストレコード）
#    完了後 .env に FIXTURE_APP_ID / FIXTURE_LOOKUP_APP_ID が書き込まれる
pnpm run app:build

# 2. カテゴリー設定を手動で有効化
#    kintone にカテゴリー設定の REST API は存在しないため、ここだけ手作業
#    アプリ設定 → カテゴリー → 有効化

# 3. 構成を検証（カテゴリー設定漏れ・ルックアップ未実行などを検出）
pnpm run app:verify

# 4. 採取カスタマイズをビルドしてアプリに適用
pnpm run probe:build
pnpm run app:deploy-probe

# 5. ブラウザで各画面を開いて採取
#    ヘッダに操作パネルが出る

# 6. エクスポートした JSON を fixtures/raw/ に置いてレポート生成
pnpm exec tsx tools/analyze/report.ts
```

### 採取の進め方

各画面のヘッダに出るパネルで操作する。

| 操作 | 内容 |
|---|---|
| ラベル欄 | `未入力` / `入力済み` などを入れる。分析時の突き合わせに使う |
| JS API で採取 | `kintone.app.record.get()` の結果を採る |
| REST で採取 | 同じレコードを REST `getRecord` で採る |
| 両方採取 | 上記2つを続けて実行。**同一レコードでの突き合わせが目的なのでこれを推奨** |
| カバレッジ | 採取済みの (イベント, 経路) の組を console に出す |
| エクスポート | 蓄積した全サンプルを1ファイルでダウンロード |

`event.record` は `kintone.events.on` のハンドラ内で自動的に採取される
（`kintone.app.record.get()` はハンドラ内では動作しないため、経路を分けている）。

採取すべき文脈は、作成 / 詳細 / 編集 / 一覧 / 印刷 の各画面 ×
`event.record` / JS API / REST、それぞれで未入力レコードと入力済みレコードの両方。
`submit`・`submit.success`・`change.<field>`・インライン編集も対象。

## ドキュメント

- [設計判断の記録](docs/DECISIONS.md) — 何を決めたか、そして**何を捨てたか、なぜ捨てたか**。
  実測で判明した事実（現行の型が書き込みを検査していないこと等）と、
  調査済みの kintone / API の制約もここにまとめてある。

## 設計上の要点

### `JSON.stringify` を使わない

```js
JSON.stringify({ error: undefined }) === "{}"   // キーが消える
```

測定目的は `disabled?` / `error?` / `$id?` が optional かどうかの判定、
つまり**キーの有無そのもの**。素朴なダンプでは目的が最初の一手で壊れる。
`src/probe/serialize.ts` は `Object.keys()` でキー集合を保持し、
各値を種別つきで包むことで `undefined` / `null` / `""` / `[]` を区別する。

### 採取と分析を分離する

ブラウザ側は生データの採取のみを行い、スキーマ化・型生成は
`tools/analyze/` の Node スクリプトが担当する。
これにより採取カスタマイズを再アップロードせずに分析だけ何度でも回せる。

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

## ライセンス

MIT
