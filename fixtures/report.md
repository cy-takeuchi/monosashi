# kintone レコード実測レポート

サンプル総数: 26
文脈数: 25

`必須` はその文脈の全サンプルでキーが存在したもの、`optional` は一部のみ存在したもの。
型を optional にするかどうかは、この列を根拠にする（推測で決めない）。

## CALC

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.singleLineTextRequired / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.t_singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit.success / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 4 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.afterSet / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setRow / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setValue / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## CATEGORY

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |

## CHECK_BOX

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |

## CREATED_TIME

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## CREATOR

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |

## DATE

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |

## DATETIME

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |

## DROP_DOWN

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit.success / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record | 4 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.change.singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit.success / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.create / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.detail / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null \| string` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.edit / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / rest.getRecord | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null \| string` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.edit.afterSet / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |

## FILE

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |

## GROUP_SELECT

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |

## LINK

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit.success / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record | 4 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.change.singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit.success / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.create / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.detail / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / rest.getRecord | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit.afterSet / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |

## MODIFIER

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ code: string; name: string }` |

## MULTI_LINE_TEXT

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |

## MULTI_SELECT

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |

## NUMBER

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit.success / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record | 4 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.change.singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit.success / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.create / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.detail / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / rest.getRecord | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `""` |
| screen.edit.afterSet / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |

## ORGANIZATION_SELECT

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |

## RADIO_BUTTON

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## RECORD_NUMBER

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## RICH_TEXT

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## SINGLE_LINE_TEXT

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.change.t_singleLineText / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.show / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.create.submit.success / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 12 | `confirmed` | optional (2/12) | `boolean` |
|  |  | `recordId` | optional (2/12) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.create.setValue / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.detail / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 6 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 6 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `"" \| string` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 6 | `confirmed` | optional (1/6) | `boolean` |
|  |  | `recordId` | optional (1/6) | `null` |
|  |  | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string \| undefined` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

**文脈によって有無が変わるキー**: `confirmed`, `recordId`

## STATUS

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## STATUS_ASSIGNEE

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |

## SUBTABLE

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `{ id: …; value: … }[]` |

## SUBTABLE_ROW

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.create.change.t_singleLineText / event.record | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.create.show / event.record | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.create.submit / event.record | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.create.submit.success / event.record | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.detail.show / event.record | 2 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.edit.change.singleLineText / event.record | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.edit.show / event.record | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.edit.submit / event.record | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| app.record.edit.submit.success / event.record | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.create / kintone.app.record.get | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.create.afterSet / kintone.app.record.get | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.create.setRow / kintone.app.record.get | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.create.setValue / kintone.app.record.get | 1 | `id` | 必須 | `null` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.detail / kintone.app.record.get | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.detail / rest.getRecord | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.edit / kintone.app.record.get | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.edit / rest.getRecord | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.edit.setRow / kintone.app.record.get | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |
| screen.edit.setValue / kintone.app.record.get | 1 | `id` | 必須 | `string` |
|  |  | `value` | 必須 | `{ t_calc: …; t_checkBox: …; t_date: …; t_dateTime: …; t_dropDown: …; t_file: …; t_groupSelect: …; t_link: …; t_multiLineText: …; t_multiSelect: …; t_number: …; t_organizationSelect: …; t_radioButton: …; t_richText: …; t_singleLineText: …; t_time: …; t_userSelect: … }` |

## TIME

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `null` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `undefined` |

## UPDATED_TIME

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## USER_SELECT

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.singleLineTextRequired / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.create.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.detail.show / event.record 〔表内〕 | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.change.t_singleLineText / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.show / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| app.record.edit.submit.success / event.record 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.create.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.detail / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit / rest.getRecord 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.afterSet / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setRow / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |
| screen.edit.setValue / kintone.app.record.get 〔表内〕 | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `[]` |

## __ID__

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## __REVISION__

| 文脈 | n | キー | 出現 | 形 |
| --- | --- | --- | --- | --- |
| app.record.create.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.detail.show / event.record | 2 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.change.t_singleLineText / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.show / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| app.record.edit.submit.success / event.record | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.detail / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit / rest.getRecord | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.afterSet / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setRow / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |
| screen.edit.setValue / kintone.app.record.get | 1 | `type` | 必須 | `string` |
|  |  | `value` | 必須 | `string` |

## 文脈ごとに観測されたフィールドコード

レコードに現れないフィールド（GROUP / REFERENCE_TABLE など）の確認用。

- **app.record.create.change.singleLineText / event.record** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **app.record.create.change.singleLineText / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.create.change.singleLineTextRequired / event.record** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **app.record.create.change.singleLineTextRequired / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.create.change.t_singleLineText / event.record** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **app.record.create.change.t_singleLineText / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.create.show / event.record** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **app.record.create.show / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.create.submit / event.record** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **app.record.create.submit / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.create.submit.success / event.record** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **app.record.create.submit.success / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.detail.show / event.record** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **app.record.detail.show / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.edit.change.singleLineText / event.record** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **app.record.edit.change.singleLineText / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.edit.change.t_singleLineText / event.record** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **app.record.edit.change.t_singleLineText / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.edit.show / event.record** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **app.record.edit.show / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.edit.submit / event.record** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **app.record.edit.submit / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **app.record.edit.submit.success / event.record** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **app.record.edit.submit.success / event.record 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.create / kintone.app.record.get** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **screen.create / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.create.afterSet / kintone.app.record.get** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **screen.create.afterSet / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.create.setRow / kintone.app.record.get** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **screen.create.setRow / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.create.setValue / kintone.app.record.get** (28): calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー
- **screen.create.setValue / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.detail / kintone.app.record.get** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **screen.detail / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.detail / rest.getRecord** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **screen.detail / rest.getRecord 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.edit / kintone.app.record.get** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **screen.edit / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.edit / rest.getRecord** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **screen.edit / rest.getRecord 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.edit.afterSet / kintone.app.record.get** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **screen.edit.afterSet / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.edit.setRow / kintone.app.record.get** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **screen.edit.setRow / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
- **screen.edit.setValue / kintone.app.record.get** (37): $id, $revision, calc, calcDateTime, checkBox, date, dateTime, dropDown, dropDownWithDefault, file, groupSelect, inGroupText, link, linkMail, lookupCopyAmount, lookupCopyName, lookupKey, multiLineText, multiSelect, number, organizationSelect, radioButton, richText, singleLineText, singleLineTextRequired, singleLineTextUnique, subtable, time, userSelect, カテゴリー, ステータス, レコード番号, 作成日時, 作成者, 作業者, 更新日時, 更新者
- **screen.edit.setValue / kintone.app.record.get 〔表内〕** (17): t_calc, t_checkBox, t_date, t_dateTime, t_dropDown, t_file, t_groupSelect, t_link, t_multiLineText, t_multiSelect, t_number, t_organizationSelect, t_radioButton, t_richText, t_singleLineText, t_time, t_userSelect
