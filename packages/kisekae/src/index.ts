/**
 * kisekae
 *
 * kintone のフォーム定義（`getFormFields` / `getFormLayout`）を、
 * プラグインから扱いやすい形に整えて返す。
 *
 * 型の根拠は 2 つに分かれる。実測した箇所は `fixtures/form/definition.json`、
 * 実測していない箇所は `@kintone/rest-api-client` の型。
 * 乖離は `src/types/raw.test-d.ts` が式の中に書いて固定している
 * （2026-09-10 時点で 1 件 ── `LABEL` / `HR` の `elementId`）。
 *
 * **実行時依存を持たない。** `@kintone/rest-api-client` は
 * 型の突き合わせにだけ使う devDependency で、公開する `.d.ts` からは参照しない。
 *
 * 設計判断の記録は `docs/DECISIONS.md`。
 */

// --- 所属で絞り込むガード。種別ごとのガードは出さない ---
export * as guard from "./guard.js";
// --- 整形 ---
export { FormDefinitionError, toForm } from "./toForm.js";
// --- 整形後の型。消費側の主要な語彙は `Field.OneOf` ---
export type {
	Element,
	ElementParent,
	Field,
	FieldParent,
	Form,
	Group,
	LookupNumberProperty,
	LookupSingleLineTextProperty,
	Parent,
	Table,
	Unplaced,
} from "./types/field.js";
// --- 生のフォーム定義の型。`toForm` の入力。
// `@kintone/rest-api-client` を入れずにフォーム定義に型を付けたいときにも使える ---
export type {
	FormLayout,
	Layout,
	LookupConfig,
	Options,
	Properties,
	Property,
	ReferenceTableConfig,
	RelatedApp,
} from "./types/raw.js";
