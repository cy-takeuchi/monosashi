import type {
	Element,
	ElementParent,
	Field,
	FieldParent,
	Form,
	Group,
	Parent,
	Table,
	Unplaced,
} from "./types/field.js";
import type { Layout, Properties, Property } from "./types/raw.js";

/**
 * `getFormFields` と `getFormLayout` の結果を 1 つの構造に合わせる。
 *
 * ## 同期の純粋関数
 *
 * クライアントを受け取らない。取得は利用者が行う
 * （`docs/DECISIONS.md`「決定サマリ」）。
 *
 * ```ts
 * const [f, l] = await Promise.all([
 *   client.app.getFormFields({ app, lang, preview }),
 *   client.app.getFormLayout({ app, preview }),
 * ]);
 * const form = toForm(f.properties, l.layout);
 * ```
 *
 * `lang` と `preview` は取得側の関心事なので、この関数は知らない。
 * 純粋関数なので実測データをそのまま食わせてテストできる（`toForm.test.ts`）。
 *
 * ## 所属がどこから分かるか（実測 2026-09-10）
 *
 * | | `properties` の場所 | 所属の出どころ |
 * |---|---|---|
 * | トップレベルのフィールド | トップレベル | レイアウトの `ROW` |
 * | **グループ内**のフィールド | **トップレベル** | レイアウトの `GROUP` の中の `ROW` |
 * | **サブテーブル内**のフィールド | **`properties[表].fields`** | レイアウトの `SUBTABLE` |
 *
 * グループ内フィールドは `properties` では平坦に並ぶので、
 * **レイアウトを見なければグループ所属が分からない**。
 * サブテーブル内フィールドは逆に `properties` のトップレベルに現れない。
 * この非対称が、2 つの API を突き合わせないと整形できない理由。
 */

/**
 * フォーム定義の食い違い。
 *
 * レイアウトが参照しているフィールドが `properties` に無い、
 * 種別が噛み合わない、といった `getFormFields` と `getFormLayout` の
 * 不整合で投げる。**黙って読み飛ばさない。**
 * 片方だけ古い結果を渡されたときに、出力が静かに欠けるより落ちた方がよい。
 */
export class FormDefinitionError extends Error {
	override readonly name = "FormDefinitionError";
}

/** サブテーブル所属。`Parent` から取り出す */
type SubtableParent = Extract<Parent, { type: "SUBTABLE" }>;

export const toForm = (
	properties: Properties,
	layout: readonly Layout.OneOf[],
): Form => {
	const fields: Field.OneOf[] = [];
	const tables: Table[] = [];
	const groups: Group[] = [];
	const elements: Element.OneOf[] = [];
	/** レイアウトが消費したトップレベルのコード。残りが `unplaced` になる */
	const placed = new Set<string>();

	const propertyOf = (code: string, where: string): Property.OneOf => {
		const property = properties[code];
		if (property === undefined) {
			throw new FormDefinitionError(
				`${where}が参照しているフィールド ${code} が properties にありません。getFormFields と getFormLayout の結果が同じアプリ・同じ revision のものか確認してください`,
			);
		}
		return property;
	};

	/**
	 * ルックアップのキーフィールド。
	 *
	 * **`type` を書き直して種別ごとに分ける。**
	 * 実行時にやることは同じだが、`{ ...property }` のままだと
	 * `type` が `"NUMBER" | "SINGLE_LINE_TEXT"` の 2 値で残り、
	 * 利用者側で `filter` の推論が死ぬ（分けた理由そのもの）。
	 *
	 * 6 プロパティしか無いので書き下す（2026-09-10 実測）。
	 */
	const lookupField = <P extends FieldParent>(
		property: Property.Lookup,
		parent: P,
	): (Field.LookupSingleLineText | Field.LookupNumber) & { parent: P } => {
		const { code, label, noLabel, required, lookup } = property;
		const common = { code, label, noLabel, required, lookup, parent };
		return property.type === "NUMBER"
			? { type: "NUMBER", ...common }
			: { type: "SINGLE_LINE_TEXT", ...common };
	};

	/** 行に置かれたフィールド。所属はトップレベル（`null`）かグループ */
	const rowField = (
		property: Property.OneOf,
		parent: ElementParent,
	): Field.OneOf => {
		if ("lookup" in property) return lookupField(property, parent);
		switch (property.type) {
			// レイアウトの行には現れない種別。
			// SUBTABLE / GROUP はコンテナとして現れるので行の中には入らず、
			// プロセス管理系はレイアウトに一切現れない（実測）
			case "SUBTABLE":
			case "GROUP":
			case "CATEGORY":
			case "STATUS":
			case "STATUS_ASSIGNEE":
				throw new FormDefinitionError(
					`${property.code} (${property.type}) がレイアウトの行に現れました。この種別は行に置けません`,
				);
			default:
				return { ...property, parent };
		}
	};

	/** サブテーブルの中のフィールド。所属は必ずそのサブテーブル */
	const subtableField = (
		property: Property.InSubtable,
		parent: SubtableParent,
	): Field.InSubtable => {
		if ("lookup" in property) return lookupField(property, parent);
		return { ...property, parent };
	};

	const walkRow = (row: Layout.Row, parent: ElementParent): void => {
		for (const element of row.fields) {
			switch (element.type) {
				// フィールドではないレイアウト要素。3 種すべてが elementId を持つ（実測）
				case "SPACER":
				case "LABEL":
				case "HR":
					elements.push({ ...element, parent });
					break;
				default:
					placed.add(element.code);
					fields.push(
						rowField(propertyOf(element.code, "レイアウトの行"), parent),
					);
			}
		}
	};

	const walkSubtable = (entry: Layout.Subtable): void => {
		const property = propertyOf(entry.code, "レイアウトのサブテーブル");
		if (property.type !== "SUBTABLE") {
			throw new FormDefinitionError(
				`レイアウトが ${entry.code} をサブテーブルとして参照していますが、properties では ${property.type} です`,
			);
		}
		placed.add(entry.code);
		const { code, label, noLabel } = property;
		tables.push({ type: "SUBTABLE", code, label, noLabel });

		// **サブテーブル内フィールドは properties のトップレベルに現れない。**
		// 表のプロパティの fields から引く（実測 2026-09-10）
		const parent: SubtableParent = { type: "SUBTABLE", code, label };
		for (const element of entry.fields) {
			const inner = property.fields[element.code];
			if (inner === undefined) {
				throw new FormDefinitionError(
					`サブテーブル ${code} のレイアウトが ${element.code} を参照していますが、properties[${code}].fields にありません`,
				);
			}
			fields.push(subtableField(inner, parent));
		}
	};

	const walkGroup = (entry: Layout.Group): void => {
		const property = propertyOf(entry.code, "レイアウトのグループ");
		if (property.type !== "GROUP") {
			throw new FormDefinitionError(
				`レイアウトが ${entry.code} をグループとして参照していますが、properties では ${property.type} です`,
			);
		}
		placed.add(entry.code);
		const { code, label, noLabel, openGroup } = property;
		groups.push({ type: "GROUP", code, label, noLabel, openGroup });

		// **グループ内フィールドは properties のトップレベルにある。**
		// 所属が分かるのはレイアウト側だけ（実測 2026-09-10）
		const parent: ElementParent = { type: "GROUP", code, label };
		for (const row of entry.layout) walkRow(row, parent);
	};

	for (const entry of layout) {
		switch (entry.type) {
			case "ROW":
				walkRow(entry, null);
				break;
			case "SUBTABLE":
				walkSubtable(entry);
				break;
			case "GROUP":
				walkGroup(entry);
				break;
		}
	}

	/**
	 * レイアウトが消費しなかったトップレベルのプロパティ。
	 *
	 * **`parent` を付けない。** 「フォームに置かれていない」ことと
	 * 「トップレベルに置かれている」（`parent: null`）は違う。
	 *
	 * `enabled` で絞らない。フィールドの内容をそのまま返す
	 * （絞るかどうかは利用者が決める）。
	 */
	const unplaced: Unplaced[] = [];
	for (const [code, property] of Object.entries(properties)) {
		if (placed.has(code)) continue;
		if ("lookup" in property) {
			const { label, noLabel, required, lookup } = property;
			const common = { code, label, noLabel, required, lookup };
			unplaced.push(
				property.type === "NUMBER"
					? { type: "NUMBER", ...common }
					: { type: "SINGLE_LINE_TEXT", ...common },
			);
			continue;
		}
		if (property.type === "SUBTABLE") {
			// 中のフィールドは持たせない（Table と同じ形にする）
			const { label, noLabel } = property;
			unplaced.push({ type: "SUBTABLE", code, label, noLabel });
			continue;
		}
		unplaced.push(property);
	}

	return { fields, tables, groups, elements, unplaced };
};
