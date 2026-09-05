import { expectTypeOf, test } from "vitest";
import type { Editing, Rest, Saved } from "../src/types/field";
import type { ObservedFieldType } from "./fieldTypes";

/**
 * 宣言した型が、実測で観測された種別を過不足なく覆っていることを確かめる。
 *
 * coverage.test.ts が「一覧 ↔ フィクスチャ」と「一覧 ↔ 実行時の実装」を見るのに対し、
 * ここは「一覧 ↔ 型」を見る。3 つが揃って初めて、
 * 一箇所だけ更新して他が漏れた状態を検出できる。
 */

test("Saved.OneOf は観測された全種別を覆う", () => {
	expectTypeOf<Saved.OneOf["type"]>().toEqualTypeOf<ObservedFieldType>();
});

test("Editing.OneOf は観測された全種別を覆う", () => {
	expectTypeOf<Editing.OneOf["type"]>().toEqualTypeOf<ObservedFieldType>();
});

/**
 * Rest も同じ軸に載せる。
 *
 * 以前は `@kintone/rest-api-client` に委譲していて、この検査が無かった。
 * kintone に種別が増えても、あちらが追随していなければ気づけない状態だった。
 * 自前で持つようにしたので、`Saved` / `Editing` と同じ規律に揃える。
 *
 * あちらとの等価性は `src/types/rest.test-d.ts` が別に見る。
 * こちらは「kintone が返す種別を漏れなく持っているか」で、守るものが違う。
 */
test("Rest.OneOf は観測された全種別を覆う", () => {
	expectTypeOf<Rest.OneOf["type"]>().toEqualTypeOf<ObservedFieldType>();
});
