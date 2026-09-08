# CLAUDE.md

kintone レコードの型・変換関数・型ガードを提供する npm パッケージ `monosashi`。

**日本語で書く。** コード内のコメント、ドキュメント、コミットメッセージ、
PR の説明、そして応答のすべて。

## 最優先の原則: 型に書く前に測る

このリポジトリの型は推測ではなく**実測**に基づく。
「PC と同形だろう」で書いた型は実際に 5 つ外れている（README の「なぜ実測が要るのか」）。

**根拠のない型を書いてはいけない。** 新しい型・新しいフィールド種別・
新しいイベントを足すときは、先に `fixtures/measured.json` に該当する実測があるかを確認する。
無ければ、採取を足して測ってから型を書く（手順は CONTRIBUTING.md の「実測の手順」）。

`fixtures/measured.json` が型の唯一の根拠。ここを手で編集しない。
`pnpm run e2e` → `pnpm run fixture:build` で生成する。

## 検査

```sh
pnpm run check
```

**これがすべて。** CI（`.github/workflows/check.yml`）が走らせるのもこれだけ。
中身は Biome / `tsc --noEmit` / vitest（`--typecheck` 込み）/ `probe:build` / `pack:check`。
実 kintone に接続しないので数秒で終わる。

CI のワークフローにステップを並べない。定義は `package.json` の `check` 1 箇所に置く。

`biome:check` は `--error-on-warnings` 付き。**警告でも落ちる**
（付ける前は死んだコードが緑のまま通っていた）。

ただし biome が見るのは**ファイル内**の未使用まで。
**export した先が無いこと**は `test/deadExports.test.ts` が見ている
（足した時点で 1 度も呼ばれていない export が 2 つあった）。

## 実行してはいけないこと

| | 理由 |
|---|---|
| `pnpm publish`（`--dry-run` 込み） | 既定レジストリが社内プロキシに向いており、出力ゼロのまま固まる。npm に置くのは `v*` タグで `release.yml` だけ（`pnpm stage publish`）。公開は人間が 2FA で承認する |
| `fixtures/measured.json` を手で編集 | 実測の根拠が実測でなくなる |
| `pnpm run app:deploy-probe` を勝手に実行 | kintone のシステム管理権限が要り、組織全体に効く |
| `ncu -u` 後に `packageManager` を確認せず放置 | pnpm 本体が入れ替わる。`.ncurc.json` で除外済みだが確認はする |
| `typescript` だけ上げて `typescript-5.9` を放置 | `pack:check` が両版で `dist` を検査している。片方だけ上げるとずれる |

実 kintone に接続するコマンド（`e2e` / `app:*` / `probe:write` / `probe:converter`）は
認証情報が要り、実際のアプリを操作する。**依頼されていなければ実行しない。**

## 実測とドキュメントを混ぜない

`src/kintone.ts` は公式ドキュメントの **166 API すべて**を宣言するが、
**実測が根拠なのは 4 個だけ**（`events.on` の event と `record.get` / `set` のレコード）。
残りはドキュメントを読んで書いたもので、**返る値の形は確かめていない**。

ドキュメント由来の型は `src/types/jsApi.ts` の `Api` 名前空間に分けてある。
**測っていないものを、測ったふりで書かない。** JS API を足すときは
どちらの根拠かを JSDoc に書く（実測なら採り直す、ドキュメントなら読み直す）。

一覧は `test/jsApi.ts` が持ち、`test/jsApi.test.ts` が宣言と突き合わせる。

## 直してはいけない「重複」

`src/types/field.ts` の型、`VALUE_SHAPE`、`src/guard/record.ts` のガード、
`src/build/field.ts` の構築子は、**全 28 種別をそれぞれ書き下している**。

これは意図的な重複。条件型で導出するとホバー表示とエラーメッセージが壊れる
（kintone-typeguard が失敗した道）。**DRY にまとめない。**

ずれは `test/fieldTypes.ts` を軸に `test/coverage.test.ts` と
`test/coverage.test-d.ts` が縛っている。種別を足すときは 4 箇所すべてに書く。

## 書き込みは REST と `set()` で要件が違う

`toRestWrite` と `toSetRecord` は**同じ実装を使い回さない**。
落とすべきものが実測で違う（`fixtures/write-behavior.md` / `fixtures/set-behavior.md`）。

| | REST | `set()` |
|---|---|---|
| 落とすのが必須 | 読み取り専用 8 種別 | **`CATEGORY` だけ** |
| 行 `id` | 落とすと行が置き換わる | 落としても保たれる |
| `type` | 付けない | **必ず付ける** |

`REJECTED_ON_WRITE` を流用すると `set()` では厳しすぎ、逆は緩すぎる。
片方を直したときにもう片方も直したくなるが、**根拠が別**。

## 守備範囲を広げない

**フォーム定義（`getFormFields` / `getFormLayout`）は対象外。**
`kintone-typeguard` の `guardFormField` / `guardFormLayout` は引き取らない
（DECISIONS「フォーム定義は守備範囲に入れない」）。

レコードの値とは判別する対象が違い、種別の集合も違う
（`GROUP` / `REFERENCE_TABLE` / `LABEL` / `SPACER` / `HR`）。
`Api.FormField` は共通部分だけの緩い型に留める。**種別ごとに書き下さない。**

## 実行時依存を増やさない

このパッケージは実行時の依存を持たない。`pack:check` が毎回確かめている。
`@kintone/rest-api-client` は **devDependency のみ**で、
`src/types/rest.ts` の等価性検証（`src/types/rest.test-d.ts`）にだけ使う。
`src/` から import しない。

`Rest` / `RestRecord` / `RestRecordWithMeta` はルート（`monosashi`）から出る。
サブパスの `exports` は `.` と `./kintone` の 2 つだけ。

## グローバル型は副作用 import でだけ有効にする

`src/kintone.ts`（`monosashi/kintone`）が `kintone` グローバルを宣言する。
**本体（`src/index.ts`）から `declare global` を生やさない。**
サーバサイドで使ったときに、存在しない `kintone` をコンパイルが通してしまう。

## 採取コード（`src/probe/`）の制約

- **`JSON.stringify` を使わない。** `{ error: undefined }` がキーごと消える。
  測定目的は optional かどうか、つまりキーの有無そのもの。
  `src/probe/serialize.ts` が `Object.keys()` でキー集合を保持する
- **採取と正規化を分ける。** ブラウザ側は生データの採取だけ。
  環境依存値を伏せるのは Node 側（`tools/fixture/normalize.ts`）
- 正規化はフィールドの**コードではなく `type` で判定する**（組み込みのコードは言語で変わる）
- 採取コードを二重に持たない。`probe-dist/probe.js` が唯一の成果物
- **`set()` の失敗は例外にならない。** kintone が画面にエラーを出すだけで
  呼び出し元には何も返らない。try/catch では何も測れない。
  判定は e2e が画面を見て行う（`e2e/panel.ts`）
- **probe を変えたら貼り直す。** `app:check-probe` が配信物のハッシュを
  比べているので、貼り直すまで週次のライブ検証が失敗する

## 判断を記録する

設計判断・実測で判明した制約・**測り方を間違えた記録**は
[`docs/DECISIONS.md`](docs/DECISIONS.md) に残す（2500 行超）。

新しい判断をしたら、実装だけでなくここに追記する。
特に「試したが捨てた」ものは、同じ道を再び通らないために書く。

## 構成

| | |
|---|---|
| `src/types/` | 型の定義。`field` / `record` / `event` / `rest` / `loose` |
| `src/guard/` | 型ガード |
| `src/build/` | `field.*` の構築子と `setValue` |
| `src/convert/` | REST / `set()` への変換。**落とす対象が違う** |
| `src/probe/` | 実測の採取カスタマイズ（ブラウザで動く） |
| `src/kintone.ts` | `kintone` グローバルの宣言。公式 166 API |
| `src/types/jsApi.ts` | JS API の値の型。**根拠はドキュメント**。DOM を直接参照しない |
| `test/` | 種別の網羅とフィクスチャ突き合わせ |
| `tools/fixture/` | 採取結果の正規化 |
| `tools/fixture-app/` | 検証アプリの構築・検証・probe の配備 |
| `tools/package/` | `pack:check` |
| `e2e/` | Playwright。実 kintone を操作して採取する |
| `fixtures/measured.json` | 実測データ。型の唯一の根拠 |
| `fixtures/write-behavior.md` | REST 書き込みの受け入れ挙動（20 ケース） |
| `fixtures/set-behavior.md` | `set()` の受け入れ挙動（22 ケース） |

## コミット

Conventional Commits の型（`feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `revert`）に
日本語の説明を続ける。破壊的変更は `feat!:`。

```
feat: 削除イベントを実測する（#7）
fix: 計算フィールドの計算を待ってから採る
chore: ncu に packageManager を触らせない
```

本文には**何をしたか**より**なぜそうしたか・何を確かめたか**を書く。
