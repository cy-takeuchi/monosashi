# CLAUDE.md

実測に基づく kintone の型のモノレポ。

| | |
|---|---|
| `packages/monosashi` | レコードの値の型・変換関数・型ガード（公開） |
| `packages/kisekae` | フォーム定義を整形して返す（公開） |
| `packages/rig` | 実測の足場。認証・クライアント・実行の入口（**公開しない**） |

**各パッケージにも `CLAUDE.md` がある。** そこで作業するときは両方が効く。
このファイルには**両方に効くこと**しか書かない。

**日本語で書く。** コード内のコメント、ドキュメント、コミットメッセージ、
PR の説明、そして応答のすべて。

## 最優先の原則: 型に書く前に測る

このリポジトリの型は推測ではなく**実測**に基づく。

**根拠のない型を書いてはいけない。** 新しい型・新しいフィールド種別を
足すときは、先に該当する実測があるかを確認する。無ければ採って測ってから書く。

| 根拠 | 場所 |
|---|---|
| レコードの値 | `packages/monosashi/fixtures/measured.json` |
| フォーム定義 | `packages/kisekae/fixtures/form/definition.json` |

実測データを手で編集しない。採取スクリプトで生成する。

**測った範囲より広いことを書かない。** キーの存在を確かめて値の意味まで
結論した記述が実際に 1 つあり、実測で否定された
（`packages/monosashi/docs/DECISIONS.md`「enabled は使える」）。
実測の記述には**何を確かめたのか**を書く。

## 根拠は 3 つの機構で縛る

| | 根拠 | 落ちたときにどうするか |
|---|---|---|
| 実測が正 | フィクスチャ | 型を直す |
| ドキュメントが正 | `@kintone/rest-api-client` の型 | 実測していない箇所なので合わせる |
| 乖離の検出 | `*.test-d.ts` の `toEqualTypeOf` | **どちらが正しいかを実測で決めて、結果を式に書く** |

3 つめは正しさの判定ではなくトリップワイヤ。
**逃げ道（許容リスト）は作らない。** 既知の乖離は交差型で式の中に書く
（`packages/kisekae/src/types/raw.test-d.ts` の `PatchedLabel`）。

## 検査

```sh
pnpm run check
```

**これがすべて。** CI（`.github/workflows/check.yml`）が走らせるのもこれだけ。
中身は biome（ルートで 1 回）→ 各パッケージの `check`。
実 kintone に接続しないので数秒で終わる。

CI のワークフローにステップを並べない。定義は `package.json` の `check` に置く。

## 実行してはいけないこと

| | 理由 |
|---|---|
| `pnpm publish`（`--dry-run` 込み） | 既定レジストリが社内プロキシに向いており、出力ゼロのまま固まる。npm に置くのはタグを打ったときのワークフローだけ。公開は人間が 2FA で承認する |
| 実測データを手で編集 | 実測の根拠が実測でなくなる |
| `app:deploy-probe` を勝手に実行 | kintone のシステム管理権限が要り、組織全体に効く |

実 kintone に接続するコマンド（`e2e` / `app:*` / `probe:*` / `fixture:form` の採取側）は
認証情報が要り、実際のアプリを操作する。**依頼されていなければ実行しない。**

認証情報の渡し方は `packages/monosashi/CONTRIBUTING.md`。

## 検証アプリは 1 つ

**2 つのパッケージが同じアプリを測る。** 定義は
`packages/monosashi/tools/fixture-app/`（レコードの実測が主な用途なのでそこにある）。
kisekae は建ったアプリを読むだけ。

そのため**ライブ検証は 1 つのワークフローに直列で入れ、concurrency を共有する**。
分けると `app:build` が採取中に走る事故が「たまに落ちるジョブ」として現れる。

kisekae が必要としてレイアウトに足したもの（`SPACER` / `LABEL` / `HR`）は
レコードに現れないので monosashi の実測には影響しない。

## リリース

タグの前置でパッケージを分ける。

| パッケージ | タグ | ワークフロー |
|---|---|---|
| monosashi | `monosashi-v*` | `release-monosashi.yml` |
| kisekae | `kisekae-v*` | `release-kisekae.yml` |

**ワークフローのファイル名を変えない。** npm の Trusted Publishing は
owner / repository / **workflow filename** に紐づき、接続は作ったあと
編集できない（削除して作り直すしかない）。しかも**失敗するのは
次に publish しようとした瞬間**。

同じ理由で**リポジトリ名を変えるときは npmjs.com で接続を貼り直す**。

## コミット

Conventional Commits の型（`feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `revert`）に
日本語の説明を続ける。破壊的変更は `feat!:`。
パッケージ 1 つに閉じる変更は scope を付ける（`feat(kisekae):`）。

本文には**何をしたか**より**なぜそうしたか・何を確かめたか**を書く。
