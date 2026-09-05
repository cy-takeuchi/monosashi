import type { KintoneRecordField } from "@kintone/rest-api-client";

/**
 * REST API のレコード型。
 *
 * `@kintone/rest-api-client` の `KintoneRecordField` が実測と一致することを
 * 確認済みなので、新しい正規形は作らず名前だけ揃える。
 *
 * このファイルだけが rest-api-client に依存する。
 * 公開経路は `kintone-record/rest` のみ（理由は `src/rest.ts`）。
 */

/** REST API のレコード。Canonical */
export type RestRecord = {
	[fieldCode: string]: KintoneRecordField.OneOf;
};

/** $id と $revision を必ず持つレコード。getRecord / getRecords の戻り */
export type RestRecordWithMeta = RestRecord & {
	$id: KintoneRecordField.ID;
	$revision: KintoneRecordField.Revision;
};
