/**
 * REST API の型。`kintone-record/rest` から読む。
 *
 * ## なぜ本体と分けるか
 *
 * ここだけが `@kintone/rest-api-client` を必要とする。
 * 本体に置くと、**型しか使わない利用者にも実行時依存が付いてくる**
 * （7MB / axios ほか 5 個）。kintone カスタマイズはブラウザ側だけの
 * ことが多く、その大半は REST クライアントを必要としない。
 *
 * 加えて、本体の `.d.ts` から参照が消えることで、
 * `skipLibCheck: false` の利用者が `@types/node` を要求されなくなる
 * （rest-api-client の `.d.ts` が `https` / `Buffer` / `stream` を使うため。実測）。
 *
 * ## 入れていないと型が効かない
 *
 * `@kintone/rest-api-client` は optional な peerDependency にしてある。
 * **入れずにこの経路を読むと、`skipLibCheck: true`（TS の既定）では
 * 型がエラーにならず `any` に落ちる**（実測 2026-09-05）。
 * この経路を使うなら必ず入れること。
 *
 * 型そのものを自前で持たないのは、`@kintone/rest-api-client` の型を
 * Canonical として扱うと決めているため（DECISIONS）。
 * 新しい正規形を作ると、利用者が REST クライアントへ値を渡すときに
 * 型の同一性が壊れる。
 */

export type { KintoneRecordField as Rest } from "@kintone/rest-api-client";
export type { RestRecord, RestRecordWithMeta } from "./types/rest";
