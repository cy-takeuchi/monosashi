# REST updateRecord の受け入れ挙動

測定日: 2026-08-29
対象: app=2 の測定用レコード id=4

変換関数 (`forRestWrite`) が何を落とすべきかの根拠。
「落とすべき」を仕様の推測で決めず、実際に投げた結果で決める。

| 確かめたこと | 結果 | 詳細 |
| --- | --- | --- |
| ルックアップのキーだけを渡す（正しい使い方のはず） | 受け入れ | 受け付けられた — lookupCopyName="ルックアップ元2" lookupCopyAmount="2000" |
| キーとコピー先を両方渡す（変換で落とすべきか判定する本命） | 受け入れ | 受け付けられた — lookupCopyName="ルックアップ元1" |
| コピー先だけを渡す（キーなし） | 受け入れ | 受け付けられた — lookupCopyName="ルックアップ元1" |
| JS API 由来の confirmed / recordId を付けたまま渡す（変換せず投げた場合） | 受け入れ | 受け付けられた |
| disabled / error を付けたまま渡す（UI 専用プロパティ） | 受け入れ | 受け付けられた |
| CALC を渡す（計算フィールドは書き込めないはず） | 受け入れ | 受け付けられた |
| レコード番号を渡す | **エラー** | [400] [GAIA_UN10] RECORD_ID型のフィールドに値を設定することはできません。 (RSJZInvaadAtWWjX72Vk) / code=GAIA_UN10 status=400 |
| 作成日時を渡す | **エラー** | [400] [GAIA_UN10] CREATED_AT型のフィールドに値を設定することはできません。 (uNDle7X7V3SOWK9CeJFW) / code=GAIA_UN10 status=400 |
| 作成者を渡す | **エラー** | [400] [GAIA_UN10] CREATOR型のフィールドに値を設定することはできません。 (jMfRIBdf3nx6S5qhaBpK) / code=GAIA_UN10 status=400 |
| 更新者を渡す | **エラー** | [400] [GAIA_UN10] MODIFIER型のフィールドに値を設定することはできません。 (7l3U32y8x4cjKpL5klfX) / code=GAIA_UN10 status=400 |
| 更新日時を渡す | **エラー** | [400] [GAIA_UN10] MODIFIED_AT型のフィールドに値を設定することはできません。 (pJFvVLBxK27OU9E1jiX2) / code=GAIA_UN10 status=400 |
| 作業者を渡す | **エラー** | [400] [GAIA_UN10] STATUS_ASSIGNEE型のフィールドに値を設定することはできません。 (vpCyyOXRsjzLzzK0d3Ct) / code=GAIA_UN10 status=400 |
| ステータスを渡す | **エラー** | [400] [GAIA_UN10] STATUS型のフィールドに値を設定することはできません。 (sCSRfwNbQkOh7XJ0AgtG) / code=GAIA_UN10 status=400 |
| カテゴリーを渡す | **エラー** | [400] [GA_UO01] APIでは次の操作はできません：カテゴリーの値の編集 (EYPVKJ4LXsCujHBnXZNC) / code=GA_UO01 status=400 |
| $id / $revision をレコードの中に含めて渡す | 受け入れ | 受け付けられた |
| FILE を REST の形（fileKey のみ）で渡す | 受け入れ | 受け付けられた — value=[["fileKey","name","contentType","size"]] |
| FILE を JS API の形（contentType / name / size 付き・有効な fileKey）で渡す。縮約が必須か | 受け入れ | 受け付けられた — value=["probe.txt"] |
| サブテーブルを既存の id 付きで渡す（行が保たれるか） | 受け入れ | 受け付けられた — 行 id = ["23","24"] |
| サブテーブルを id なしで渡す（落とすと全行が新規行になるという想定の検証） | 受け入れ | 受け付けられた — 行数=1 行 id = ["27"] |
| 存在しないフィールドコードを渡す | 受け入れ | 受け付けられた |
| GROUP フィールドを渡す（レコードには現れないが書けるか） | **エラー** | [400] [GAIA_UN10] GROUP型のフィールドに値を設定することはできません。 (p24d8wuQ1oMFObF7LEWG) / code=GAIA_UN10 status=400 |
| 関連レコード一覧を渡す（レコードには現れないが書けるか） | **エラー** | [400] [CB_IJ01] 不正なJSON文字列です。 (d3oxi4hsmSZjOEmm9jSM) / code=CB_IJ01 status=400 |

## 送信したペイロード

### lookup-key-only

```json
{"lookupKey":{"value":"K-002"}}
```

### lookup-key-and-copy

```json
{"lookupKey":{"value":"K-001"},"lookupCopyName":{"value":"手で入れた値"}}
```

### lookup-copy-only

```json
{"lookupCopyName":{"value":"手で入れた値"}}
```

### lookup-with-js-extra-keys

```json
{"lookupKey":{"type":"SINGLE_LINE_TEXT","value":"K-001","confirmed":true,"recordId":"1"}}
```

### disabled-error

```json
{"singleLineText":{"type":"SINGLE_LINE_TEXT","value":"disabled/error 付き","disabled":true,"error":null}}
```

### calc

```json
{"calc":{"type":"CALC","value":"999"}}
```

### system-record-number

```json
{"レコード番号":{"type":"RECORD_NUMBER","value":"999"}}
```

### system-created-time

```json
{"作成日時":{"type":"CREATED_TIME","value":"2020-01-01T00:00:00Z"}}
```

### system-creator

```json
{"作成者":{"type":"CREATOR","value":{"code":"x","name":"x"}}}
```

### system-modifier

```json
{"更新者":{"type":"MODIFIER","value":{"code":"x","name":"x"}}}
```

### system-updated-time

```json
{"更新日時":{"type":"UPDATED_TIME","value":"2020-01-01T00:00:00Z"}}
```

### status-assignee

```json
{"作業者":{"type":"STATUS_ASSIGNEE","value":[]}}
```

### status

```json
{"ステータス":{"type":"STATUS","value":"処理中"}}
```

### category

```json
{"カテゴリー":{"type":"CATEGORY","value":[]}}
```

### meta-id-revision

```json
{"$id":{"type":"__ID__","value":"2"},"$revision":{"type":"__REVISION__","value":"1"},"singleLineText":{"value":"メタ付き"}}
```

### file-minimal

```json
{"file":{"type":"FILE","value":[{"fileKey":"4cfc1346-3c60-44d7-9c9c-49277c1df5fa"}]}}
```

### file-full-shape

```json
{"file":{"type":"FILE","value":[{"contentType":"text/plain","fileKey":"086c0e29-65b7-425d-b9cf-5db25354eac2","name":"probe.txt","size":"3"}]}}
```

### subtable-keep-id

```json
{"subtable":{"type":"SUBTABLE","value":[{"id":"23","value":{"t_singleLineText":{"value":"id保持 23"}}},{"id":"24","value":{"t_singleLineText":{"value":"id保持 24"}}}]}}
```

### subtable-drop-id

```json
{"subtable":{"type":"SUBTABLE","value":[{"value":{"t_singleLineText":{"value":"id なし"}}}]}}
```

### unknown-field

```json
{"フィールドは存在しない":{"value":"x"}}
```

### group-field

```json
{"group":{"type":"GROUP","value":""}}
```

### reference-table

```json
{"referenceTable":{"type":"REFERENCE_TABLE","value":[]}}
```
