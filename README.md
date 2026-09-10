# kintone の型を実測する

kintone が実際に返す形を測り、それを根拠に型を書く。

| | |
|---|---|
| [monosashi](packages/monosashi) | レコードの値の型・変換関数・型ガード |
| [kisekae](packages/kisekae) | フォーム定義を整形して返す |

どちらも**実行時依存を持たない**。`@kintone/rest-api-client` は
型の突き合わせにだけ使う devDependency で、公開する `.d.ts` からは参照しない。
それを `pack:check` が毎回、依存の実体で確かめている。

## なぜ実測が要るのか

推測で書いた型は外れる。同じフィールドでも、どこから取得したかで
`value` の型が違う。

| type | JS API（保存済み） | JS API（編集中） | REST |
|---|---|---|---|
| `SINGLE_LINE_TEXT` | `string` | `string \| undefined` | `string` |
| `DROP_DOWN` | `string` | `string \| undefined` | `string \| null` |

フォーム定義でも、公式の型が外れている箇所が実測で見つかっている
（`LABEL` / `HR` は `elementId` を返すが、型には宣言が無い）。

## 構成

| | |
|---|---|
| `packages/monosashi` | 公開。レコード |
| `packages/kisekae` | 公開。フォーム定義 |
| `packages/rig` | 非公開。認証・クライアント・実行の入口を 2 つで共有する |

検証アプリは 1 つで、2 つのパッケージが同じアプリを測る。

## 検査

```sh
pnpm run check
```

実 kintone に接続しない。凍結したフィクスチャに対してだけ走るので数秒で終わる。
実物との乖離は週次のライブ検証（`.github/workflows/live.yml`）が検出し、
差分が出たらフィクスチャ更新 PR を立てる。

## 手を入れる

[CONTRIBUTING](CONTRIBUTING.md) に共通の手順（セットアップ / 認証情報 /
検査 / 依存 / 公開）。パッケージ固有の手順は各パッケージにある。

| | |
|---|---|
| [monosashi](packages/monosashi/CONTRIBUTING.md) | レコードの実測。検証アプリの構築と採取カスタマイズ |
| [kisekae](packages/kisekae/CONTRIBUTING.md) | フォーム定義の実測 |

## ライセンス

[MIT](LICENSE)
