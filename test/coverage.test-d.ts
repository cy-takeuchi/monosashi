import { expectTypeOf, test } from "vitest";
import type { Editing, Saved } from "../src/types/field";
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
