# 設計判断の記録

`kintone-record` の設計を決めるにあたって検討した内容と、その根拠。

このドキュメントの目的は「何を決めたか」より **「何を捨てたか、なぜ捨てたか」** を残すこと。
決定だけならコードを読めば分かるが、却下した選択肢は消えてしまうため、同じ検討を繰り返すことになる。

調査時点: 2026-08-30
対象バージョン: kintone-typeguard 0.18.3 / kintone-pretty-fields 0.11.0 / @kintone/rest-api-client 6.2.1 / @kintone/dts-gen 9.x

---

## 背景

kintone のレコードには3つの取得・更新経路があり、それぞれ型の出どころが違う。

| 経路 | 型の出どころ | 状態 |
| --- | --- | --- |
| JS API (`kintone.app.record.get/set`) | `@kintone/dts-gen` | **`any`**。型が無い |
| `event.record` (`kintone.events.on` のコールバック) | `@kintone/dts-gen` | **`any`**。ハンドラ引数が `(event: any) => any` |
| REST API | `@kintone/rest-api-client` | REST の型のみ。JS API とは別物 |

さらに `event.record` は画面（作成 / 詳細 / 編集）によって形が違うが、
`dts-gen` はその区別を持たない。

プラグイン実装では「JS API で取得したものを REST に渡す」「その逆」が日常的に発生するため、
境界のたびに `as` が必要になっていた。

---

## 決定サマリ

| # | 論点 | 決定 |
| --- | --- | --- |
| 1 | 成果物の範囲 | 型 + 変換関数 + typeguard を1パッケージに集約 |
| 2 | 型モデル | 手段の4象限 + イベント名→event型のマップ |
| 3 | 実測スコープ | 全フィールド種別 × 主要イベント × 3経路の突き合わせ |
| 4 | 実測の忠実度 | `JSON.stringify` 禁止。キーの存在を保持する独自形式 |
| 5 | 検証アプリ | REST 構築スクリプト + テストレコード投入まで自動化 |
| 6 | テスト戦略 | PR は高速テストのみ。実 kintone は定期ジョブで差分検出 |
| 7 | 変換の判断根拠 | `type` だけを見る同期の純粋関数（実測によりメタ情報は不要と判明） |
| 8 | 変換の方向 | REST 型を Canonical と位置づける。加えて構築 API と代入 API |
| 9 | イベント網羅 | ほぼ全イベント + 未知イベントのフォールバック |
| 10 | 移行 | 新パッケージ名。kintone-typeguard は凍結、シムを作らない |

---

## 1. 成果物の範囲

**決定**: 正確な `kintone.d.ts`（レコード周りのみ全面改訂、それ以外は dts-gen 準拠）と、
境界変換関数、typeguard を1パッケージに集約する。kintone-typeguard は将来的に吸収する。

**理由**: 型だけでは `as` は消えない。JS API と REST は「型が違う」だけでなく
**実行時の値そのものが違う**（`SUBTABLE` の `id`、未入力値の表現）ため、変換コードが必須になる。

> **2026-08-30 追記**: 当初この根拠に `FILE` の `value` 形状も挙げていたが、
> 実測の結果 **`FILE` は JS API の形（`contentType` / `name` / `size` 付き）のまま
> REST に投げても正しく保存される**ことがわかった。この 1 点は根拠から外れる。
> 一方 `SUBTABLE` の `id` は健在で、落とすと行が置き換わってデータが壊れる。
> さらに実測で、未入力値の表現が文脈ごとに `undefined` / `""` / `null` に分かれることも判明し、
> 変換が必要だという結論自体はより強くなった。

**捨てた選択肢**

- **型定義のみ**（変換関数を持たない） — 上記の理由で `FILE` / `SUBTABLE` の `as` が原理的に消えない
- **ラッパー API**（`kintone` グローバルを直接触らせない） — kintone の API 面積（`getFieldElement`、`setFieldShown`、mobile 系、一覧画面…）まで抱えることになり維持コストが見合わない。レコードだけラップして他は生 kintone、という混在も学習コストが高い
- **typeguard を別パッケージに残す** — 「型は kintone-record、絞り込みは kintone-typeguard」だと依存が循環的になり、`FFF<A,B,C,D>` のような無理な型合成が再発する。型と絞り込みは同じ場所で定義すべき

**kintone-pretty-fields は統合対象外**。フィールド**定義**（`getFormFields`）を扱うもので、
レコード**値**を扱う本パッケージとは責務が分かれている。
ただし変換関数はその出力形に適合する最小インターフェースを受け取れるようにする（依存は持たない）。

---

## 2. 型モデル

**決定**: 「手段の4象限（JS読み / JS書き / REST読み / REST書き）」に加えて、
**イベント名リテラルから event 型を引くマップ**を持つ。

```ts
type KintoneEventMap = {
  "app.record.create.show": { type: "app.record.create.show"; appId: number; record: Record.CreateShow };
  "app.record.edit.show":   { type: "app.record.edit.show"; appId: number; recordId: number; record: Record.EditShow };
  // ...
};
function on<E extends keyof KintoneEventMap>(
  event: E | E[],
  handler: (event: KintoneEventMap[E]) => KintoneEventMap[E] | Promise<KintoneEventMap[E]> | void,
): void;
```

**理由**: kintone-typeguard は `Get` / `Set` / `Event` / `Unified` の4名前空間だが、
これは**「手段」だけの軸**で切られていて**「画面」の軸が無い**。
そのため各プラグインがイベント型を手書きで重複させていた。

実測（2026-08-30 時点）: 6 つのプラグインがそれぞれ 12〜35 行の
イベント型を手書きしており、**すべて内容が微妙に違って一貫性が無い**。
根本原因は `kintone.events.on(event: string, handler: (event: any) => any)` が `any` であること単体。
`events.on` を型付けするだけでこの重複は全廃できる。投資対効果が最大。

**画面ごとのレコード型は手書きせず、ベース型からの機械導出**（`Omit` / `Readonly` 等）にする。
その差分が実際に何なのかを確定させるのが実測の役割。

**捨てた選択肢**

- **手段の4象限のみ**（画面差を型に出さない） — 「create の `event.record` には `$id` が無い」といった差を `$id?` に倒すしかなく、edit 画面で毎回 undefined チェックを強いる。型の意味が薄れる
- **Canonical 1型に統一**（読みは全部正規化、書きは `Partial`） — `event.record` は**書き換えて `return event` する**のが kintone の契約なので、正規化した別型に変換すると元に戻せない。`event.record` だけは実物の形をそのまま型にする必要がある
- **条件型でフィールドを文脈パラメータ化**（`Field.Number<"EditShow">`） — `FFF<A,B,C,D>` の反省がそのまま当てはまる。ホバー表示とエラーメッセージが壊滅的になり、絞り込み後に何の型か読めなくなる

---

## 3. 実測スコープ

**決定**

- **イベント**: create / detail / edit の各 show、`*.submit`、`*.submit.success`、`*.change.<field>`、`app.record.index.show`、インライン編集
- **経路**: `event.record` / `kintone.app.record.get()` / REST `getRecord` を**同一レコードで突き合わせる**
- **フィールド**: 全種別を網羅。Lookup・関連レコード・グループ・テーブル・カテゴリ・ステータス・作業者を含む。**間引かない**
- **状態**: 未入力 / 入力済みの両方
- **mobile**: スポット確認のみ
- **フィールドアクセス権による欠落**: **型に出さない**

**理由**

経路の突き合わせこそが「get の結果を REST に渡す / その逆」という当初の課題そのもので、
変換関数のシグネチャは REST との実測差分がないと書けない。

`submit` 系も落とせない。調査したプラグインはテーブル行を
`event.record` に push しており、ここが実測未確定のまま `@ts-expect-error` になっていた。

フィールド種別を間引くと Lookup や関連レコードのような一番厄介なものが漏れる。

**アクセス権を型に出さない理由**: 「非表示フィールドは record から消える」を型で表すと
**全フィールドが optional になり、型が死ぬ**。これは型ではなく実行時 guard の責務。

**捨てた選択肢**

- **mobile 全網羅** — PC とイベント名以外は同形という前提。全網羅する価値が低い
- **ゲストスペース / 英語ロケール** — レコードの**値と構造**には影響せず、変わるのは URL とラベル表示だけ

---

## 4. 実測の忠実度

**決定**: `JSON.stringify` を使わない。`Object.keys()` でキー集合を保持し、
各値を `{ present, typeof, value }` 相当の形式に包んで
`undefined` / `null` / `""` / `[]` をすべて区別する。

**理由**

```js
JSON.stringify({ error: undefined }) === "{}"   // キーが消える
```

測定目的は `disabled?` / `error?` / `$id?` / `id?` が optional かどうかの判定、
つまり**キーの有無そのもの**。素朴なダンプでは目的が最初の一手で壊れる。

あるプラグインが `viewId?: undefined` という奇妙な型を手書きしていたのは、
この区別が曖昧なまま推測で書いた痕跡と見られる。

**この設計が効いていることの確認**（合成データでのパイプライン検証）:

```
## SINGLE_LINE_TEXT
| app.record.create.show / event.record | `error` | 必須 | `undefined` |
| app.record.edit.show / event.record   | `error` | 必須 | `null`      |
| screen.edit / rest.getRecord          | (キー自体が無い)       |
```

`error` が「値 undefined で存在」「値 null で存在」「キーごと不在」の3状態で区別できている。

**構造チェックは1回だけ**別途実行する（`inspectStructure`）。
`event.record` が素の data property の集合か、getter / 非列挙キーを持つかの確認。
immer の `createDraft` を通しているプラグイン実装の前提検証が目的。
フィールドごとに毎回採ると出力が数倍に膨れ、分析が重くなるだけ。

**採取と分析を分離する**。ブラウザ側は生データ採取のみ、
スキーマ化・型生成はリポジトリ内の Node スクリプト。
採取コードを再アップロードせずに分析だけ何度でも回せるようにするため。

**捨てた選択肢**

- **時系列スナップショット**（表示直後 / 値変更後 / `set()` 後） — 今回の目的は「型」であって「ミューテーション意味論」ではない。`event.record` を書き換えて `return event` する契約は実運用で確認済み

---

## 5. 検証アプリ

**決定**: REST 構築スクリプトをリポジトリに置く。
測定用アプリとルックアップ参照先アプリの2つを作り、テストレコード投入まで自動化する。

**理由**

- **アプリテンプレート zip は不採用**。実質バイナリで diff が効かず、「なぜこのフィールド構成なのか」をレビューできない。差分更新もできない。実測を根拠に型を書く以上、根拠側がブラックボックスなのは本末転倒
- **レコード投入まで自動化しないと条件がブレる**。`DROP_DOWN` の未入力が `null` か `""` かを確定させるのが目的なのに、手入力に委ねたら再実行のたびに条件が変わる
- **Lookup は参照先にレコードが無いとルックアップを実行できず**、コピー先フィールドが空のまま＝測定にならない。参照先アプリとそのレコード投入は必須

**捨てた選択肢**

- **手作業 + テンプレート zip** — 上記のとおり追試不能
- **環境バリエーション**（ゲストスペース / ロケール / アクセス権パターン） — レコードの値と構造に影響しない、または #3 で型対象外と決めた

---

## 6. テスト戦略

**決定**

- **PR で回すのは型チェック・Lint・凍結フィクスチャに対するテストのみ**。実 kintone には接続しない
- **実 kintone を使う検証は定期スケジュールジョブに分離**し、そこでは**フィクスチャと実測の diff** で落とす

**理由**

このライブラリの正しさの主張は **「宣言した型が、kintone が実行時に返す実物と一致している」** の一点。
通常の単体テストでは守れず、実物と繋がないと検証できない。
しかし実物と繋ぐと CI が遅く不安定になる。

**これは既に一度起きている**。kintone-typeguard には実 kintone に接続するテストが
`src/test/vitest/typeguard.test.ts`（175行）として書かれているが、
`.github/workflows/check.yml` の `Run Tests` ステップは**コメントアウトされている**。
PR ごとにライブ実行する設計を選べば、同じ結末をなぞることになる。

責務を分けることで、PR は速いまま、実物との乖離は最大1週間で検出できる。
差分が出たら「フィクスチャ更新 PR」を自動で立てれば、更新が人の記憶に依存しなくなる。

**採取コードを二重に持たない**。
kintone-typeguard の `src/test/functions/customize.ts` のように
テンプレート文字列で JS を持つ方式は、採取ロジックが育った瞬間に破綻する。
採取コードは通常の TypeScript ソースとして書き、ビルドで IIFE 1ファイルを吐き、
それを (1) 人間が手動でアプリに貼る (2) Playwright が `updateAppCustomize` でアップロードする
の両方から**同じ成果物として使う**。
これが崩れると、手動で採った実測と CI が検証している実測が別物になる。

**捨てた選択肢**

- **型テストのみ**（実 kintone に一切繋がない） — kintone は年に何度も更新される。実物が変わったことに気づく仕組みがないなら「今日時点で正しい」で終わり、dts-gen と同じ状態に戻る
- **PR ごとのライブ実行** — アプリ作成・デプロイは非同期で数十秒、`workers: 1` 強制、API 日次上限あり。必ず無効化される

**道具**: vitest の `expectTypeOf` + `@ts-expect-error` を踏襲。
tsd / expect-type への乗り換えは利得がなく、既存資産と CI 設定を捨てるコストだけが残る。

---

## 7. 変換関数の判断根拠

> **2026-08-30 追記: 実測により結論が変わった。**
> 当初は「ルックアップのコピー先はレコードの値から判別できないので、
> `getFormFields` のメタ情報を任意引数で受け取る」と設計した。
> 実際に REST へ投げて確かめたところ、**コピー先を含めてもエラーにならず黙って無視される**。
> よって **メタ情報の引数そのものが不要**になり、変換は完全に静的な純粋関数になる。
> 詳細は「REST updateRecord の受け入れ挙動」の節と `fixtures/write-behavior.md` を参照。

**決定（改訂後）**: 変換は **`type` だけを見る同期の純粋関数**。
フィールドメタ情報も `getFormFields` も要らない。

`forRestWrite` がやることは 2 つだけ。

1. 書き込みが拒否される 9 種の `type` を落とす
2. `$id` / `$revision` を分離して `id` / `revision` パラメータへ回す

**当初この設計に至った経緯（記録として残す）**

変換で落とす / 変形する対象と、その判断に必要な情報を次のように整理していた。

| 対象 | 当初の想定 | 実測結果 |
| --- | --- | --- |
| `RECORD_NUMBER`、`CREATOR`、`CREATED_TIME`、`MODIFIER`、`UPDATED_TIME` | 落とす | **落とさないとエラー（`GAIA_UN10`）** |
| `STATUS`、`STATUS_ASSIGNEE` | 落とす | **落とさないとエラー（`GAIA_UN10`）** |
| `GROUP` | 想定していなかった | **落とさないとエラー（`GAIA_UN10`）** |
| `CATEGORY` | 落とす | **落とさないとエラー（`GA_UO01`）** |
| `CALC` | 落とす | 無視される。落とさなくてもよい |
| `FILE` | `{fileKey}[]` に縮約が必要 | **縮約不要。JS API の形のまま通る** |
| `SUBTABLE` の `id` | 保持する | **保持が必須。落とすと行が置き換わる** |
| `disabled` / `error` | 落とす | 無視される |
| `$id` / `$revision` | 落とす（`$revision` は別引数へ） | 無視される |
| **ルックアップのコピー先** | **メタ情報が必要** | **無視される。メタ情報は不要** |

ルックアップのコピー先について当初メタ情報が要ると考えたのは、
`kintone-pretty-fields/src/functions/formField.ts` の `isLookupCopy` が
`getFormFields` の結果から、しかもルックアップ元アプリの権限を持って初めて判定できる
（README にも "Requires lookup source app permissions"）ためである。
判別自体はいまも値だけではできない。
**判別する必要がなくなった**、というのが実測でわかったこと。

**捨てた選択肢**（実測前の検討。いずれも結論は変わらない）

- **メタを必須引数にする** — 「`event.record` をそのまま REST に投げたいだけ」という最頻ケースに `getFormFields` の取得を強制することになる。さらにルックアップ元アプリの権限が無い環境では取得自体が失敗する
- **変換関数が内部で `getFormFields` を呼ぶ（async 化）** — ループ内で呼べば N 回 API を叩く。一括更新の実装で即座に破綻する

**粒度**: 一括変換を主 API、フィールド単位変換を下位 API として**両方公開する**。
`SUBTABLE` の再帰があるためフィールド単位だけでは利用者が再帰を書く羽目になり、
`as Subtable["value"]` のようなキャストが再生産される。
逆に一括だけだと、テーブル 1 行だけを変換したいケースが書けない。

**「動作上不要」でも変換で落とすもの**

`disabled` / `error` / `confirmed` / `recordId` / `$id` / `$revision` と `FILE` の余分なプロパティは、
渡してもエラーにならないので**落とさなくても動く**。それでも変換では落とす。
型の上で「REST に渡せる形」を表現するため、
および送信ペイロードを不必要に膨らませないため。
ただしこれは**正しさの要件ではなく整形**であり、落とし漏れがあっても壊れない。

## 8. 変換の方向と、変換だけでは足りないこと

**決定**: REST 型を Canonical と位置づける。**加えて、構築 API と型安全な代入 API を提供する**。

```ts
toRest(uiRecord)             // UI(get/event) → Canonical。同期・純粋
toUi(restRecord)             // Canonical → UI 型。実行時はほぼ恒等だが関数として公開
forRestWrite(record)         // Canonical → addRecord/updateRecord のパラメータ
forJsSet(record)             // Canonical → kintone.app.record.set() の入力
```

**Canonical を新設しない理由**: `@kintone/rest-api-client` の `KintoneRecordField` が
既に事実上の正規形として機能している。kintone-typeguard の `Unified` namespace
（`src/types/recordFieldUnified.ts`）がそれを丸ごと再エクスポートしているのがその証拠。
**既にあるものを Canonical と宣言するだけで足りる**。

**`toUi` は実行時にはほぼ恒等関数**（REST 読み型の `FILE` は `contentType/name/size` を持ち UI と同形、
`SUBTABLE` の `id` も同様）。
ただし実測では未入力値の表現が違う（`DROP_DOWN` は REST が `null`、JS API が `""`）ため、
恒等で済むかは画面別型を書いたあとに再判定する。それでも名前付き関数として公開する。
`as` を1箇所に集約でき、将来 kintone 側に差分が生まれたときの修正点が1つになるため。

**捨てた選択肢**

- **独立した Canonical 型を新設** — 型が5つ目になり学習コストだけ増える
- **実需のある方向だけ直接変換**（ハブなし） — 方向が増えるたびに N² で増える
- **単一 API に宛先を渡す**（`convert(record, "rest:add")`） — 入力がどの文脈のレコードかを構造から自動判別できない。`disabled` / `error` を持たない UI レコード（未編集の detail 画面など）と REST レコードは**完全に同形**。誤判別が静かなバグになる

### 変換だけでは足りない（重要）

実在のプラグイン群のレコード入出力を全て洗った結果、
**変換でカバーできるのは一部だけ**だった。

| 性質 | 変換でカバー |
| --- | --- |
| REST 読み取り → UI へ渡す | ✅ |
| REST の入出力に JS API の型を当てている誤り | ✅ Canonical 制定で是正 |
| event.record を REST の `updateAllRecords` へ渡す | ✅ |
| **部分レコードをゼロから構築する** | ❌ |
| **テーブル行のフィールド値へ代入する** | ❌ |
| **`FILE` を手で構築する** | ❌ |
| **サーバ側（Lambda）でレコードを構築する** | ❌ |

**カバーできない側は全て「構築」と「代入」**。よって
**フィールド構築 API（`field.number(x)` など）と型安全な代入 API（`setValue(record, code, value)`）を併せて提供する**。

**`Record` 型全体の `Readonly` 化は不採用**。
`event.record` は「書き換えて `return event` する」のが kintone の契約なので、正規の使い方ができなくなる。
`Readonly` にできるのは detail 画面など読み取り専用文脈だけで、それは #2 の画面別型で表現すべきもの。

---

## 9. イベント網羅

**決定**: ポータル・スペース・グラフを含むほぼ全イベント（約60種）を型付けし、
**未知イベントのフォールバックを持つ**。

**フォールバックの形**: `E | (string & {})`。
既知イベントの補完を効かせたまま未知の文字列も受けられ、未知側だけ緩い型になる。

**理由**

閉じたマップ（`E extends keyof KintoneEventMap`）だけにすると、
kintone が新イベントを追加した瞬間、利用者はライブラリの更新を待つまでそのイベントを使えなくなる。
型付けの利得と引き換えに利用者をブロックする側に回る。

一方、単純な `on(event: string, ...)` オーバーロードを足すと
**タイポが静かに通ってしまい型付けの意味が消える**。

**実使用は13種だが、それを境界にしない**。
調査したプラグイン群が実際に使っているのは以下の13種のみ。

```
app.record.index.show / detail.show / edit.show / create.show / print.show
app.record.create.submit.success / edit.submit.success
mobile.app.record.index.show / detail.show / edit.show / create.show
mobile.app.record.create.submit.success / edit.submit.success
```

しかしこれは「たまたま今使っている範囲」であってライブラリの適切な境界ではない。
特に **`app.record.create.submit` / `edit.submit`（保存前検証、`event.error` を設定して保存を止める）は
kintone カスタマイズの最頻用途の一つ**で、これを型付けできないライブラリは標準的な使い方から外れる。
調査対象が使っていない方が例外的。`.change.<field>` も同様。

`portal.show` / `space.portal.show` / `app.report.show` は**レコードを持たない**ので型は数行で終わる。
網羅しないコストの方が高い。

**ただし実測の裏付けがあるのはレコード系だけ**。
portal / space / report は公式ドキュメント準拠で書き、
**実測済みかどうかを JSDoc で明示的に区別する**。
「実測に基づく」が売りである以上、根拠のレベルが違うものを黙って混ぜるのは誠実さを欠く。

**型付けで特に価値が高いもの**

- **`submit` 系**: 戻り値に `error` を設定できる特殊な契約（`return {...event, error: "メッセージ"}` で保存中断）
- **`.change.<field>`**: イベント名にフィールドコードが埋まる動的イベント。テンプレートリテラル型で表現。この系統だけが持つ `event.changes` の形も実測対象

---

## 10. 移行

**決定**: 新パッケージ名で出し、kintone-typeguard は凍結する。
**deprecated エイリアスもシムも作らない**。
利用側は両方を併存させ、**プラグイン単位で移行**する。

**理由**

- **旧 `Record` 型は「非推奨にすべき古い API」ではなく「安全でない型」**（後述の実測を参照）。deprecated エイリアスやシムで残すのは、危険な型に公式の生存期間を与えることを意味する。新旧が混在した状態で「この `Record` はどちらの型か」が読めなくなる期間も長く続く
- **名前空間の意味そのものが変わる**。「手段による分割」から「画面別 + Canonical」へ軸が変わるので、同じパッケージ名で出すと「更新したら型の意味が変わっていた」になる。kintone-typeguard は npm 公開パッケージで外部利用者がいる可能性があり、なおさら
- **一括移行はリスクだけ大きい**。55ファイルを一度に触ると、型設計の誤りが見つかったときの手戻りが最大化する

**移行順序**: **最も規模が大きく、難所を全部含むものから着手する**。
最小のものからではない。
`Subtable` の immer 経由の書き換え、REST → UI のキャスト、
`Set.File` の手構築、`event.record` から REST 一括更新への変換。
ここが通れば残り7つは軽い。
逆に最小のもの（2 ファイル）から始めると、
簡単なものだけ移行が済んだ状態で難所にぶつかり、設計をやり直す羽目になる。
**最初の1つで設計を検証するのが目的**。

**機械置換は成立しない**。`Set.Record` の46件は移行先が
`kintone.app.record.set()` 用と REST `updateRecord` 用の2つに割れる
（共通クライアントが現に REST に `Set.Record` を当てていた）。
どちらに向かうかは呼び出し先を見ないと決まらない。

---

## 実測で判明した事実

### 現行の `Record` 型は書き込みを一切検査していない

kintone-typeguard 0.18.3（利用側が実際に固定していたバージョン）の
ソースに対して `tsc --strict` を実行した結果。

```ts
// すべてエラーなしで通る
r["数値"].value = ["これは", "配列"];              // NUMBER に配列
r["チェックボックス"].value = "配列であるべき";      // CHECK_BOX に文字列
r["数値"] = { type: "CHECK_BOX", value: [] };      // 型ごと差し替え
const v = r["存在しないフィールド"].value;          // undefined チェックなし
```

読み取りは正しくユニオンに解決される（`any` への劣化ではないことも確認済み）。
**壊れているのは書き込み側だけ**。
TypeScript はユニオン型のプロパティ書き込みを「いずれかのメンバーに合えば可」で通すため、
フィールド型をまたいだ代入が全部素通りする。

**帰結**: 既存の `as` / `@ts-expect-error` は**外しても通る**。残骸である。
既存コードの `as` も `@ts-expect-error` も不要だった。
つまり現状は「`as` が必要で不便」なのではなく、**「`as` すら不要なほど何も検査していない」**。

これが #8 で構築 API と代入 API を追加した直接の理由。

### 交差型は `as` の原因ではなかった

当初 `Event.Record` の交差型（`{$id?} & {[key: string]: ...}`）が
`as` の原因だと考えたが、検証したところ**誤りだった**。
交差型でもインデックスシグネチャへの代入は正しく解決される。
真の原因は上記のユニオン書き込みの不健全性。

### `Unified` namespace は誰にも使われていない

調査したプラグイン群 55 ファイルの依存内訳:

| 使用箇所 | 件数 |
| --- | --- |
| `kintoneRecordFieldEvent.Record` | 56 |
| `kintoneRecordFieldSet.Record` | 46 |
| `kintoneRecordFieldGet.Record` | 15 |
| `guardRecord.isFile` | 17 |
| その他 | 約55 |
| **`kintoneRecordFieldUnified.*`** | **0** |

`Unified` は 0.18.0 で「4つの文脈で統一的に使える型」として追加されたが、**使用が0件**。

**教訓**: Canonical を*追加の選択肢*として提供しても使われない。**既定の型に据える**必要がある。

---

### disabled / error は読み取りでは存在しない（2026-08-30 実測）

38 サンプル、全画面・全経路で 1 件も現れない。
`kintone.app.record.set()` で設定した直後の `get()` でも現れず、書き込み専用のプロパティだった。

kintone-typeguard の `Event` 型と `Get` 型はほぼ全フィールドに
`disabled?: boolean; error?: string | null` を持たせているが、
**読み取り文脈にこれらを置くのは誤り**。`Set` 型だけに属する。

`set()` が実際に効いたかは検証していないが、この結論は `set()` の成否に依存しない。
「読み取りで現れない」という事実だけで読み取り型から外す判断は確定する。

### 作成画面は「値が undefined」という第 4 の状態を持つ（2026-08-30 実測）

| type | 作成 | 編集 | 詳細 | REST |
| --- | --- | --- | --- | --- |
| `SINGLE_LINE_TEXT` / `NUMBER` / `LINK` / `MULTI_LINE_TEXT` | `undefined` | `""` | `""` | `""` |
| `DATE` / `TIME` | `undefined` | `string` | `null` | `null` |
| `DATETIME` | `undefined` | `string` | `""` | `""` |
| `DROP_DOWN` | `undefined` | `string` | `""` | **`null`** |

`DROP_DOWN` の未入力は文脈によって `undefined` / `""` / `null` の 3 通りになる。

画面差を型で表現するという #2 の判断は裏づけられた。
ただし `Omit` / `Readonly` による機械導出では足りず、**`value` の型自体が画面ごとに違う**。

### ルックアップのキーフィールドは JS 側だけ 2 キー余分（2026-08-30 実測）

```
JS API / event.record :  type, confirmed, recordId, value
REST                  :  type, value
```

全画面で一貫している。`confirmed: boolean`、`recordId: string | null`。
kintone-typeguard は `Lookup` 型をコメントアウトしており、この形を一切表現していない。

**キーの存在で実行時に判別できる**ため、キーフィールド側にメタ情報は要らない。

### レコードに現れないフィールド（2026-08-30 実測）

- **`GROUP` と `REFERENCE_TABLE` は全 10 文脈でレコードに現れない**
- **グループ内フィールドはフラットに現れる**（入れ子にならない）
- **`$id` / `$revision` は作成画面には存在しない**。詳細・編集・REST には必ず存在する
- フィールド数は作成画面 28、それ以外 37。差はシステムフィールド 9 個

### イベントオブジェクトの形（2026-08-30 実測 / 86 サンプル）

**`recordId` の型がイベントで違う**

| イベント | `recordId` |
| --- | --- |
| `detail.show` / `edit.show` / `edit.change.*` / `edit.submit` | `number` |
| `create.submit.success` / `edit.submit.success` | **`string`** |

`appId` は全イベントで `number`。`submit.success` だけ `recordId` が文字列という非対称がある。

**`submit.success` は `record` を持つ**

当初「record を持たない（url だけ）」と想定していたが誤り。
`record` も `recordId` も持ち、`$id` / `$revision` / システムフィールドまで揃っている。
一方 envelope に `url` キーは無い。
調査した手書き型（`KintoneEventCreateSubmitSuccess = { type, url }`）も
同じ誤りを持っていた。

**`create.submit` の record にはシステムフィールドが無い**

| | `create.submit` | `edit.submit` |
| --- | --- | --- |
| レコード番号 / 作成者 / 更新者 / 作成日時 / 更新日時 | なし | あり |
| ステータス / 作業者 | なし | あり |
| `$id` / `$revision` | なし | あり |
| カテゴリー | **あり** | あり |

**手書き型に無いキー**

- `create.show` に `reuse: boolean`（「再利用して作成」かどうか）
- `index.show` に `viewName: string` / `offset: number` / `size: number` / `date: null`。
  調査した手書き型は `viewType` / `viewId` しか持っていない

**`submit` に `error` キーは最初から存在しない**

`error` は追加するものであって、event に生えているわけではない。型では optional にする。

**`changes` は参照であってコピーではない**

```
changes.field = record 内のフィールドと同一オブジェクト
changes.row   = changes.field.value 内の行と同一オブジェクト（テーブル外の変更では null）
```

サブテーブル内のセルを変更したときのイベント名は
`app.record.edit.change.<テーブルのコード>` で、`changes.field` は SUBTABLE フィールド全体。

未確認: テーブル内フィールドのコード（`t_singleLineText` など）でも change イベントが
発火するかどうか。採取時にそれらのコードを登録していなかったため測れていない
（採取ツールは修正済み。次回の採取で確認できる）。

### 変換関数の出力が kintone に受け入れられること（2026-08-30 実測）

`tools/probe-write/verifyConverter.ts` を実環境で実行した結果。

```
[1/3] 変換せずに投げる -> 期待どおり失敗
      GAIA_UN10 RECORD_ID型のフィールドに値を設定することはできません
[2/3] 変換して投げる   -> 受け入れられた
      37 フィールド -> 25 フィールド、revision を分離
[3/3] サブテーブル      -> 行数が保たれた
```

対照実験として「変換せずそのまま投げると失敗する」ことも確認している。
これが失敗しないなら、そもそも変換が要らないことになる。

単体テストは「変換が期待どおりの形になるか」しか見ていない。
その形を kintone が受け付けるかは実際に投げないと分からず、
それが変換の目的そのものなので、この確認を省略しない。

### REST updateRecord の受け入れ挙動（2026-08-30 実測）

生データは `fixtures/write-behavior.md`。

**落とさないとエラーになるもの（9 種）**

| type | エラーコード |
| --- | --- |
| `RECORD_NUMBER` / `CREATOR` / `CREATED_TIME` / `MODIFIER` / `UPDATED_TIME` | `GAIA_UN10` |
| `STATUS` / `STATUS_ASSIGNEE` | `GAIA_UN10` |
| `GROUP` | `GAIA_UN10` |
| `CATEGORY` | `GA_UO01`（「APIでは次の操作はできません：カテゴリーの値の編集」） |

**それ以外は黙って無視される**

`CALC` / `disabled` / `error` / `confirmed` / `recordId` / `$id` / `$revision` /
存在しないフィールドコード / ルックアップのコピー先 /
`FILE` の JS API 形（`contentType` / `name` / `size` 付き）。

**`SUBTABLE` の `id` は保持が必須**。
`id` 付きで渡せば行 id が保たれ、落とすと既存 2 行が 1 行に置き換わって新しい id が振られる。

## 調査済みの kintone / API の制約

`@kintone/rest-api-client` 6.2.1 の `AppClient` 全38メソッドを確認した結果。

| 制約 | 内容 | 対応 |
| --- | --- | --- |
| **アプリ削除の REST API が無い** | `AppClient` に `deleteApp` は存在しない。UI からしか消せない | 検証アプリ構築を再実行可能にし、既存アプリを再利用する（`tools/fixture-app/build.ts`） |
| **カテゴリー設定の REST API が無い** | `getAppSettings` / `updateAppSettings` にも含まれない | 手動設定。`app:verify` がレコードの `type` から未設定を検出して警告 |
| プロセス管理は自動化できる | `updateProcessManagement` が存在する | `build.ts` で `STATUS` / `STATUS_ASSIGNEE` を作る |
| **`getFormFields` では CATEGORY / STATUS の有効・無効を判定できない** | 設定が無効でも `カテゴリー` / `ステータス` を**常に返す**（2026-08-30 実測: プロセス管理を有効化していないアプリでも両方が返る）。一方レコードにはこれらの type は現れない | 検証はレコードの `type` から行う。フィールドコードは環境の言語で変わる（`カテゴリー` / `Categories`）ので**コード名ではなく `type` で判定する**（`tools/fixture-app/verify.ts`） |
| **`addFormFields` は参照先フィールドが先に必要** | ルックアップの `fieldMappings`、関連レコード一覧の `condition.field` | 2パスに分割。1回にまとめると `CB_VA01` で弾かれる |
| **`addApp` はプレビュー環境にしか作らない** | `deployApp` するまで運用環境の API（`getApp` / `getRecords`）からは 404 になる。デプロイ前に失敗するとアプリはプレビューにだけ残る | 参照するときは `preview: true` を使う。`tools/fixture-app/inspect.ts` で状態を確認できる |
| **`op run` は環境変数側の `op://` も解決しようとする** | env ファイルだけでなく、継承した環境変数に含まれる参照も対象。`~/.claude/settings.json` の `NP_TRIAGE_INQUIRY_*` / `SD_WEEKLY_REPORT_*` が別 vault を指していると、無関係なコマンドが vault エラーで落ちる | 実行時にそれらを `env -u` で外す |
| `KintoneRestAPIError.message` は詳細を言わない | 「入力内容が正しくありません」までしか出ない | `errors` を展開する（`tools/shared/client.ts` の `describeError`） |
| ゲストスペースは API パスが変わる | `/k/guest/{id}/v1/...`。クライアント生成時に `guestSpaceId` が必要で**後から切り替えられない** | `KINTONE_SPACE_ID` と `KINTONE_GUEST_SPACE_ID` を別変数にする |
| `op run` は秘密値と一致する文字列を出力から全てマスクする | スペース ID のような短い数値を 1Password に入れると、出力中の同じ数字が全部 `<concealed>` になる | 秘密でない値は `.env` に直値で書く |

---

## 未確定事項

| # | 内容 | 判断の材料 |
| --- | --- | --- |
| 1 | テーブル内フィールドのコードでも change イベントが発火するか | 採取ツールは修正済み。次回の採取で確認できる |
| 2 | `error` を設定して `submit` を返したときの挙動（保存が止まるか） | 型は optional で書けるので急がない |
| 3 | 画面別レコード型の具体的な導出規則 | `value` の型自体が画面ごとに違うことが判明したため、`Omit` / `Readonly` では表せない。実測レポートの表を根拠に個別に定義する |
| 4 | 代入 API のフィールドコード解決方式 | `@kintone/dts-gen` のアプリ固有型と組み合わせた場合と、コードが `string` の動的ケースの二段構え |
| 5 | インライン編集 / 印刷画面 / mobile の採取 | 未採取。優先度は低い |

**決着した項目**

| 内容 | 結論 | 決着日 |
| --- | --- | --- |
| ルックアップのコピー先を REST 書き込みに含めるとどうなるか | **無視される**。変換にメタ情報は不要 | 2026-08-30 |
| メタ有無で戻り値をブランド型で区別するか | **不要**。区別する対象が消えた | 2026-08-30 |

## 型の名前

フィールド型の名前空間は **`Saved` / `Editing` / `Rest`** の 3 つ。

実測が示した区別は「保存されている値がそのまま渡されるもの」と
「編集中のフォームが保持している値」なので、名前もそれをそのまま表す。

| 名前空間 | 出どころ | 特徴 |
| --- | --- | --- |
| `Saved` | `detail.show` / `index.show` / `edit.show` / `submit.success` の event.record | サーバ由来。undefined は現れない |
| `Editing` | 作成画面、`kintone.app.record.get()`、`change.*` / `submit` の event.record | フォームの状態。未入力が undefined |
| `Rest` | REST API | `@kintone/rest-api-client` の `KintoneRecordField` を名前だけ揃えて再エクスポート。`DROP_DOWN` が null になりうる |

**捨てた候補**

- `View` / `Live` — 当初の案。`Live` が何を指すか読んで分からない。`edit.show` は編集画面なのに `View` に入るのも直感に反する
- `Server` / `Form` — 出どころで説明する案。`Rest` もサーバ由来なので `Server` との境界が曖昧になる
- `Displayed` / `Editing` — `submit.success` が表示ではないので当てはまりが悪い
- `Normalized` / `FormState` — 実装の事実には最も忠実だが、kintone を知っていても一読で意味が取れない

## 全種別の重複をどう扱うか

フィールド種別の一覧は 5 箇所に書き下されている。
`Saved` の型 / `Editing` の型 / `VALUE_SHAPE` / ガード / 構築子。

**導出しない。**条件型で `Editing` を `Saved` から作れば重複は消えるが、
ホバー表示とエラーメッセージが読めなくなる。
kintone-typeguard が `FFF<A, B, C, D>` でそれをやって失敗した道。
このライブラリの利用者はプラグイン開発者で、
型を読んで挙動を理解できることが利得の中心にある。

代わりに **ずれたら落ちる仕掛け**を置く。
`test/fieldTypes.ts` の `OBSERVED_FIELD_TYPES` を軸に 3 方向を突き合わせる。

| 突き合わせ | どこ | 落ちる条件 |
| --- | --- | --- |
| 一覧 ↔ フィクスチャ | `test/coverage.test.ts` | 実測に現れた種別が一覧に無い / 一覧にあるのに観測されていない |
| 一覧 ↔ 型 | `test/coverage.test-d.ts` | `Saved.OneOf` / `Editing.OneOf` が一覧と一致しない |
| 一覧 ↔ 実装 | `test/coverage.test.ts` | `VALUE_SHAPE` / ガード / 構築子に漏れがある |

kintone に種別が増えたときは、フィクスチャを採り直す → 一覧が落ちる →
一覧に足す → 型と実装が落ちる、の順に必ず気づける。
変異テストで 3 方向とも実際に落ちることを確認済み。

重複を許す代わりに、**気づかないまま放置されることを許さない**という取り引き。

## 公開 API の型を推論に委ねない

`field.subtableRow` の戻り値は推論に任せていた。
その結果 `.d.ts` に出る型が **式の書き方に依存**していた。

```ts
) => (id === undefined ? { value } : { id, value })   // → { value: T } | { id: string; value: T }
) =>
	id === undefined ? { value } : { id, value }      // → { value: T; id?: never } | ...
```

前者だと `row.id` が読めない。TypeScript 7 へ上げたときに発覚した。

`.d.ts` の生成は型推論とは別処理で、推論結果を保てるとは限らない。
**外に出る型は明示する**。

### src のテストでは捕まらない

このとき src に対する `tsc` も vitest の型テストも全て通っていた。
壊れるのはパッケージを入れた利用者側だけ。

そこで `test/dist/consumer.ts` を置き、`pnpm run build` の最後
（`build:check`）でビルド成果物を利用者と同じ立場から型検査する。
修正前のソースで実際に落ちることを確認済み。

## グローバル型の拡張を import の副作用にしない

`kintone-record` を import してもグローバルは変わらない。
有効にするには `kintone-record/kintone` を明示的に import する。

**理由**: `toRestWrite` / `field.*` は rest-api-client と組み合わせて
サーバサイドでも使える。そこで `kintone` グローバルが生えていると
`kintone.events.on(...)` がコンパイルを通り、実行時に落ちる。
**存在しないものを型が保証する**状態で、このライブラリの目的と正反対。

**エントリ名を `kintone` にした理由**: 調べた範囲で `globals` という名前を
使っているパッケージは無かった。実際の慣行は「動く場所」（`vite/client`）、
「何をするか」（`dotenv/config`）、「宣言する対象」（`@kintone/dts-gen/kintone.d.ts`）
のいずれかで、仕組みで名付けている例が無い。
宣言する対象を名前にすると、dts-gen からの移行差分もそのまま読める。

**実行時ファイルが必要**: 副作用 import なので、型だけの exports エントリだと
`ERR_PACKAGE_PATH_NOT_EXPORTED` になる（検証済み）。
`dist/kintone.js` は空だが出力する。

**dts-gen との共存**: `tsconfig` の `include` の順に関わらず
`kintone-record` の型が優先されることを `events.on` と `record.get` の両方で確認済み。

## 採取文脈の下限を固定する

型の主張の中には、**特定の採取が存在すること**に依存しているものがある。
ところが既存のテストの多くは全称型で、サンプルが減っても素通りで通る。

`disabled` / `error` が読み取りに存在しないという主張の根拠は
`screen.*.afterSet` の 2 サンプルだけだが、これを採り忘れても
「どのサンプルにも disabled は無い」は通る。
**テストは全部緑のまま根拠だけが消える**。

`test/contexts.ts` の `REQUIRED_CONTEXTS` が、採取が満たすべき下限を定める。
各項目は「この採取が無いと、どの主張の根拠が消えるか」を持つ。
`OBSERVED_FIELD_TYPES` がフィールド種別に対してやっていることを、採取文脈に対してやる。

change イベントだけは接頭辞で要求する。イベント名に埋まるフィールドコードは
採取スクリプトの都合で決まるもので、kintone の仕様ではないため。
ただしサブテーブルの change は `changes.row` が null にならない唯一のケースなので
コードまで指定する（テーブルのコードは `fields.ts` で我々が決めている）。

## kintone.app.record.set() の type は必須

**実測 2026-08-30。** `type` を省くと実行時に落ちる。

```js
kintone.app.record.set({ record: { singleLineText: { value: "x" } } });
```
```
カスタマイズ用のJavaScriptの実行時にエラーが発生しました。
- event.record['singleLineText'].type が不正です。
```

当初 `KintoneSetRecord` は `type?: string` と宣言していたが、**根拠が無かった**。
dts-gen が `set(record: any)` なので参照元も無く、
「部分更新できる」という事実から「type も省ける」と推測していた。

部分更新はできる（変えたいフィールドだけ渡せばよい）が、
渡すフィールドには `type` が要る。この 2 つは別の話だった。

型テストにも「`type` を省いた set()」が書かれており、
**誤った信念がテストとして固定されていた**。実測で否定されたので両方直した。

このライブラリの `field.*` 構築子は常に `{ type, value }` を返すので、
構築 API を通していれば最初から踏まない。

## kintone.app.record.set() は change イベントを発火する

**実測 2026-08-30。同期で発火する。**

| 画面 | set() 前 | 同期直後 | 1 タスク後 |
| --- | --- | --- | --- |
| 作成 | 0 | **1** | 1 |
| 編集 | 0 | **2**（ハンドラ多重登録のため。実イベントは 1 回）| 2 |

カウンタは set() の直前と直後に同期で読んでいる。JavaScript は単一スレッドなので
その間に他の処理は入れない。したがって発火元は set() で確定。

一般には「set() は change を発火しない」と言われるが、**実測は逆だった**。
推測で決めていたら e2e の設計を誤っていた。

**e2e への帰結**: change イベントの採取に、フィールドへの実入力が要らない。
Playwright は probe のボタンを押すだけでよく、
**kintone 内部の DOM に一切触らずに済む**。
kintone の UI 更新で採取が壊れる経路が消えるので、長期運用として決定的に有利。

## 採取ハンドラの多重登録

上の測定で編集画面のカウントが 2 になったのは、set() が 2 回発火したのではなく
**ハンドラが 2 回登録されていた**ため（記録された 2 件は data も envelope も完全一致）。

`boot` は detail.show / edit.show など画面イベントごとに走る。
kintone は詳細→編集をページ再読み込みなしで遷移するので、
遷移のたびに change ハンドラが増えていた。

凍結フィクスチャにも同じ重複がある（`edit.change` の件数が 8 / 4 / 4 / 2 / 2 と全て偶数）。
同一データなので型の導出は誤っていないが、`report.md` の `n` を水増ししていた。

**e2e では致命的**になる。「操作を固定すれば同じ結果」という前提が、
画面遷移の経路によって崩れるため。登録呼び出しを 1 つのプロミスに畳んで修正した。
真偽値のフラグでは `getFieldCodes` の待ち時間に 2 回目が通過するので足りない。

## 実測の根拠を e2e 採取に置き換えた

**2026-08-30。** 手動で採った 84 サンプルを捨て、e2e が採った 26 サンプルを根拠にした。

**理由**: 再現できない根拠は、検証できない根拠。
手動フィクスチャは採取ツールのバグで 2 サンプルが誤ラベルされ、
`tools/fixture/clean.ts` を書いて除外する必要があった。
あのまま型を起こしていたら「詳細画面の値は undefined になりうる」という誤った型になっていた。

**e2e のほうが厳密だった証拠**: 手動フィクスチャには
`changes.row` が非 null のサンプルが **1 件も無かった**。
`ChangeEvent.row: Editing.SubtableRow | null` の非 null 側は、
実測の裏づけが無いまま型に書かれていた。

サンプル数は 84 → 26 に減ったが、`REQUIRED_CONTEXTS` は全て満たしており、
既存の 195 テストが全て通る。多いことより、何を含むかが決まっていることが重要。

## 採取結果は決定的である

**2 回の独立した実行がバイト単位で一致することを確認済み**（md5 も同一）。
別のレコード、別の時刻、別の fileKey にもかかわらず。

これが成立するのは 2 つの設計による。

1. **固定フロー**（レコード追加 → 詳細 → 編集 → 一覧 → 削除）。
   既存レコードを触らないので状態が累積的に汚れない。
   毎回まっさらなレコードから始まるので `$revision` は必ず 1 → 2 になり、
   正規化の対象にしなくてよい。ずれたら本物の信号になる
2. **正規化層**（`tools/fixture/normalize.ts`）。実行ごと・環境ごとに変わる値だけを伏せる

値そのものは潰さない。kintone の更新で日時フォーマットが変わるような
**値の変化こそ検出したい**ため。伏せるのは列挙したものだけ。

### 正規化で踏んだこと

- **フィールドコードではなく `type` で判定する**。「レコード番号」「作成日時」は
  環境の言語で変わるが `RECORD_NUMBER` / `CREATED_TIME` は変わらない
- **空文字は伏せない**。`""` と非空の区別は DROP_DOWN の型を決めた根拠で、
  潰すと `"" | string` が `string` になって型が変わる
- **`changes.row` の行 id が漏れていた**。SUBTABLE 配下の行は拾えていたが、
  `changes.row` は `type` を持たない裸のオブジェクトなので経路から外れていた。
  2 回の採取で id だけが 47 と 49 に食い違って発覚した
- **probe 自身が `Date.now()` を書き込んでいた**。こちらが毎回違う値を書くと
  本物の変化が埋もれる。画面名を混ぜた決定的な値に変えた
  （同じ値の再設定では change が飛ばないため、画面ごとに変える必要がある）

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

## 採取カスタマイズの適用は CI から行わない

`updateAppCustomize` には **kintone のシステム管理権限**が要る（公式ドキュメント）。
アプリ管理権限だけでは足りない。実際に CI で `403 CB_NO02` を踏んで判明した。

| API | 必要な権限 |
| --- | --- |
| `updateAppCustomize`（書き込み） | **システム管理権限** + アプリ管理権限 |
| `getAppCustomize`（読み取り） | アプリ管理権限のみ |

システム管理権限は組織全体に効くので、
**「権限を検証アプリ 2 つに限定する」という方針（Q9）が成立しない**。
しかもこれは「アプリに任意の JS を仕込める」権限で、CI に置くと
main にマージされたコードが組織内の任意のアプリに JS を仕込めることになる。
得るもの（貼り直しの自動化）に対して代償が大きすぎる。

**probe.js は変わらない限り貼り直す必要がない。**
適用は probe を変えたときに人がローカルから行い、
定期ジョブは**貼られているものが手元のビルドと同一かを確認するだけ**にする
（`tools/fixture-app/checkProbe.ts`）。読み取りなのでアプリ管理権限で足りる。

確認はサイズではなく**配信されている実物をダウンロードしてハッシュで比べる**。
サイズが同じで中身が違う変更を見逃さないため。
古い probe で採った結果を「kintone が変わった」と誤認するのが最悪の失敗なので、ここは厳密にする。

取りこぼす risk は「probe.js を変えたのに貼り直し忘れる」だが、
それはこの確認が検出して適用コマンドを案内する。
確認を入れる前のほうが危険だった（古い probe のまま採取が進む）。

## 適用の失敗は kintone 由来のことがある

手元での適用（`pnpm run app:deploy-probe`）で
kintone が一過性の 500（`GAIA_CS02`「予期せぬエラーが発生しました」）を返すことがある。実際に踏んだ。

そのとき適用が中途半端に終わり、続く採取が「パネルが出ない」で失敗する。
症状が「カスタマイズが動いていない」なので原因が分かりにくい。
適用が失敗したら、成功するまで繰り返すこと。

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

## change イベントは操作の経路で名前が変わる

**実測 2026-08-31。** ハンドラを 270 件（テーブルのコードを含む）登録した状態で、
作成画面と編集画面の両方で測定。両画面で結果は一致した。

| 操作 | UI 経由 | JS API (`set()`) 経由 |
| --- | --- | --- |
| 表外フィールドの値変更 | 測定不能 | `change.<フィールドコード>` |
| 表内セルの値変更 | 測定不能 | `change.<表内フィールドのコード>` |
| 行の追加 | **`change.<テーブルのコード>`** | `change.<表内フィールドのコード>` |
| 行の削除 | **`change.<テーブルのコード>`** | **発火しない** |

**同じ操作でも経路でイベント名が違う。** 行の追加はその典型で、
UI ならテーブルのコード、`set()` なら表内フィールドのコードで飛ぶ。

`changes.row` は表内の変更で非 null、表外の変更で null。

### 測定不能なマスがある

UI での値入力は測れない。**kintone のフィールド入力欄には accessible name が無く**、
役割と名前では掴めないため（`e2e/inspect.spec.ts` で実物を確認）。
内部セレクタ（`.gaia-*`）を使えば可能だが、規約で禁止しており kintone の更新で壊れる。

行操作は掴める（`button "Add row"` / `button "Delete this row"`）ので測定できた。

参考: UI での値入力は**フォーカスを外したときに** `change.<フィールドコード>` が飛ぶ
（開発者による手動確認。フィクスチャには含まれない）。

### この結論に至るまでに 3 回間違えた

**1 回目**: 仮説（行操作はテーブルのコードで飛ぶ）を `set()` だけで検証し、
「仮説が外れた」と結論した。経路の違いを見ていなかった。

**2 回目**: 「飛ばなかった」と報告したが、
**そのハンドラを登録していたかを確認していなかった**。
登録漏れなら「飛ばなかった」ではなく「聞いていなかった」で、まったく別の話になる。

**3 回目**: UI 操作の計測窓を**行数の変化**で閉じた。
change イベントは行数の反映より遅れて飛ぶため、
**各操作のイベントを 1 つずつ後ろの操作に取り違えた**。
「作成画面では飛ぶが編集画面では飛ばない」という不可解な結果はこれが原因だった。

いずれも**測っていないことを測ったことにした**のが原因。対策を 4 つ入れた。

- 登録した change イベント名を probe が保持し、**測定前に e2e が確認する**
- 発火した**イベント名そのもの**を記録する（以前は回数だけで、何が飛んだかは推測）
- `set()` が**意図した効果を持ったか**を検証する（投げないことを成功として記録していた）
- UI 操作は**イベントが飛ぶまで待ってから**窓を閉じる（上限付き。上限に達したら発火なしと記録）

**測る前に、埋めるべき表を書くべきだった。**
「経路 × 操作 × 画面」の全体像を先に定義していれば、
1 つずつ変えて走らせては別の問題に気を取られる、という進め方にはならなかった。

## set() は value キーを省略できない

**実測 2026-08-31。** 未設定のセルで `value` ごと省くと、
`set()` が受け付けたように見えて**行が追加されない**。
`value: undefined` を明示的に渡すのは通る。

```js
{ type: "SINGLE_LINE_TEXT" }                    // 行が追加されない
{ type: "SINGLE_LINE_TEXT", value: undefined }  // 通る
```

読み取り側では「未入力はキーが無いこと」ではなく「値が undefined」だったが、
**書き込み側はキーの有無が効く**。読み書きで非対称。

`type` は省略すると**うるさく落ちる**（「type が不正です」）のに、
`value` は**静かに無視される**。知らずに踏むと原因が分からない。

## 新規行に id は要らない

**実測 2026-08-31。** 保存済みレコードの表に `id` を持たない行を
`kintone.app.record.set()` で足すと受け付けられ、読み直すと `id: null` の行として返る。
既存の行の id はそのまま（既存行 id="75" のまま、追加した行が id=null）。

作成画面では全行が `id: null` なので区別がつかない。
保存済みレコードで測って初めて意味のある結果になる。

## 参照

- 実測の手順: [`../README.md`](../README.md)
- 実測レポート: [`../fixtures/report.md`](../fixtures/report.md)（生データは `fixtures/measured-*.json`）
- REST 書き込みの受け入れ挙動: [`../fixtures/write-behavior.md`](../fixtures/write-behavior.md)
- 採取シリアライザとその不変条件: `src/probe/serialize.ts` / `src/probe/serialize.test.ts`
- 検証アプリのフィールド定義: `tools/fixture-app/fields.ts`
