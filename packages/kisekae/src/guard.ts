import type { Field, FieldParent, Parent } from "./types/field.js";

/**
 * 所属で絞り込む型ガード。**これだけしか出さない。**
 *
 * ## 種別ごとのガードを出さない理由
 *
 * TypeScript 5.5 以降は型述語を推論するので、判別ユニオンが壊れていなければ
 * `filter` に無名の関数を渡すだけで絞れる（実測。TS 7.0.2）。
 *
 * ```ts
 * fields.filter((f) => f.type === "NUMBER")
 * // → (Field.Number | Field.LookupNumber)[]
 * ```
 *
 * `||` の合成も、否定も、`"lookup" in f` も同じように絞れる。
 * kintone-pretty-fields が 30 個のガードを必要としたのは、
 * ルックアップが判別ユニオンを壊していたからで、**型安全のためではなかった**
 * （しかもそのガードはルックアップを通してしまう unsound なものだった）。
 *
 * ## 所属だけは推論で埋まらない
 *
 * **入れ子の判別子は `filter` で絞れない**（実測）。
 *
 * ```ts
 * fields.filter((f) => f.parent?.type === "SUBTABLE")  // → Field.OneOf[]
 * ```
 *
 * `if` の中なら `f.parent.code` に `!` なしで触れるが、
 * `filter` では `f` 自身の型に投影されない。ここがガードの要る唯一の場所で、
 * しかも消費側で実害が出ていた場所そのもの
 * （`f.table!` の `biome-ignore` と、`code` の一致だけで
 * `InSubtable` だと言い切る嘘の型述語）。
 */

type GroupParent = Extract<Parent, { type: "GROUP" }>;
type SubtableParent = Extract<Parent, { type: "SUBTABLE" }>;

/**
 * 所属を持つもの。フィールドとレイアウト要素の両方を受ける。
 *
 * レイアウト要素の `parent` は `ElementParent`（グループか `null`）で、
 * `FieldParent` の部分型なのでこの制約を満たす。
 */
type Placed = { parent: FieldParent };

/**
 * サブテーブルの中にあるか。
 *
 * 戻りを `Extract<T, Field.InSubtable>` で絞るのは、
 * **サブテーブルに入れられない種別を落とすため**。
 * 組み込みフィールドやレイアウト要素を渡した場合は `never` になる
 * （「あり得ない」が型に出る）。
 *
 * ```ts
 * const inTable = form.fields.filter(guard.isInSubtable);
 * inTable[0].parent.code;   // string。`!` は要らない
 * ```
 */
export const isInSubtable = <T extends Placed>(
	item: T,
): item is Extract<T, Field.InSubtable> & { parent: SubtableParent } =>
	item.parent?.type === "SUBTABLE";

/**
 * グループの中にあるか。
 *
 * フィールドにもレイアウト要素にも効く。
 * スペーサーの所属グループを引くのは消費側の実需
 * （`generateSpaceOptions` が選択肢の見出しに使っている）。
 */
export const isInGroup = <T extends Placed>(
	item: T,
): item is T & { parent: GroupParent } => item.parent?.type === "GROUP";

/**
 * フォームのトップレベルに置かれているか。
 *
 * **「フォームに置かれていない」とは違う。** そちらは `form.unplaced`。
 * `parent: null` は「置かれていて、テーブルにもグループにも入っていない」。
 */
export const isTopLevel = <T extends Placed>(
	item: T,
): item is T & { parent: null } => item.parent === null;
