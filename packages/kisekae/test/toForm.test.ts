import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import * as guard from "../src/guard.js";
import { FormDefinitionError, toForm } from "../src/toForm.js";
import type { Form } from "../src/types/field.js";
import type { Layout, Properties } from "../src/types/raw.js";

/**
 * `toForm` を実測データに食わせて、出力を検査する。
 *
 * ## なぜこれが一番強いのか
 *
 * `toForm` は同期の純粋関数なので、**実 kintone が返した実物をそのまま
 * 入力にできる**。手で作った入力だと「自分が想定した形」しか通らず、
 * kintone が実際に返す形とずれても気づけない
 * （monosashi の DECISIONS「手で作ったオブジェクトは
 * 『他種別の混入』を捕まえられない」と同じ話）。
 *
 * ## パスは cwd 相対
 *
 * モノレポ化で `packages/kisekae/fixtures/` に移したらここも直す。
 */

const FIXTURE = "fixtures/form/definition.json";

const measured = (role: "fixture" | "lookupSource") => {
	const parsed: unknown = JSON.parse(readFileSync(FIXTURE, "utf8"));
	const apps = (parsed as { apps: unknown[] }).apps as Array<{
		role: string;
		fields: { properties: Properties };
		layout: { layout: Layout.OneOf[] };
	}>;
	const app = apps.find((a) => a.role === role);
	if (app === undefined) throw new Error(`実測に ${role} がありません`);
	return { properties: app.fields.properties, layout: app.layout.layout };
};

const form: Form = (() => {
	const { properties, layout } = measured("fixture");
	return toForm(properties, layout);
})();

describe("振り分け", () => {
	test("プロセス管理系だけが unplaced に入る", () => {
		expect(form.unplaced.map((f) => f.type).sort()).toEqual([
			"CATEGORY",
			"STATUS",
			"STATUS_ASSIGNEE",
		]);
	});

	test("unplaced は parent を持たない", () => {
		for (const item of form.unplaced) {
			expect(item, `${item.code} に parent がある`).not.toHaveProperty(
				"parent",
			);
		}
	});

	/** `enabled` で絞らない。フィールドの内容をそのまま返す */
	test("unplaced は enabled をそのまま持つ", () => {
		for (const item of form.unplaced) {
			expect(item).toHaveProperty("enabled");
		}
	});

	test("tables と groups は 1 つずつ", () => {
		expect(form.tables.map((t) => t.code)).toEqual(["subtable"]);
		expect(form.groups.map((g) => g.code)).toEqual(["group"]);
	});

	test("tables / groups は中のフィールドを持たない", () => {
		expect(Object.keys(form.tables[0] ?? {}).sort()).toEqual([
			"code",
			"label",
			"noLabel",
			"type",
		]);
		expect(Object.keys(form.groups[0] ?? {}).sort()).toEqual([
			"code",
			"label",
			"noLabel",
			"openGroup",
			"type",
		]);
	});

	test("fields に SUBTABLE / GROUP / プロセス管理系は入らない", () => {
		const types = new Set(form.fields.map((f) => f.type));
		for (const type of [
			"SUBTABLE",
			"GROUP",
			"CATEGORY",
			"STATUS",
			"STATUS_ASSIGNEE",
		]) {
			expect(types.has(type as never), `${type} が fields に入っている`).toBe(
				false,
			);
		}
	});

	test("レイアウト要素は elements に入る", () => {
		expect(form.elements.map((e) => e.type)).toEqual([
			"SPACER",
			"SPACER",
			"LABEL",
			"HR",
			"SPACER",
			"LABEL",
			"HR",
		]);
	});

	/** 実測で LABEL / HR も elementId を持つことが分かっている */
	test("elements は 3 種すべてが elementId を持つ", () => {
		for (const element of form.elements) {
			expect(element, `${element.type} に elementId が無い`).toHaveProperty(
				"elementId",
			);
		}
	});

	test("名前なしスペーサーの elementId は空文字列", () => {
		const spacers = form.elements.filter((e) => e.type === "SPACER");
		expect(spacers.map((s) => s.elementId)).toContain("");
		expect(spacers.map((s) => s.elementId)).toContain("spacerNamed");
	});
});

describe("所属", () => {
	test("サブテーブル内のフィールドに表の所属が付く", () => {
		const inTable = form.fields.filter(guard.isInSubtable);
		expect(inTable).toHaveLength(17);
		for (const field of inTable) {
			expect(field.parent.code).toBe("subtable");
			expect(field.parent.label).toBe("テーブル");
		}
	});

	test("グループ内のフィールドにグループの所属が付く", () => {
		const inGroup = form.fields.filter(guard.isInGroup);
		expect(inGroup.map((f) => f.code)).toEqual(["inGroupText"]);
		expect(inGroup[0]?.parent.code).toBe("group");
	});

	/** グループ内のレイアウト要素にも所属が付く */
	test("グループ内のレイアウト要素にも所属が付く", () => {
		const inGroup = form.elements.filter(guard.isInGroup);
		expect(inGroup.map((e) => e.type)).toEqual(["SPACER", "LABEL", "HR"]);
		for (const element of inGroup) {
			expect(element.parent.code).toBe("group");
		}
	});

	test("トップレベルのフィールドは parent が null", () => {
		const topLevel = form.fields.filter(guard.isTopLevel);
		expect(topLevel.length).toBeGreaterThan(0);
		for (const field of topLevel) {
			expect(field.parent).toBeNull();
		}
	});

	test("所属は 3 つに分かれ、重複しない", () => {
		const inTable = form.fields.filter(guard.isInSubtable).length;
		const inGroup = form.fields.filter(guard.isInGroup).length;
		const topLevel = form.fields.filter(guard.isTopLevel).length;
		expect(inTable + inGroup + topLevel).toBe(form.fields.length);
	});

	/** 親のラベルを持つので、消費側がコードから引き直さなくて済む */
	test("所属はラベルを持つ", () => {
		for (const field of form.fields) {
			if (field.parent === null) continue;
			expect(field.parent.label.length).toBeGreaterThan(0);
		}
	});
});

describe("レイアウト順", () => {
	test("fields はレイアウト順（組み込み → 文字列 → …）", () => {
		expect(form.fields.slice(0, 8).map((f) => f.code)).toEqual([
			"レコード番号",
			"作成者",
			"作成日時",
			"更新者",
			"更新日時",
			"singleLineText",
			"singleLineTextRequired",
			"singleLineTextUnique",
		]);
	});

	/** サブテーブルは最後の行なので、その中身も最後に並ぶ */
	test("サブテーブル内のフィールドは末尾に並ぶ", () => {
		const tail = form.fields.slice(-17);
		expect(tail.every((f) => f.parent?.code === "subtable")).toBe(true);
	});
});

describe("ルックアップ", () => {
	test("キーフィールドは lookup を持ち、通常プロパティを持たない", () => {
		const lookups = form.fields.filter((f) => "lookup" in f);
		expect(lookups.map((f) => f.code)).toEqual(["lookupKey"]);
		expect(Object.keys(lookups[0] ?? {}).sort()).toEqual([
			"code",
			"label",
			"lookup",
			"noLabel",
			"parent",
			"required",
			"type",
		]);
	});

	/**
	 * `type` を書き直しているので、絞り込みが効く。
	 * ここが kintone-pretty-fields で壊れていた。
	 */
	test("文字列 1 行で絞るとルックアップも混ざる", () => {
		const texts = form.fields.filter((f) => f.type === "SINGLE_LINE_TEXT");
		expect(texts.map((f) => f.code)).toContain("lookupKey");
		expect(texts.map((f) => f.code)).toContain("singleLineText");
	});

	/**
	 * コピー先は印を持たないが、キーフィールドの fieldMappings が
	 * 同じアプリのフィールドコードで列挙している（実測）。
	 * 元アプリの権限は要らない。
	 */
	test("コピー先は fieldMappings から引ける", () => {
		const key = form.fields.find((f) => f.code === "lookupKey");
		if (key === undefined || !("lookup" in key)) {
			throw new Error("ルックアップのキーフィールドが無い");
		}
		expect(key.lookup.fieldMappings.map((m) => m.field).sort()).toEqual([
			"lookupCopyAmount",
			"lookupCopyName",
		]);
		// コピー先そのものは通常のフィールドとして fields に入っている
		const copy = form.fields.find((f) => f.code === "lookupCopyName");
		expect(copy).not.toHaveProperty("lookup");
	});
});

describe("フィールドの内容をそのまま通す", () => {
	test("parent 以外のキーが properties と一致する", () => {
		const { properties } = measured("fixture");
		for (const field of form.fields) {
			// サブテーブル内は properties のトップレベルに無いので表の中から引く
			const raw =
				properties[field.code] ??
				(() => {
					const table = properties.subtable;
					if (table === undefined || table.type !== "SUBTABLE")
						return undefined;
					return table.fields[field.code];
				})();
			if (raw === undefined)
				throw new Error(`${field.code} が properties に無い`);

			const { parent: _parent, ...rest } = field;
			const expected =
				"lookup" in raw
					? // ルックアップは type を書き直しているので、そこだけ別に見る
						{ ...raw, type: field.type }
					: raw;
			expect(rest, `${field.code} の内容が変わっている`).toEqual(expected);
		}
	});

	test("派生値を足していない", () => {
		for (const field of form.fields) {
			expect(field).not.toHaveProperty("sortedOptions");
			expect(field).not.toHaveProperty("isLookupCopy");
			expect(field).not.toHaveProperty("table");
			expect(field).not.toHaveProperty("group");
		}
	});
});

describe("フォームから外した組み込みフィールドも unplaced に入る", () => {
	/**
	 * **実測 2026-09-10。** ルックアップ元アプリのレイアウトは
	 * `key` / `name` / `amount` の 3 行だけで、**組み込みフィールド 5 つが
	 * properties にあってレイアウトに無い**。
	 *
	 * これが `unplaced` の 2 種類目（フォームから外した組み込みフィールド）で、
	 * 想定ではなく実在することがここで確かめられている。
	 * `parent: null` で兼ねていたら「トップレベルに置かれている」と
	 * 区別できず、消費側が `setFieldShown` を呼んで失敗する。
	 */
	test("プロセス管理が無効なアプリでも整形できる", () => {
		const { properties, layout } = measured("lookupSource");
		const source = toForm(properties, layout);
		expect(source.fields.map((f) => f.code)).toEqual(["key", "name", "amount"]);
		expect(source.tables).toEqual([]);
		expect(source.groups).toEqual([]);
		expect(source.elements).toEqual([]);
	});

	test("組み込み 5 つとプロセス管理系 3 つが unplaced に入る", () => {
		const { properties, layout } = measured("lookupSource");
		const { unplaced } = toForm(properties, layout);
		expect(unplaced.map((f) => f.type).sort()).toEqual([
			"CATEGORY",
			"CREATED_TIME",
			"CREATOR",
			"MODIFIER",
			"RECORD_NUMBER",
			"STATUS",
			"STATUS_ASSIGNEE",
			"UPDATED_TIME",
		]);
	});

	/** プロセス管理系だけが `enabled` を持つ。絞らずそのまま返す */
	test("プロセス管理系は enabled: false のまま返る", () => {
		const { properties, layout } = measured("lookupSource");
		const { unplaced } = toForm(properties, layout);
		const process = unplaced.filter(
			(f) =>
				f.type === "CATEGORY" ||
				f.type === "STATUS" ||
				f.type === "STATUS_ASSIGNEE",
		);
		expect(process).toHaveLength(3);
		for (const item of process) {
			expect(item.enabled, `${item.code} が有効になっている`).toBe(false);
		}
	});

	test("組み込みフィールドは enabled を持たない", () => {
		const { properties, layout } = measured("lookupSource");
		const { unplaced } = toForm(properties, layout);
		const builtIn = unplaced.filter((f) => f.type === "RECORD_NUMBER");
		expect(builtIn).toHaveLength(1);
		expect(builtIn[0]).not.toHaveProperty("enabled");
	});
});

describe("食い違いは黙って読み飛ばさない", () => {
	test("レイアウトが参照するフィールドが properties に無ければ落ちる", () => {
		expect(() =>
			toForm({}, [
				{
					type: "ROW",
					fields: [
						{ type: "SINGLE_LINE_TEXT", code: "missing", size: { width: "1" } },
					],
				},
			]),
		).toThrow(FormDefinitionError);
	});

	test("種別が噛み合わなければ落ちる", () => {
		const { properties } = measured("fixture");
		expect(() =>
			toForm(properties, [
				{ type: "SUBTABLE", code: "singleLineText", fields: [] },
			]),
		).toThrow(/properties では SINGLE_LINE_TEXT です/);
	});

	test("行にサブテーブルが現れたら落ちる", () => {
		const { properties } = measured("fixture");
		expect(() =>
			toForm(properties, [
				{
					type: "ROW",
					fields: [
						{
							type: "SINGLE_LINE_TEXT",
							code: "subtable",
							size: { width: "1" },
						},
					],
				},
			]),
		).toThrow(/行に置けません/);
	});
});
