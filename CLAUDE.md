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

## 実行してはいけないこと

| | 理由 |
|---|---|
| `pnpm publish`（`--dry-run` 込み） | 既定レジストリが社内プロキシに向いており、出力ゼロのまま固まる |
| `fixtures/measured.json` を手で編集 | 実測の根拠が実測でなくなる |
| `pnpm run app:deploy-probe` を勝手に実行 | kintone のシステム管理権限が要り、組織全体に効く |
| `ncu -u` 後に `packageManager` を確認せず放置 | pnpm 本体が入れ替わる。`.ncurc.json` で除外済みだが確認はする |

実 kintone に接続するコマンド（`e2e` / `app:*` / `probe:write` / `probe:converter`）は
認証情報が要り、実際のアプリを操作する。**依頼されていなければ実行しない。**

## 直してはいけない「重複」

`src/types/field.ts` の型、`VALUE_SHAPE`、`src/guard/record.ts` のガード、
`src/build/field.ts` の構築子は、**全 28 種別をそれぞれ書き下している**。

これは意図的な重複。条件型で導出するとホバー表示とエラーメッセージが壊れる
（kintone-typeguard が失敗した道）。**DRY にまとめない。**

ずれは `test/fieldTypes.ts` を軸に `test/coverage.test.ts` と
`test/coverage.test-d.ts` が縛っている。種別を足すときは 4 箇所すべてに書く。

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

## 判断を記録する

設計判断・実測で判明した制約・**測り方を間違えた記録**は
[`docs/DECISIONS.md`](docs/DECISIONS.md) に残す（1200 行超）。

新しい判断をしたら、実装だけでなくここに追記する。
特に「試したが捨てた」ものは、同じ道を再び通らないために書く。

## 構成

| | |
|---|---|
| `src/types/` | 型の定義。`field` / `record` / `event` / `rest` / `loose` |
| `src/guard/` | 型ガード |
| `src/build/` | `field.*` の構築子と `setValue` |
| `src/convert/` | JS API → REST の変換 |
| `src/probe/` | 実測の採取カスタマイズ（ブラウザで動く） |
| `test/` | 種別の網羅とフィクスチャ突き合わせ |
| `tools/fixture/` | 採取結果の正規化 |
| `tools/fixture-app/` | 検証アプリの構築・検証・probe の配備 |
| `tools/package/` | `pack:check` |
| `e2e/` | Playwright。実 kintone を操作して採取する |
| `fixtures/measured.json` | 実測データ。型の唯一の根拠 |

## コミット

Conventional Commits の型（`feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `revert`）に
日本語の説明を続ける。破壊的変更は `feat!:`。

```
feat: 削除イベントを実測する（#7）
fix: 計算フィールドの計算を待ってから採る
chore: ncu に packageManager を触らせない
```

本文には**何をしたか**より**なぜそうしたか・何を確かめたか**を書く。
