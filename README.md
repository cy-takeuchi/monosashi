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

型・変換・構築 / 代入・ガード・定期ライブ検証まで完成。
**残るのは npm 公開の器（#3）と、実プロジェクトへの適用（#5）。**

実測の状況:

- `fixtures/measured.json` に **82 サンプル / 67 文脈**。e2e が実 kintone から採る
- **フィールド種別 28 種**すべてに裏づけがある
  （`GROUP` と `REFERENCE_TABLE` は「レコードには現れない」ことを確かめた上で除外）
- **採取対象の 30 イベントすべて**に裏づけがある。
  作成 / 詳細 / 編集 / 一覧 / 印刷 / モバイル、
  `submit` / `change` / プロセス管理 / インライン編集 / 削除
- 2 回続けて実行すると**バイト単位で同じ結果**になる。
  だから差分が出たら「kintone が変わった」と言える

### 実測が型の主張を否定した例

「PC と同形だろう」で書いていた型は、実際に測ると 5 つ外れた。

| 書いてあったこと | 実測 |
| --- | --- |
| モバイルの編集画面も `Saved` | **`Editing`**。値の無いフィールドが `undefined` |
| 一覧のインライン編集は編集画面と同形 | `recordId` が**文字列**。`submit` と `change` は `appId` まで文字列 |
| `process.proceed` は `appId` / `recordId` を持つ | **持たない**。`action` / `status` / `nextStatus` は `{ value: string }` |
| 削除は `record` を持たない | **持つ**（37 フィールドの `Saved` レコード） |
| `change` は画面によらず同形 | `create` は `recordId` 無し / `edit` は number / `index.edit` は string |

一方で、印刷画面が詳細画面と一致することや、
モバイルの `submit` / `change` / `process` が PC と同形であることも実測で確かめた。
**同形だと思えることも、違うはずだということも、根拠にならない。**

## 使う

> [!NOTE]
> **まだ npm に公開していない**（[#3](../../issues/3)）。
> 今は `pnpm pack` した tarball を参照するか、リポジトリを直接指定して使う。
> 公開の器（`version` / `LICENSE` / `repository` / `publishConfig`）は整えてある。

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
| `SavedRecord` / `EditingRecord` | レコード型。取得元で `value` の型が違う |
| `Saved` / `Editing` | フィールド型の名前空間 |
| `kintone-record/rest` の `RestRecord` / `Rest` | REST API の型。**本体には含まれない**（下記） |
| `EventOf<"app.record.detail.show">` | イベント名から event の形を引く |
| `toUpdateParams` / `toAddParams` | REST に渡すパラメータを作る |
| `toRestWrite` / `toRest` | 変換の下位 API |
| `field.*` | フィールドの構築 |
| `setValue` / `canSetValue` | 型安全な代入 |
| `guard.*` | 型ガード |

### REST の型は別経路にある

```ts
import type { Rest, RestRecord } from "kintone-record/rest";
```

`Rest` / `RestRecord` / `RestRecordWithMeta` だけは
`@kintone/rest-api-client` を必要とする（その型を Canonical として使うため）。
本体に置くと、**型しか使わない利用者にも実行時依存が付いてくる**
（7MB / axios ほか 5 個）。kintone カスタマイズはブラウザ側だけのことが多く、
その大半は REST クライアントを必要としない。

そのため

- `@kintone/rest-api-client` は **optional な peerDependency**
- 本体（`kintone-record`）は一切依存しない
- REST の型を使うときだけ `kintone-record/rest` から読み、
  `@kintone/rest-api-client` を自分で入れる

> [!WARNING]
> **入れずに `kintone-record/rest` を読むと、型が `any` に落ちる。**
> `skipLibCheck: true`（TypeScript の既定）だとエラーにならない（実測）。
> この経路を使うなら必ず入れること。
> `pack:check` がこの挙動を毎回確かめている。

本体の `.d.ts` から参照が消えたので、`skipLibCheck: false` の利用者が
`@types/node` を要求されることも無くなった
（rest-api-client の `.d.ts` が `https` / `Buffer` / `stream` を使うため）。

### 公開前に、利用者の立場で確かめる

```sh
pnpm run pack:check
```

`pnpm pack` した tarball を空のプロジェクトに入れ、
**`kintone-record` という名前で**読めるかを確かめる。kintone には接続しない。

`build:check`（`test/dist/consumer.ts`）は `.d.ts` の劣化を捕まえるが、
`../../dist/index` と**相対パスで**読んでいるので

- `exports` マップ
- `files` に入れ忘れたファイル
- `moduleResolution` の違い（`bundler` / `nodenext`）
- 実行時に読み込めるか
- `@kintone/rest-api-client` が**入らない**こと（optional な peer なので）

を通らない。実際、`exports` から `./kintone` を消しても `build:check` は緑のまま、
`pack:check` は落ちることを確認してある。

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
足さないと、その採取を将来落としてもテストが緑のまま根拠だけ消える。

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

## ドキュメント

- [設計判断の記録](docs/DECISIONS.md) — 何を決めたか、そして**何を捨てたか、なぜ捨てたか**。
  実測で判明した kintone / API の制約と、
  **測り方を間違えた記録**（何を根拠と誤認したか）もここにまとめてある。
- [`fixtures/measured.json`](fixtures/measured.json) — 型の唯一の根拠。e2e が採り直せる
- [`fixtures/write-behavior.md`](fixtures/write-behavior.md) — REST 書き込みの受け入れ挙動（20 ケース）
- [`test/contexts.ts`](test/contexts.ts) — 採取が満たすべき下限。
  「この採取が無いと、どの主張の根拠が消えるか」を 1 件ずつ書いてある

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

## ライセンス

[MIT](LICENSE)
