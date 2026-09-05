import type { KintoneRecordField } from "@kintone/rest-api-client";
import { describe, expectTypeOf, test } from "vitest";
import type { Rest } from "./field";

/**
 * 自前の `Rest` が `@kintone/rest-api-client` と等価であることを縛る。
 *
 * ## なぜ要るか
 *
 * 利用者は `RestRecord` を `client.record.addRecord()` に渡す。
 * 乖離すると、そこで型エラーになるのは**利用者の手元**で、
 * こちらは何もしていないのに壊れる。
 *
 * 委譲をやめて自前で持つことにしたので（`src/types/field.ts` の `Rest`）、
 * 乖離しないことは自分で確かめる必要がある。
 * `@kintone/rest-api-client` は devDependency としてこのリポジトリには
 * 常に在るので、利用者に負担をかけずに突き合わせられる。
 *
 * ## 落ちたときにどうするか
 *
 * **逃げ道は作らない。** 許容リストを作ると「とりあえず載せる」が起きる。
 *
 * この失敗は依存を上げる PR の中だけで起き、main は緑のままなので急がない。
 * どちらが正しいかは `fixtures/measured.json` の実測で決める。
 * kintone の実測は、これまでに型の主張を何度も否定している。
 * **他人の型が正しいとは限らない。**
 */

describe("Rest は @kintone/rest-api-client と等価", () => {
	test("OneOf が完全に一致する", () => {
		expectTypeOf<Rest.OneOf>().toEqualTypeOf<KintoneRecordField.OneOf>();
	});

	test("サブテーブルに入れられる種別が一致する", () => {
		expectTypeOf<Rest.InSubtable>().toEqualTypeOf<KintoneRecordField.InSubtable>();
	});
});
