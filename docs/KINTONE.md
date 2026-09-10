# kintone の挙動

**測って分かった kintone 自体の事実。** どのパッケージの設計判断でもない。

パッケージを増やしても再測定しなくて済むように、ここに集める。
設計判断は各 `packages/*/docs/DECISIONS.md`、
環境とツールチェーンは [`TOOLCHAIN.md`](TOOLCHAIN.md)。

**測った範囲より広いことを書かない。** 「常に返る」を確かめて
「判定できない」と結論した記述が実際に 1 つあり、実測で否定された
（`packages/monosashi/docs/DECISIONS.md`「enabled は使える」）。
**何を確かめたのかを書く。**

根拠のデータは 2 つ。

| | |
|---|---|
| レコードの値 | `packages/monosashi/fixtures/measured.json` |
| フォーム定義 | `packages/kisekae/fixtures/form/definition.json` |

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
| **`getFormFields` は CATEGORY / STATUS を、設定が無効でも常に返す** | プロセス管理を有効化していないアプリでも `カテゴリー` / `ステータス` / `作業者` が返る（2026-08-30 実測）。一方レコードにはこれらの type は現れない。**ただし `enabled` が設定を反映するので、返ってくること自体は判定の妨げにならない**（2026-09-10 実測。[`enabled` は使える。「判定できない」は測っていないことを書いていた](../packages/monosashi/docs/DECISIONS.md#enabled-は使える判定できないは測っていないことを書いていた)） | 検証はレコードの `type` から行う（`tools/fixture-app/verify.ts`）。`enabled` で判定する形にも変えられるが、レコード側の検証はそのままで正しいので急がない。フィールドコードは環境の言語で変わる（`カテゴリー` / `Categories`）ので**コード名ではなく `type` で判定する** |
| **`addFormFields` は参照先フィールドが先に必要** | ルックアップの `fieldMappings`、関連レコード一覧の `condition.field` | 2パスに分割。1回にまとめると `CB_VA01` で弾かれる |
| **`addApp` はプレビュー環境にしか作らない** | `deployApp` するまで運用環境の API（`getApp` / `getRecords`）からは 404 になる。デプロイ前に失敗するとアプリはプレビューにだけ残る | 参照するときは `preview: true` を使う。`tools/fixture-app/inspect.ts` で状態を確認できる |
| **`op run` は環境変数側の `op://` も解決しようとする** | env ファイルだけでなく、継承した環境変数に含まれる参照も対象。`~/.claude/settings.json` などで設定された参照が別 vault を指していると、無関係なコマンドが vault エラーで落ちる | 実行時に `env -u` で外す。**外す変数を列挙してはいけない**（2026-09-02: 列挙していたら後から増えた変数で落ちた）。`op://` を値に持つ変数を毎回数え上げる形にする（README 参照） |
| `KintoneRestAPIError.message` は詳細を言わない | 「入力内容が正しくありません」までしか出ない | `errors` を展開する（`@jissoku/rig` の `describeError`） |
| ゲストスペースは API パスが変わる | `/k/guest/{id}/v1/...`。クライアント生成時に `guestSpaceId` が必要で**後から切り替えられない** | `KINTONE_SPACE_ID` と `KINTONE_GUEST_SPACE_ID` を別変数にする |
| **`getViews` は kintone 既定の一覧を返さない** | 検証アプリで返るのはプロセス管理が自動で作る「（作業者が自分）」1 件だけ。開発者が手で開いた既定の一覧は含まれない | 使う一覧は `updateViews` で宣言する。全置換だが**自動作成された一覧は消せない**（`GAIA_IL44`）ので、残したうえで先頭に足す |
| **プロセス管理の先頭ステータスの作業者は限定される** | `CB_VA01`「先頭のステータスでは、作業者は空、またはレコードの作成者フィールドを指定します」。`entity.type: "CREATOR"` は弾かれる | `FIELD_ENTITY` で作成者フィールドを指す。ログイン名を書かずに済むので環境非依存 |
| **作業者が空だとアクションボタンが出ない** | 詳細画面に「処理開始」が現れず、`detail.process.proceed` を測れなかった | `build.ts` で作業者を埋める |
| **プロセス管理のアクションは押しただけでは実行されない** | 次のステータスと作業者を示すポップアップが開くだけ。`Confirm` を押して初めてイベントが飛ぶ | 2 段階でクリックする |
| **アクションボタンは `<span title="...">`** | button でも role 付きでもないので `getByRole` では掴めない | `title` で掴む。標準の HTML 属性で、値は我々が決めたアクション名 |
| **関連レコード一覧の条件フィールドはインライン編集できない** | 一覧に出ていても入力欄にならず、値がただの文字で出る（開発者が実機で確認） | 測るときは別の列を使う |
| **インライン編集のボタンは `aria-label` を持つ** | `<button aria-label="Edit">`。開くと `Save` / `Cancel` が現れる | 役割と名前で掴める。内部セレクタは要らない |
| **一覧の行は `load` では出ていない** | ヘッダのボタンが見えた時点で数えると 0 行になり、「レコードが無い」と誤解する | 行が出るまで待つ |
| **UI で行を追加した直後は計算フィールドがまだ計算されていない** | 追加された行の `t_calc` が、実行によって `undefined` だったり `"0"` だったりした。同じ操作なのに基準データに差分が出る。`set()` で足した行は `undefined` のままで安定する | 計算フィールドに値が入るまで待ってから採る。最初は「2 回続けて同じ結果」を条件にしたが、**再計算が始まる前の安定した `undefined` を拾って**しまい直らなかった。待つ対象が分かったなら、それを直接の条件にする |
| **モバイルの show イベントは `load` より後に飛ぶ** | `load` 直後に見ると 1 画面前までの採取しか見えない | 採取そのものを待つ |
| **`submit.success` は画面遷移の前に飛ぶ** | 保存直後の URL はまだ作成画面のまま（`/k/m/2/edit#command=save`）。ここでレコード id を読もうとして失敗した | 遷移を待ってから URL を読む |
| **採取が途中で落ちるとレコードが残る** | id を控える前に落ちると後始末できず、次の実行で一覧の採取結果が変わる | 採取の最初に、`app:build` が入れる 2 件（`$id` が小さい 2 件）以外を消す |
| **削除は UI からしか JS のイベントが飛ばない** | REST で消しても飛ばない。後始末を UI に置き換えると、そのまま採取になる | PC 詳細は `Options` → `menuitem`、モバイル詳細は操作メニューを開いてから `menuitem`、PC 一覧は行の `button` |
| **削除の確認は画面で出し方が違う** | PC は DOM のダイアログ、モバイルは `window.confirm`。Playwright は `window.confirm` を**既定でキャンセル**するので、構えないと削除されない | 押す前に `page.once("dialog")` で承認側に倒し、DOM のダイアログは上限付きで待つ |
| **`href` の無い `<a>` は link ロールを持たない** | 削除の確認が `<a>` で、`getByRole("link")` では見つからなかった | タグと文字で掴む。**`<button>` を候補に混ぜない**。一覧では行ごとに `button "Delete"` があり、ページ全体から探すと確認ではなく 1 行目の削除ボタンを掴む（詳細画面には行のボタンが無いので、そちらだけ見ていると気づけない） |
| **削除すると kintone が一覧へ遷移する** | その最中に次の `goto` を始めると `net::ERR_ABORTED` で落ちる | 着地（一覧のパネル）を待ってから次へ進む |
| **`getClientRects()` は `visibility: hidden` を見抜けない** | 閉じたメニューの中の項目を「押せる」と誤判断して空振りした。`offsetParent` は逆に `position: fixed` を隠れていると誤判断する | 押せるかどうかは Playwright の判定に任せる。DOM の走査は候補を見つけるまでにとどめる |
| **`<button>` の `value` は `""` を返す** | 調査コードで `aria-label ?? title ?? value ?? textContent` と繋いだら、`value` が `""` で止まって**すべてのボタンの文字が消えた**。採取パネルのボタン 10 個を「無い」と読み違えた | 空でない最初の候補を選ぶ。`??` は空文字を通す |
| **印刷画面は `window.print()` を呼ぶ** | Playwright ではブラウザの印刷ダイアログを閉じられず、開くと以降の操作が全て止まる（実測: テストが 30 秒でタイムアウト） | 遷移前に `addInitScript` で `window.print` を空関数に差し替える。kintone の DOM には触らない |
| **委譲は「検出できない `any`」と引き換えだった** | `Rest` を `@kintone/rest-api-client` に委ねていたが、利用者がそれを入れていないと `skipLibCheck: true`（TS の既定）で型が `any` に落ち、`strict` も `noImplicitAny` も警告も効かない。緩和策も全て効かなかった（optional peer は無信号、必須 peer も pnpm は自動インストールも警告もしない、型側の `any` 検出はモジュール未解決時に型エイリアス全体が `any` になり条件型に到達しない） | **自前で持つ。** 解決すべき外部モジュールが無くなり構造的に消える。定義は 55 行で、`Entity` / `FileInformation` は既存のものを使える。乖離は `rest.test-d.ts` の等価性テストで縛る（devDependency はこのリポジトリに常に在る） |
| **型だけの依存でも、利用者は実行時のコードを引く** | `@kintone/rest-api-client` を参照しているのは `RestRecord` の定義だけなのに、`dependencies` にあると全利用者が 7MB と axios ほか 5 個を入れることになる。さらに `skipLibCheck: false` の利用者は rest-api-client の `.d.ts` 経由で `@types/node` を要求される（`https` / `Buffer` / `stream`） | REST の型を `monosashi/rest` に切り出し、依存を optional な peerDependency にする。本体は一切依存しない |
| **peerDependency が無いと型は黙って `any` になる** | 入れずに読み、`Rest.Number` に `{ type: "SINGLE_LINE_TEXT", value: 123 }` を代入しても `skipLibCheck: true`（TS の既定）ではエラーにならない。`skipLibCheck: false` なら `TS2307` で落ちる | **消せない**ので、被る範囲を「REST の型を明示的に読んだ人」に限定する。挙動自体は `pack:check` で固定し、変わったら気づけるようにする |
| **既定の registry が npmjs とは限らない** | この環境では `https://npm.flatt.tech/`（社内プロキシ）を向いていた。明示しないと `pnpm publish` がそちらへ行く | `publishConfig.registry` で公開先を固定する |
| **CI がステップを並べると、手元と CI がずれる** | 手元で「CI と同じもの」を回すのに YAML を読む必要があり、片方だけ更新されても気づかない。実際、CI に `pack:check` が入っておらず `exports` が壊れても緑のままだった | 検査の定義は `package.json` の `check` 1 箇所に置き、CI はそれを呼ぶだけにする |
| **相対パスで dist を読む検査は `exports` を通らない** | `test/dist/consumer.ts` は `../../dist/index` を読むので、`exports` マップが壊れていても緑のまま。`exports` から `./kintone` を消して確認した | `pnpm pack` した tarball を空のプロジェクトに入れ、パッケージ名で読む検査を別に持つ（`pack:check`） |
| `moduleResolution: node10` は TypeScript 7 で削除された | `Option 'moduleResolution=node10' has been removed` | 検査対象は `bundler` と `nodenext` の 2 つ |
| `op run` は秘密値と一致する文字列を出力から全てマスクする | スペース ID のような短い数値を 1Password に入れると、出力中の同じ数字が全部 `<concealed>` になる | 秘密でない値は `.env` に直値で書く |

---

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

## 行操作だけ、経路で change イベント名が違う

**実測 2026-08-31。** UI 操作と `kintone.app.record.set()` の両方を、
作成画面・編集画面の両方で測定。ハンドラは 270 件（テーブルのコードを含む）登録済み。
**両画面で結果は一致した。**

サブテーブルには 2 つのイベント名がある。**同時には飛ばない。**

- `change.<テーブルのコード>` … 例 `app.record.edit.change.subtable`
- `change.<表内フィールドのコード>` … 例 `app.record.edit.change.t_singleLineText`

| 操作 | 経路 | `change.<テーブルのコード>` | `change.<表内フィールドのコード>` |
| --- | --- | --- | --- |
| セルの値を変える | UI | 飛ばない | **飛ぶ** |
| セルの値を変える | `set()` | 飛ばない | **飛ぶ** |
| 行を追加する | UI | **飛ぶ** | 飛ばない |
| 行を追加する | `set()` | 飛ばない | 飛ばない |
| 行を削除する | UI | **飛ぶ** | 飛ばない |
| 行を削除する | `set()` | 飛ばない | 飛ばない |

まとめるとこうなる。

- **`set()` は行の増減では何も発火しない。** 発火するのはセルの値が変わったときだけ
- **UI は行の増減で `change.<テーブルのコード>` を発火する**

したがって `set()` で表を書き換えるプラグインは、
自分の変更を change イベントで捕まえることを期待できない。

### 発火源が「値」であることの直接証拠

同じ `addRow` 操作で、**雛形の行の状態だけを変えると結果が変わる**。

| 画面 | 雛形の行 | 飛んだイベント |
| --- | --- | --- |
| 作成 | 空（`value: undefined`） | **なし** |
| 編集 | 値が入っている | `change.<表内フィールドのコード>` |

行が 1 つ増えるという事実は両方で同じ。違うのは複製した行のセルに値が入るかどうか。
したがって飛んでいるのは**行の増減ではなく値の変化**。

作成画面での結果（発火なし）はコンソールでの手動検証とも一致した。

### 当初この表を誤って書いた

「行を追加する / `set()` → `change.<表内フィールドのコード>` が飛ぶ」と書いていた。
probe が値を入れた行を足していたためで、飛んでいたのはセルの値のせいだった。

UI の行追加ボタンは空の行を足す。値を入れた行と比べていたので**比較になっていなかった**。

「切り分けられない」と一度書いておきながら、表には経路の違いとして書いてしまった。
**切り分けられていない事実を、切り分けたことにして表に載せた**のが誤りの構造。

さらに修正の過程で同じ誤りを 2 回繰り返した。
「作成画面の初期の行は空だから純粋な行追加になる」と書いたが、
**その時点では初期の行ではなくなっていた**（先に実行した操作が雛形に値を入れていた）。
前提の状態を確認せずに書いていた。

## set() に行を渡すなら全セルを揃える

**実測 2026-08-31。** 行の一部のセルだけを渡すと kintone が拒否する。

```
event.record['subtable'].value[1]['t_multiLineText'] is invalid.
```

**エラーの文言が要件を示している。**
セルそのものを省くと「セルが不正」、`value` キーを省くと「`.value` が不正」。
前者は不足、後者は値の不備。

なおコンソールで 1 セルだけを渡して成功した例があり、この点は食い違っている。
エラー表示が出たまま行の追加だけは通った（部分適用）可能性があるが**未解明**。

表の外のフィールドは経路によらず `change.<フィールドコード>` が飛ぶ。

### 「飛ばない」の根拠

計測窓は最初の 1 件が来た時点で閉じるので、それだけでは
「2 件目が来ていない」ことを示せない。change ハンドラは窓と無関係に
全件をサンプルとして残しているので、そちらで検算した。

発火した change サンプル 15 件のうち 14 件が各操作に対応し、
残る 1 件は計測窓を使っていない操作（必須項目の入力）のもの。取りこぼしは無い。

### UI 操作をどう掴んでいるか

kintone の内部セレクタ（`.gaia-*`）は使わない。使うのは 3 つだけ。

| 対象 | 掴み方 |
| --- | --- |
| 行の追加・削除ボタン | 役割と名前（`button "Add row"` / `"Delete this row"`） |
| 表外フィールドの入力欄 | ラベルから祖先を登り、**入力欄が 1 件になった段** |
| 表内セルの入力欄 | ARIA の table / columnheader / row / cell で**列位置から** |

ラベルは `tools/fixture-app/fields.ts` で我々が決めたもので、
kintone の内部実装ではないし環境の言語でも変わらない。

**段数や行番号を決め打ちにしない。** 実測ではラベルの 2 段上、ヘッダー行は 0 行目だが、
そう書くと kintone が入れ子を 1 段変えただけで黙って別の要素を触る。
探索して条件を満たす段・行を使う。

### この結論に至るまでに 4 回間違えた

**1 回目**: 仮説（行操作はテーブルのコードで飛ぶ）を `set()` だけで検証し、
「仮説が外れた」と結論した。経路の違いを見ていなかった。

**2 回目**: 「飛ばなかった」と報告したが、
**そのハンドラを登録していたかを確認していなかった**。
登録漏れなら「飛ばなかった」ではなく「聞いていなかった」で、まったく別の話になる。

**3 回目**: UI 操作の計測窓を**行数の変化**で閉じた。
change イベントは行数の反映より遅れて飛ぶため、
**各操作のイベントを 1 つずつ後ろの操作に取り違えた**。
「作成画面では飛ぶが編集画面では飛ばない」という不可解な結果はこれが原因。

**4 回目**: UI での値変更を「測定不能」と書いた。
`getByRole` の名前で掴めないことを確かめただけで、**他の手段を試していなかった**。
ラベルを起点に DOM をたどれば掴めた。

いずれも**測っていないことを測ったことにした**のが原因。対策を 5 つ入れた。

- 登録した change イベント名を probe が保持し、**測定前に e2e が確認する**
- 発火した**イベント名そのもの**を記録する（以前は回数だけで、何が飛んだかは推測）
- `set()` が**意図した効果を持ったか**を検証する（投げないことを成功として記録していた）
- UI 操作は**イベントが飛ぶまで待ってから**窓を閉じる（上限付き）
- 「掴めない」と結論する前に**候補を並べて実物で試す**（`e2e/inspect.spec.ts`）

**測る前に、埋めるべき表を書くべきだった。**
「経路 × 操作 × 画面」の 16 マスを先に定義していれば、
1 つずつ変えて走らせては別の問題に気を取られる進め方にはならなかった。

## set() は type も value も省略できない

**実測 2026-08-31。** どちらを省いても kintone がエラーを表示する。

```
カスタマイズ用のJavaScriptの実行時にエラーが発生しました。
- event.record['singleLineText'].type が不正です。
- event.record['subtable'].value[1]['t_multiLineText'].value が不正です。
```

`value: undefined` を明示的に渡すのは通る。キーが存在することが要件。

### set() は例外を投げない

**エラーはダイアログに出るだけで、`set()` の呼び出しは例外を投げない。**
そのためスクリプトからは成功に見える。

当初これを「`type` はうるさく落ちるのに `value` は静かに無視される」と書いたが**誤り**。
どちらも同じくダイアログに出る。probe が例外を捕まえられず、
行数だけを見て「無視された」と解釈したのが原因だった。

**「エラーが出ていないこと」を成功と見なせない**のがここでの教訓。
効果（行数が変わったか）を検証していたおかげで気づけたが、
検証が無ければ空振りが実測として残っていた。

## 新規行に id は要らない

**実測 2026-08-31。** 保存済みレコードの表に `id` を持たない行を
`kintone.app.record.set()` で足すと受け付けられ、読み直すと `id: null` の行として返る。
既存の行の id はそのまま（既存行 id="75" のまま、追加した行が id=null）。

作成画面では全行が `id: null` なので区別がつかない。
保存済みレコードで測って初めて意味のある結果になる。

## submit の error で保存を中断できる

**実測 2026-08-31。** 型に `error?: string` と書いてありながら、
採取時は常に event をそのまま返しており**一度も確かめていなかった**。

| 確認したこと | 結果 |
| --- | --- |
| 受け取る event に `error` キーがあるか | **無い**（create: `type` / `appId` / `record`、edit: `+recordId`） |
| 戻り値に `error` を設定すると保存が止まるか | **止まる** |
| 中断時に `submit.success` が飛ぶか | **飛ばない** |
| 中断後にそのまま保存できるか | **できる**（`submit` が再び飛ぶ） |

### 「止まった」をどう判定したか

**「画面が遷移しないこと」では判定できない。** 遷移しないのを待つには時間を決めるしかなく、
遅い遷移と区別がつかない。UI 操作の計測窓で踏んだのと同じ罠。

代わりに肯定的な条件 2 つで見る。

- kintone が `error` のメッセージを画面に表示すること（成功なら詳細画面へ遷移してしまう）
- パネルの `data-screen` が編集中の画面のままであること

どちらも待ち時間に依存しない。

## フォーム定義の実測でわかったこと

**2026-09-10。** `app:collect-form` の初回。kisekae の型の骨格を決めるために採った
（[フォーム定義を測れる状態にする](../packages/monosashi/docs/DECISIONS.md#フォーム定義を測れる状態にする)）。
**4 件のうち 3 件で、ドキュメント由来の主張が外れた。**

### ルックアップのキーフィールドは 6 プロパティだけ返す（公式の型が正しい）

```json
{ "type": "SINGLE_LINE_TEXT", "code": "lookupKey", "label": "ルックアップ",
  "noLabel": false, "required": false, "lookup": { ... } }
```

`minLength` / `maxLength` / `unique` / `defaultValue` / `expression` /
`hideExpression` は**付いてこない**。通常の `SINGLE_LINE_TEXT` は全部持っている。
`@kintone/rest-api-client` の `Lookup` 型の主張どおり。

これは kisekae の型の骨格を決めた
（`packages/kisekae/docs/DECISIONS.md` の「7. ルックアップ」）。

### ルックアップのコピー先には印が付かない。ただし元のフィールドが列挙している

`lookupCopyName` のキー集合は通常の `singleLineText` と**完全に同一**。
コピー先であることを示すプロパティは無い。

一方、キーフィールドの `lookup.fieldMappings` がコピー先を列挙している。

```json
"fieldMappings": [
  { "field": "lookupCopyName",   "relatedField": "name"   },
  { "field": "lookupCopyAmount", "relatedField": "amount" }
]
```

`field` は**同じアプリのフィールドコード**。つまりコピー先の判別は
**対象アプリの `getFormFields` だけでできる**。
`kintone-pretty-fields` の README は `isLookupCopy` に
「Requires lookup source app permissions」と書いているが、
それは実装の都合で、情報が無いからではない。

### LABEL と HR は `elementId` を持って返る（公式の型が外れている）

```json
{ "type": "LABEL", "label": "labelElement", "elementId": "", "size": { "width": "200" } }
{ "type": "HR",                            "elementId": "", "size": { "width": "200" } }
```

`@kintone/rest-api-client` の `fieldLayout.d.ts` は
`Label = { type; label; size }` / `HR = { type; size }` と宣言していて
**`elementId` を持たない**。実測では両方が `elementId: ""` を返す。

`updateFormLayout` には `elementId` を送っていない（`layout.ts` を見れば分かる）。
**kintone が付けて返している。**

### グループの中にレイアウト要素を置ける

`SPACER` / `LABEL` / `HR` をグループの `layout` の中に置いた `updateFormLayout` が通り、
`getFormLayout` もそのまま返した。公式の型
（`Group<T extends Array<Row<Field.OneOf[]>>>`）の主張どおり。

サブテーブルの中身は 17 種のフィールドだけで、レイアウト要素は現れない。
これも公式の型（`InSubtable` が `Label` / `HR` / `Spacer` を `Exclude` している）どおり。

### 名前なしスペーサーの `elementId` は空文字列

```json
{ "type": "SPACER", "elementId": "spacerNamed", "size": { "width": "100", "height": "50" } }
{ "type": "SPACER", "elementId": "",            "size": { "width": "100", "height": "50" } }
```

消費側（kintone-plugins の `shared/src/utils/options.ts:277`）が
`.filter(({ elementId }) => elementId !== "")` で名前なしを捨てている前提は正しい。

### 組み込みフィールドが「properties にあってレイアウトに無い」状態は実在する

ルックアップ元アプリ（app=1）のレイアウトは `key` / `name` / `amount` の
3 行だけで、**組み込みフィールド 5 つ（`RECORD_NUMBER` / `CREATOR` /
`CREATED_TIME` / `MODIFIER` / `UPDATED_TIME`）が `properties` にあって
レイアウトに無い**。

`tools/fixture-app/build.ts` がこのアプリのレイアウトを 3 行で設定しているため。
測定用アプリの方は組み込みを 1 行目に置いているので、この状態にならない。
**2 つのアプリを同時に採ったことで、両方の状態が 1 つのフィクスチャに入った。**

これは kisekae の `unplaced` の 2 種類目（フォームから外した組み込みフィールド）で、
想定ではなく実在することが確かめられた。
`packages/kisekae/test/toForm.test.ts` がこれを縛っている。

なお `enabled` を持つのはプロセス管理系 3 種だけで、
組み込みフィールドは持たない。「置かれていない」ことは
`enabled` では分からない。

### フィクスチャは環境の言語に依存する

`fixtures/form/definition.json` には組み込みフィールドのコードが
キーとして残る（`レコード番号` / `作成者` …）。
ルックアップの `sort` にも入る（`"レコード番号 desc"`）。
**英語環境で採ると別のファイルが出る。**

これは `fixtures/measured.json` も同じで、**伏せない方を選んでいる**
（伏せるとフィクスチャが読めなくなる）。
`tools/fixture/normalizeForm.ts` の「環境ごとに同じファイルが出る」は
**キーの順序についての話**で、コードには及ばない。
