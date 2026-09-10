# 開発する（kisekae）

**kisekae 固有の手順**。共通の手順は
[リポジトリのルートの CONTRIBUTING](../../CONTRIBUTING.md) にある
（セットアップ / 認証情報 / スペース / 検査 / 依存 / 公開）。
**利用するだけなら読む必要はない**（使い方は [README](README.md)）。

このパッケージが測るのは**フォーム定義**（`getFormFields` / `getFormLayout`）。
**検証アプリを建てるのは monosashi 側で、kisekae は建ったアプリを読むだけ。**

- [実測の手順](#実測の手順)
- [型を足すとき](#型を足すとき)
- [公開の器を確かめる（pack:check）](#公開の器を確かめるpackcheck)
- [公開する](#公開する)
- [設計上の要点](#設計上の要点)

判断の記録は [`docs/DECISIONS.md`](docs/DECISIONS.md)。
**直してはいけない設計**は [`CLAUDE.md`](CLAUDE.md) にまとめてある
（ルックアップの分割 / 種別ごとのガードを出さない / 派生値を持たない /
`unplaced` を `parent: null` で兼ねない）。

## 実測の手順

kintone に接続するコマンドの実行の形は
[ルートの CONTRIBUTING](../../CONTRIBUTING.md#実-kintone-に接続するコマンドの形)。

### 前提: 検証アプリが建っていること

**monosashi 側で建てる。** 定義は `../monosashi/tools/fixture-app/` にあり、
`.env` の `FIXTURE_APP_ID` / `FIXTURE_LOOKUP_APP_ID` を kisekae も読む。
手順は [monosashi の CONTRIBUTING](../monosashi/CONTRIBUTING.md#一度だけ-検証アプリを用意する)。

**アプリは 1 つを 2 つのパッケージで共有している。**
フォーム定義に要素（`SPACER` / `LABEL` / `HR`）やフィールドを足したいときは
`../monosashi/tools/fixture-app/layout.ts` と `fields.ts` を直す。
そこに足したものはレコードには現れないので monosashi の実測には影響しない
（理由は [`../../CLAUDE.md`](../../CLAUDE.md)「検証アプリは 1 つ」）。

### 毎回: 採取して基準データを作り直す

```sh
pnpm run app:collect-form   # 実 kintone から採る（fixtures/live/form-raw.json）
pnpm run fixture:form       # 正規化して fixtures/form/definition.json を作る
pnpm test                   # 型の主張を新しい実測に対して検証
```

**ブラウザが要らない。** フォーム定義は REST の 2 つの API が返すもので経路が 1 つ。
レコードの値は JS API / event / REST の 3 経路で形が違うので monosashi は
Playwright で採っているが、こちらは Node から素直に採れる。

**採取と正規化を分けてある。** `tools/collectForm.ts` は採るだけ、
環境依存値を伏せるのは `tools/formDefinition.ts`。
`e2e` → `fixture:build` と同じ分け方。
生データ（`fixtures/live/form-raw.json`）はアプリ ID と識別子を含むので
コミットしない（gitignore 済み）。

### 採取を変えたら必ず確かめること

**2 回続けて実行し、`fixtures/form/definition.json` に差分が出ないこと。**

```sh
pnpm run app:collect-form && pnpm run fixture:form \
  && git diff --stat fixtures/form/definition.json
```

**`fixtures/` の直下に置かない。** monosashi の `test/fixtures.ts` の
`loadSamples` が `fixtures/` の `.json` を全部読んで `store.samples` を展開するので、
`samples` を持たないファイルを直下に置くと**レコードのテストが全部壊れる**
（実際に 22 件落とした。
[`../monosashi/docs/DECISIONS.md`](../monosashi/docs/DECISIONS.md)「fixtures/ の直下は「実測サンプル」専用」）。
`fixtures/live/` と同じくサブディレクトリに置く。

## 型を足すとき

型は実行時に消えるので、実測データと型を直接突き合わせられない。
**キーの表を挟んで 3 点を縛っている。**

```
Raw の型  ←→  キーの表  ←→  fixtures/form/definition.json
```

| ファイル | 縛るもの |
|---|---|
| `src/types/raw.test-d.ts` | 型 ↔ 公式（乖離の検出） |
| `test/rawKeys.test-d.ts` | 型 ↔ 表（`keyof T` と表の要素の union が一致） |
| `test/rawFixture.test.ts` | 表 ↔ 実測（キーの集合が全件一致） |

新しいフィールド種別が kintone に増えたときは、次の順に必ず気づける。

1. 採取し直す → `test/rawFixture.test.ts` が「表に無い」で落ちる
2. `test/rawKeys.ts` の表に足す → `test/rawKeys.test-d.ts` が「型に無い」で落ちる
3. `src/types/raw.ts` に型を足す → `src/types/raw.test-d.ts` が公式との差を見る
4. 整形後の型（`src/types/field.ts`）と `src/toForm.ts` を足す

**3 つのうち 2 つが一致していても通らない。**
表と型の両方に実測に無いキーを足して、空振りでないことを確かめてある。

**`src/types/raw.test-d.ts` に許容リストを作らない。**
既知の乖離は `PatchedLabel` のように交差型で内容ごと式に書く。
素の等価性で書くと初日から赤になり、
「毎回差分が出て、やがて誰も見なくなる」（`docs/DECISIONS.md`「5. 等価性テスト」）。

## 公開の器を確かめる（`pack:check`）

```sh
pnpm run pack:check
```

`pnpm pack` した tarball を空のプロジェクトに入れ、
**`kisekae` という名前で**読めるかを確かめる。kintone には接続しない。

4 シナリオ × 2 解決方式（`bundler` / `nodenext`）× 2 版（TS 7 / 5.9）。

| シナリオ | 何を守っているか |
|---|---|
| `@kintone/rest-api-client` を入れていない利用者 | **実行時依存ゼロ。** `node_modules` に `kisekae` 以外が現れないことまで見る |
| ルックアップの分割が出荷物でも効いている | **kisekae の設計の中心。** `.d.ts` の出力で判別ユニオンが崩れると、利用者側でだけ `filter` の絞り込みが効かなくなる |
| ブラウザの型が無い環境（Node / AWS Lambda 相当） | `lib` に DOM が無くても通る |
| `dist/*.d.ts` 自体を検査（`skipLibCheck: false`） | 利用者は既定の `skipLibCheck: true` なので、**`.d.ts` が壊れていてもエラーにならず型が黙って `any` に落ちる**。上の 3 つは「通ること」しか見ていないので、`any` でも緑になる |

**src のテストでは足りない。** monosashi で TS 7 に上げたときに
`field.subtableRow` の戻り値から `id?: never` が宣言出力から落ち、
src に対する tsc も型テストも全部通ったまま**利用者側だけが壊れた**。
`test/dist/consumer.ts` がその穴を塞いでいる。

## 公開する

手順と npmjs.com 側の設定は
[ルートの CONTRIBUTING](../../CONTRIBUTING.md#公開する)。
kisekae 固有なのは次の 2 つだけ。

| | |
|---|---|
| タグ | **`kisekae-v*`** |
| ワークフロー | `.github/workflows/release-kisekae.yml` |

```sh
vim packages/kisekae/package.json      # version を上げる
git commit -am "chore(kisekae): 0.1.1"
git tag -a kisekae-v0.1.1 -m "kisekae 0.1.1"
git push origin main && git push origin kisekae-v0.1.1
```

承認は https://www.npmjs.com/package/kisekae で行う。

## 設計上の要点

### 測った範囲より広いことを書かない

キーの存在を確かめただけで値の意味まで結論した記述が、実際に 1 件あって
実測で否定された（[`../monosashi/docs/DECISIONS.md`](../monosashi/docs/DECISIONS.md)「enabled は使える」）。
**実測の記述には何を確かめたのかを書く。**

`enabled` については「設定を反映するか」を測って、反映することを確認した。
`CATEGORY` / `STATUS` / `STATUS_ASSIGNEE` に付く。
組み込みフィールドは `enabled` を**持たない**（`unplaced` のテストが縛っている）。

### 公式の型を委譲せず、自前で持つ

`src/types/raw.ts` は `@kintone/rest-api-client` の型を再エクスポートしない。
委譲すると、利用者がそれを入れていない場合に `skipLibCheck: true`（TS の既定）で
**型が `any` に落ち、`strict` も `noImplicitAny` も警告も効かない**
（monosashi で全ての緩和策が効かないことを確かめた。
[`../../docs/KINTONE.md`](../../docs/KINTONE.md)）。

自前で持つと解決すべき外部モジュールが無くなり、この問題が構造的に消える。
公式との乖離は `src/types/raw.test-d.ts` の等価性テストで縛る
（devDependency はこのリポジトリに常に在る）。

### monosashi に依存しない

`package.json` に `monosashi` は入っていない。
フォーム定義とレコードの値は別のもので、共有する型が無い
（`docs/DECISIONS.md`「monosashi に依存しない」）。

共有するのは実測の足場（`@jissoku/rig`）と検証アプリだけ。
