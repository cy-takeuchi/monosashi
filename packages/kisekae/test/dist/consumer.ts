/**
 * ビルド成果物（dist）を利用者と同じ立場から型検査する。
 *
 * ## なぜ src のテストでは足りないか
 *
 * `.d.ts` への出力は型推論とは別の処理で、**推論結果を保てないことがある**。
 * monosashi では TypeScript 7 へ上げたときに
 * `field.subtableRow` の戻り値から `id?: never` が落ち、
 * src に対する tsc も vitest の型テストも全て通ったまま、
 * パッケージを入れた利用者側だけが壊れる状態になった。
 *
 * kisekae で同じことが起きうるのは**判別ユニオン**。
 * `Field.OneOf` が `.d.ts` の出力で崩れると、
 * 利用者側でだけ `filter` の絞り込みが効かなくなる。
 * **kisekae の設計の中心がそこなので、ここで確かめる。**
 *
 * ここは `pnpm run build` の一部として走る（build:check）。
 * dist が無いと落ちるので、通常の tsconfig からは除外してある。
 */

import {
	type Element,
	type Field,
	type Form,
	FormDefinitionError,
	guard,
	type Layout,
	type Properties,
	toForm,
} from "../../dist/index";

declare const properties: Properties;
declare const layout: Layout.OneOf[];

const form: Form = toForm(properties, layout);

// --- 種別で絞れること（ガードを使わない） ---
// ここが崩れると利用者側でだけ絞り込みが効かなくなる
const numbers = form.fields.filter((f) => f.type === "NUMBER");
for (const field of numbers) {
	if ("lookup" in field) {
		const app: string = field.lookup.relatedApp.app;
		console.log(app);
		continue;
	}
	// ルックアップを除いたので数値固有のプロパティに触れる
	const unit: string = field.unit;
	const position: "BEFORE" | "AFTER" = field.unitPosition;
	console.log(unit, position);
}

// ルックアップになれない種別は 1 段で絞れる
const checkBoxes = form.fields.filter((f) => f.type === "CHECK_BOX");
for (const field of checkBoxes) {
	const align: "HORIZONTAL" | "VERTICAL" = field.align;
	console.log(Object.keys(field.options), align);
}

// 合成条件でも絞れる
const choices = form.fields.filter(
	(f) => f.type === "RADIO_BUTTON" || f.type === "DROP_DOWN",
);
console.log(choices.map((f) => Object.keys(f.options)));

// --- 所属 ---
// 親のラベルを直接引ける（コードから引き直さなくて済む）
const groupings: string[] = form.fields.map((f) => f.parent?.label ?? "");

// ガードで絞ると `!` が要らない
const inTable = form.fields.filter(guard.isInSubtable);
const tableCodes: string[] = inTable.map((f) => f.parent.code);
const inGroup = form.fields.filter(guard.isInGroup);
const groupCodes: string[] = inGroup.map((f) => f.parent.code);
const topLevel = form.fields.filter(guard.isTopLevel);
const nulls: null[] = topLevel.map((f) => f.parent);

// レイアウト要素にも効く
const spacersInGroup = form.elements.filter(guard.isInGroup);
console.log(spacersInGroup.map((e) => e.parent.code));

// --- バケツ ---
const tableLabels: string[] = form.tables.map((t) => t.label);
const openGroups: boolean[] = form.groups.map((g) => g.openGroup);
const elementIds: string[] = form.elements.map((e) => e.elementId);

// 置かれていないものは parent を持たない。enabled はそのまま返る
const disabledCategory = form.unplaced.filter(
	(f) => f.type === "CATEGORY" && !f.enabled,
);

// --- 型を関数の引数に書けること ---
declare const pickFields: (fields: Field.OneOf[]) => void;
declare const pickElements: (elements: Element.OneOf[]) => void;
pickFields(form.fields);
pickElements(form.elements);

// --- エラーの型が出ていること ---
try {
	toForm({}, []);
} catch (error) {
	if (error instanceof FormDefinitionError) {
		const message: string = error.message;
		console.log(message);
	}
}

console.log(
	groupings,
	tableCodes,
	groupCodes,
	nulls,
	tableLabels,
	openGroups,
	elementIds,
	disabledCategory,
);
