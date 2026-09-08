# kintone.app.record.set() の受け入れ挙動

ケース数: 22

`toSetRecord`（未実装）が何を落とし、何を変換すべきかの根拠。
「落とすべき」を仕様の推測で決めず、実際に渡した結果で決める（#14）。

**採取日時は載せない。** 正規化で伏せているため
（2 回続けて採るとバイト単位で同じ結果になる、という性質を保つ）。

## 結論

| 確かめたこと | 画面 | 結果 | 前 | 後 |
| --- | --- | --- | --- | --- |
| 値が入った DROP_DOWN に null を渡す（REST の未入力表現。消えるか無視されるか） | screen.edit | 受け入れ | dropDown="beta" | dropDown="<undefined>" |
| DATE に null を渡す（REST も詳細画面も null。DROP_DOWN と同じ形） | screen.edit | 受け入れ | date="2026-08-30" | date="<undefined>" |
| TIME に null を渡す（nullableString の 3 つ目。3 つ揃えて比べる） | screen.edit | 受け入れ | time="12:34" | time="<undefined>" |
| 値が入った SINGLE_LINE_TEXT に null を渡す（string 型なので想定外。対照） | screen.edit | 受け入れ | singleLineText="文字列1行の値" | singleLineText="<undefined>" |
| 読み取り専用の RECORD_NUMBER に別の値を渡す | screen.edit | 無視された | レコード番号="<record-number>" | レコード番号="<record-number>" |
| 読み取り専用の CREATOR に別の値を渡す | screen.edit | 無視された | 作成者={"code":"<entity-code>","name"… | 作成者={"code":"<entity-code>","name"… |
| 読み取り専用の CREATED_TIME に別の値を渡す | screen.edit | 無視された | 作成日時="<datetime>" | 作成日時="<datetime>" |
| 読み取り専用の MODIFIER に別の値を渡す | screen.edit | 無視された | 更新者={"code":"<entity-code>","name"… | 更新者={"code":"<entity-code>","name"… |
| 読み取り専用の UPDATED_TIME に別の値を渡す | screen.edit | 無視された | 更新日時="<datetime>" | 更新日時="<datetime>" |
| 読み取り専用の STATUS に別の値を渡す | screen.edit | 無視された | ステータス="未処理" | ステータス="未処理" |
| 読み取り専用の STATUS_ASSIGNEE に別の値を渡す | screen.edit | 無視された | 作業者=[{"code":"<entity-code>","name… | 作業者=[{"code":"<entity-code>","name… |
| 読み取り専用の CATEGORY に別の値を渡す | screen.edit | **拒否** | カテゴリー=[] | カテゴリー=[] |
| $id / $revision に別の値を渡す（書き換えられてしまうか） | screen.edit | 無視された | $id="<id>" $revision="1" | $id="<id>" $revision="1" |
| CALC に別の値を渡す（REST は受け入れて無視する。set() は別 API） | screen.edit | 無視された | calc="2469" | calc="2469" |
| FILE に 4 キーすべてを渡す（contentType / fileKey / name / size。REST も JS API も同形） | screen.edit | エラーなし（変化は未観測） | file=[] | file=[] |
| FILE に fileKey だけを渡す（kintone-typeguard がこの形に削っている） | screen.edit | エラーなし（変化は未観測） | file=[] | file=[] |
| FILE に空配列を渡す（添付を消せるか） | screen.edit | エラーなし（変化は未観測） | file=[] | file=[] |
| 行 id を付けたままセルを書き換える（id が保たれるか。REST の行をそのまま渡せるか） | screen.edit | 受け入れ ／ 行 id は保たれた | subtable=[{"id":"<row-id>","value"… | subtable=[{"id":"<row-id>","value"… |
| 行 id を外してセルを書き換える（id が振り直されるか、行が置き換わるか） | screen.edit | 受け入れ ／ 行 id は保たれた | subtable=[{"id":"<row-id>","value"… | subtable=[{"id":"<row-id>","value"… |
| confirmed / recordId を付けたまま渡す（JS API 由来をそのまま渡した場合） | screen.edit | 受け入れ | singleLineText="文字列1行の値" | singleLineText="余分なキー付きで渡した値" |
| type を省いて渡す（実測 2026-08-30 では落ちた。回帰として確かめる） | screen.edit | **拒否** | singleLineText="文字列1行の値" | singleLineText="文字列1行の値" |
| 存在しないフィールドコードを渡す | screen.edit | **拒否** |  |  |

## 判定の根拠

`set()` は不正な値を渡しても**例外を投げない**。kintone が「カスタマイズ用の JavaScript の実行時にエラーが発生しました」を画面に出すだけで、呼び出し元には何も返らない。

そのため判定は e2e が画面を見て行う。**エラー文言は汎用で、どのフィールドが原因かは出ない**ので、1 ケースずつ画面を読み直して走らせ、直後の表示を見て 1 対 1 で対応づけている。

| 結論 | 判定 |
| --- | --- |
| **拒否** | kintone がエラーを表示した |
| 無視された | エラーは出ないが値も変わらない |
| 受け入れ | エラーも出ず、値が変わった |
| エラーなし（変化は未観測） | エラーは出ないが、`get()` がその値を見せない（FILE） |
| 判定なし | e2e を通していない（手動実行など） |
| 測っていない | その画面に対象のフィールドが無い |

## 渡したもの

### dropdown-null

```json
{"dropDown":{"type":"DROP_DOWN","value":""}}
```

### date-null

```json
{"date":{"type":"DATE","value":""}}
```

### time-null

```json
{"time":{"type":"TIME","value":""}}
```

### single-line-text-null

```json
{"singleLineText":{"type":"SINGLE_LINE_TEXT","value":""}}
```

### readonly-record_number

```json
{"レコード番号":{"type":"RECORD_NUMBER","value":"<record-number>"}}
```

### readonly-creator

```json
{"作成者":{"type":"CREATOR","value":{"code":"<entity-code>","name":"<entity-name>"}}}
```

### readonly-created_time

```json
{"作成日時":{"type":"CREATED_TIME","value":"<datetime>"}}
```

### readonly-modifier

```json
{"更新者":{"type":"MODIFIER","value":{"code":"<entity-code>","name":"<entity-name>"}}}
```

### readonly-updated_time

```json
{"更新日時":{"type":"UPDATED_TIME","value":"<datetime>"}}
```

### readonly-status

```json
{"ステータス":{"type":"STATUS","value":"実測用の別ステータス"}}
```

### readonly-status_assignee

```json
{"作業者":{"type":"STATUS_ASSIGNEE","value":[{"code":"<entity-code>","name":"<entity-name>"}]}}
```

### readonly-category

```json
{"カテゴリー":{"type":"CATEGORY","value":["実測用の別カテゴリー"]}}
```

### id-revision

```json
{"$id":{"type":"__ID__","value":"<id>"},"$revision":{"type":"__REVISION__","value":"999"}}
```

### calc

```json
{"calc":{"type":"CALC","value":"999999"}}
```

### file-all-keys

```json
{"file":{"type":"FILE","value":[{"fileKey":"<file-key>","name":"set-probe-1.txt","contentType":"text/plain","size":"32"}]}}
```

### file-key-only

```json
{"file":{"type":"FILE","value":[{"fileKey":"<file-key>"}]}}
```

### file-empty

```json
{"file":{"type":"FILE","value":[]}}
```

### subtable-keep-row-id

```json
{"subtable":{"type":"SUBTABLE","value":[{"id":"<row-id>","value":{"t_singleLineText":{"type":"SINGLE_LINE_TEXT","value":"set() で書き換えたセル"},"t_multiLineText":{"type":"MULTI_LINE_TEXT","value":"行1\n複数行"},"t_richText":{"type":"RICH_TEXT","value":"<div>行1</div>"},"t_number":{"type":"NUMBER","value":"10"},"t_calc":{"type":"CALC","value":"20"},"t_checkBox":{"type":"CHECK_BOX","value":["a"]},"t_radioButton":{"type":"RADIO_BUTTON","value":"y"},"t_dropDown":{"type":"DROP_DOWN","value":"p"},"t_multiSelect":{"type":"MULTI_SELECT","value":["m"]},"t_date":{"type":"DATE","value":"2026-01-01"},"t_time":{"type":"TIME","value":"01:00"},"t_dateTime":{"type":"DATETIME","value":"2026-01-01T00:00:00Z"},"t_link":{"type":"LINK","value":"https://example.com/1"},"t_file":{"type":"FILE","value":[]},"t_userSelect":{"type":"USER_SELECT","value":[{"name":"<entity-name>","code":"<entity-code>"}]},"t_organizationSelect":{"type":"ORGANIZATION_SELECT","value":[]},"t_groupSelect":{"type":"GROUP_SELECT","value":[]}}},{"id":"<row-id>","value":{"t_singleLineText":{"type":"SINGLE_LINE_TEXT","value":"set() で書き換えたセル"},"t_multiLineText":{"type":"MULTI_LINE_TEXT","value":""},"t_richText":{"type":"RICH_TEXT","value":"<div><br /></div>"},"t_number":{"type":"NUMBER","value":"20"},"t_calc":{"type":"CALC","value":"40"},"t_checkBox":{"type":"CHECK_BOX","value":[]},"t_radioButton":{"type":"RADIO_BUTTON","value":"x"},"t_dropDown":{"type":"DROP_DOWN","value":""},"t_multiSelect":{"type":"MULTI_SELECT","value":[]},"t_date":{"type":"DATE","value":""},"t_time":{"type":"TIME","value":""},"t_dateTime":{"type":"DATETIME","value":""},"t_link":{"type":"LINK","value":""},"t_file":{"type":"FILE","value":[]},"t_userSelect":{"type":"USER_SELECT","value":[]},"t_organizationSelect":{"type":"ORGANIZATION_SELECT","value":[]},"t_groupSelect":{"type":"GROUP_SELECT","value":[]}}},{"id":"<row-id>","value":{"t_singleLineText":{"type":"SINGLE_LINE_TEXT","value":"set() で書き換えたセル"},"t_multiLineText":{"type":"MULTI_LINE_TEXT","value":""},"t_richText":{"type":"RICH_TEXT","value":"<div><br /></div>"},"t_number":{"type":"NUMBER","value":""},"t_calc":{"type":"CALC","value":"0"},"t_checkBox":{"type":"CHECK_BOX","value":[]},"t_radioButton":{"type":"RADIO_BUTTON","value":"x"},"t_dropDown":{"type":"DROP_DOWN","value":""},"t_multiSelect":{"type":"MULTI_SELECT","value":[]},"t_date":{"type":"DATE","value":""},"t_time":{"type":"TIME","value":""},"t_dateTime":{"type":"DATETIME","value":""},"t_link":{"type":"LINK","value":""},"t_file":{"type":"FILE","value":[]},"t_userSelect":{"type":"USER_SELECT","value":[]},"t_organizationSelect":{"type":"ORGANIZATION_SELECT","value":[]},"t_groupSelect":{"type":"GROUP_SELECT","value":[]}}}]}}
```

### subtable-drop-row-id

```json
{"subtable":{"type":"SUBTABLE","value":[{"value":{"t_singleLineText":{"type":"SINGLE_LINE_TEXT","value":"set() で書き換えたセル"},"t_multiLineText":{"type":"MULTI_LINE_TEXT","value":"行1\n複数行"},"t_richText":{"type":"RICH_TEXT","value":"<div>行1</div>"},"t_number":{"type":"NUMBER","value":"10"},"t_calc":{"type":"CALC","value":"20"},"t_checkBox":{"type":"CHECK_BOX","value":["a"]},"t_radioButton":{"type":"RADIO_BUTTON","value":"y"},"t_dropDown":{"type":"DROP_DOWN","value":"p"},"t_multiSelect":{"type":"MULTI_SELECT","value":["m"]},"t_date":{"type":"DATE","value":"2026-01-01"},"t_time":{"type":"TIME","value":"01:00"},"t_dateTime":{"type":"DATETIME","value":"2026-01-01T00:00:00Z"},"t_link":{"type":"LINK","value":"https://example.com/1"},"t_file":{"type":"FILE","value":[]},"t_userSelect":{"type":"USER_SELECT","value":[{"name":"<entity-name>","code":"<entity-code>"}]},"t_organizationSelect":{"type":"ORGANIZATION_SELECT","value":[]},"t_groupSelect":{"type":"GROUP_SELECT","value":[]}}},{"value":{"t_singleLineText":{"type":"SINGLE_LINE_TEXT","value":"set() で書き換えたセル"},"t_multiLineText":{"type":"MULTI_LINE_TEXT","value":""},"t_richText":{"type":"RICH_TEXT","value":"<div><br /></div>"},"t_number":{"type":"NUMBER","value":"20"},"t_calc":{"type":"CALC","value":"40"},"t_checkBox":{"type":"CHECK_BOX","value":[]},"t_radioButton":{"type":"RADIO_BUTTON","value":"x"},"t_dropDown":{"type":"DROP_DOWN","value":""},"t_multiSelect":{"type":"MULTI_SELECT","value":[]},"t_date":{"type":"DATE","value":""},"t_time":{"type":"TIME","value":""},"t_dateTime":{"type":"DATETIME","value":""},"t_link":{"type":"LINK","value":""},"t_file":{"type":"FILE","value":[]},"t_userSelect":{"type":"USER_SELECT","value":[]},"t_organizationSelect":{"type":"ORGANIZATION_SELECT","value":[]},"t_groupSelect":{"type":"GROUP_SELECT","value":[]}}},{"value":{"t_singleLineText":{"type":"SINGLE_LINE_TEXT","value":"set() で書き換えたセル"},"t_multiLineText":{"type":"MULTI_LINE_TEXT","value":""},"t_richText":{"type":"RICH_TEXT","value":"<div><br /></div>"},"t_number":{"type":"NUMBER","value":""},"t_calc":{"type":"CALC","value":"0"},"t_checkBox":{"type":"CHECK_BOX","value":[]},"t_radioButton":{"type":"RADIO_BUTTON","value":"x"},"t_dropDown":{"type":"DROP_DOWN","value":""},"t_multiSelect":{"type":"MULTI_SELECT","value":[]},"t_date":{"type":"DATE","value":""},"t_time":{"type":"TIME","value":""},"t_dateTime":{"type":"DATETIME","value":""},"t_link":{"type":"LINK","value":""},"t_file":{"type":"FILE","value":[]},"t_userSelect":{"type":"USER_SELECT","value":[]},"t_organizationSelect":{"type":"ORGANIZATION_SELECT","value":[]},"t_groupSelect":{"type":"GROUP_SELECT","value":[]}}}]}}
```

### lookup-extra-keys

```json
{"singleLineText":{"type":"SINGLE_LINE_TEXT","value":"余分なキー付きで渡した値","confirmed":true,"recordId":"1"}}
```

### no-type

```json
{"singleLineText":{"value":"type を省いた"}}
```

### unknown-field-code

```json
{"この項目は存在しない":{"type":"SINGLE_LINE_TEXT","value":"x"}}
```

