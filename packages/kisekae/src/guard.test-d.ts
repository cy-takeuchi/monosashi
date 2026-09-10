import { describe, expectTypeOf, test } from "vitest";
import { isInGroup, isInSubtable, isTopLevel } from "./guard.js";
import type { Element, Field, Parent } from "./types/field.js";

/**
 * ガードが `filter` を通して絞れることを縛る。
 *
 * **ここがガードの存在理由そのもの。**
 * 入れ子の判別子（`f.parent.type`）は型述語推論で埋まらないので
 * （実測。`filter((f) => f.parent?.type === "SUBTABLE")` は絞れない）、
 * この 3 つだけを出している。
 *
 * 消費側で実害が出ていたのもここ ── `f.table!` の `biome-ignore` と、
 * `code` の一致だけで `InSubtable` だと言い切る嘘の型述語。
 */

declare const fields: Field.OneOf[];
declare const elements: Element.OneOf[];

type SubtableParent = Extract<Parent, { type: "SUBTABLE" }>;
type GroupParent = Extract<Parent, { type: "GROUP" }>;

describe("所属で絞れる", () => {
	test("サブテーブル内に絞ると parent が非 null になる", () => {
		const inTable = fields.filter(isInSubtable);
		expectTypeOf(inTable).toEqualTypeOf<
			Array<Field.InSubtable & { parent: SubtableParent }>
		>();
		// `!` なしで親のコードとラベルに触れる
		expectTypeOf(inTable[0]).toExtend<
			{ parent: { code: string; label: string } } | undefined
		>();
	});

	test("グループ内に絞ると parent が非 null になる", () => {
		const inGroup = fields.filter(isInGroup);
		expectTypeOf(inGroup).toEqualTypeOf<
			Array<Field.OneOf & { parent: GroupParent }>
		>();
	});

	test("トップレベルに絞ると parent が null になる", () => {
		const topLevel = fields.filter(isTopLevel);
		expectTypeOf(topLevel).toEqualTypeOf<
			Array<Field.OneOf & { parent: null }>
		>();
	});
});

describe("レイアウト要素にも効く", () => {
	/** スペーサーの所属グループを引くのは消費側の実需 */
	test("グループ内のレイアウト要素に絞れる", () => {
		const inGroup = elements.filter(isInGroup);
		expectTypeOf(inGroup).toEqualTypeOf<
			Array<Element.OneOf & { parent: GroupParent }>
		>();
	});

	/**
	 * **レイアウト要素はサブテーブルに入らない**（実測でも入っていない）。
	 * `Extract<T, Field.InSubtable>` が `never` になるので、
	 * 「あり得ない」が型に出る。
	 */
	test("レイアウト要素をサブテーブルで絞ると never になる", () => {
		const inTable = elements.filter(isInSubtable);
		expectTypeOf(inTable).toEqualTypeOf<never[]>();
	});
});

describe("サブテーブルに入れられない種別は落ちる", () => {
	/**
	 * 組み込みフィールドと関連レコード一覧はサブテーブルに入らない。
	 * `isInSubtable` の戻りからも落ちる。
	 */
	test("組み込みフィールドは isInSubtable の結果に現れない", () => {
		const inTable = fields.filter(isInSubtable);
		expectTypeOf<
			Extract<(typeof inTable)[number], { type: "RECORD_NUMBER" }>
		>().toEqualTypeOf<never>();
		expectTypeOf<
			Extract<(typeof inTable)[number], { type: "REFERENCE_TABLE" }>
		>().toEqualTypeOf<never>();
	});

	test("値を持つフィールドは残る", () => {
		const inTable = fields.filter(isInSubtable);
		expectTypeOf<
			Extract<(typeof inTable)[number], { type: "CHECK_BOX" }>
		>().toEqualTypeOf<Field.CheckBox & { parent: SubtableParent }>();
	});
});
