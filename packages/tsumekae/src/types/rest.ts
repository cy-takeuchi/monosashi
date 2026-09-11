import type { Rest } from "./field.js";

/**
 * REST API のレコード型。
 *
 * `Rest` は自前で持っている（理由は `src/types/field.ts` の `Rest`）。
 * `@kintone/rest-api-client` との等価性は `rest.test-d.ts` が縛る。
 */

/** REST API のレコード。Canonical */
export type RestRecord = {
	[fieldCode: string]: Rest.OneOf;
};

/** $id と $revision を必ず持つレコード。getRecord / getRecords の戻り */
export type RestRecordWithMeta = RestRecord & {
	$id: Rest.Id;
	$revision: Rest.Revision;
};
