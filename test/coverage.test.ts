import { describe, expect, test } from "vitest";
import { field } from "../src/build/field";
import { canSetValue } from "../src/build/setValue";
import { isDroppedOnWrite, isRejectedOnWrite } from "../src/convert/fieldTypes";
import { toRestWrite } from "../src/convert/toRestWrite";
import * as guard from "../src/guard/record";
import { matchesContext, REQUIRED_CONTEXTS } from "./contexts";
import { OBSERVED_FIELD_TYPES } from "./fieldTypes";
import { fieldsOf, loadSamples } from "./fixtures";

/**
 * 実装が全フィールド種別を漏れなく扱えていることを確かめる。
 *
 * 型 / VALUE_SHAPE / ガード / 構築子は、読みやすさのために
 * それぞれが全種別を書き下している（条件型で導出しない・DECISIONS Q3）。
 * その重複は許容するが、**ずれたまま気づかない**のは許容しない。
 * 一箇所だけ更新して他が漏れた状態を、ここで落とす。
 *
 * 漏れたときに何が起きるかは種別ごとに違う。
 * たとえば VALUE_SHAPE から漏れると setValue が「未知の型」として素通しし、
 * NUMBER に配列を入れるような代入が黙って通る。
 */

const samples = loadSamples();

const observedInFixtures = new Set(
	samples.flatMap((sample) => fieldsOf(sample.data).map(({ type }) => type)),
);

const declared = new Set<string>(OBSERVED_FIELD_TYPES);

/** REST に書き込める種別。構築子が必要なのはここだけ */
const writable = OBSERVED_FIELD_TYPES.filter((type) => !isDroppedOnWrite(type));

describe("一覧がフィクスチャと一致している", () => {
	test("フィクスチャに現れた種別はすべて一覧にある", () => {
		const missing = [...observedInFixtures].filter(
			(type) => !declared.has(type),
		);
		expect(missing).toEqual([]);
	});

	test("一覧の種別はすべてフィクスチャで観測されている", () => {
		const unobserved = OBSERVED_FIELD_TYPES.filter(
			(type) => !observedInFixtures.has(type),
		);
		expect(unobserved).toEqual([]);
	});
});

describe("setValue が全種別を検査する", () => {
	// 漏れた種別は「未知の型」として素通しされ、検査そのものが効かなくなる。
	// 種別ごとに「明らかに不正な値」を 1 つ用意し、それが弾かれることで
	// VALUE_SHAPE にエントリがあることを確かめる。
	const bogus: { [type: string]: unknown } = {
		RECORD_NUMBER: [],
		__ID__: [],
		__REVISION__: [],
		CREATOR: "文字列",
		MODIFIER: "文字列",
		CREATED_TIME: [],
		UPDATED_TIME: [],
		STATUS: [],
		STATUS_ASSIGNEE: "文字列",
		CATEGORY: "文字列",
		SINGLE_LINE_TEXT: [],
		MULTI_LINE_TEXT: [],
		RICH_TEXT: [],
		NUMBER: [],
		CALC: [],
		LINK: [],
		CHECK_BOX: "文字列",
		RADIO_BUTTON: [],
		MULTI_SELECT: "文字列",
		DROP_DOWN: [],
		DATE: [],
		TIME: [],
		DATETIME: [],
		FILE: [{ 中身が違う: true }],
		USER_SELECT: [{ 中身が違う: true }],
		ORGANIZATION_SELECT: [{ 中身が違う: true }],
		GROUP_SELECT: [{ 中身が違う: true }],
		SUBTABLE: [{ 中身が違う: true }],
	};

	test.each(OBSERVED_FIELD_TYPES)("%s の不正値を弾く", (type) => {
		const record = { f: { type, value: undefined as unknown } };
		expect(canSetValue(record, "f", bogus[type])).toBe(false);
	});
});

describe("ガードが全種別にある", () => {
	// ガードは type から関数名が機械的に決まるので、名前で引けることを確かめる。
	// 例外は SINGLE_LINE_TEXT のような複合語ではなく DROP_DOWN → isDropdown。
	const guardName: { [type: string]: string } = {
		DROP_DOWN: "isDropdown",
		DATETIME: "isDateTime",
		__ID__: "isId",
		__REVISION__: "isRevision",
	};

	const toCamel = (type: string): string =>
		`is${type
			.toLowerCase()
			.replace(/_(.)/g, (_, c: string) => c.toUpperCase())
			.replace(/^(.)/, (_, c: string) => c.toUpperCase())}`;

	test.each(OBSERVED_FIELD_TYPES)("%s のガードがある", (type) => {
		const name = guardName[type] ?? toCamel(type);
		const fn = (guard as unknown as { [key: string]: unknown })[name];
		expect(typeof fn, `${name} が見つかりません`).toBe("function");
		const is = fn as (value: unknown) => boolean;
		expect(is({ type, value: undefined })).toBe(true);
		expect(is({ type: "他の型", value: undefined })).toBe(false);
	});
});

describe("構築子が書き込める全種別にある", () => {
	// 構築子を呼んで type を読む。呼べない種別は書けないはずのもの。
	const built: { type: string }[] = [
		field.singleLineText(""),
		field.multiLineText(""),
		field.richText(""),
		field.number(0),
		field.link(""),
		field.checkBox([]),
		field.radioButton(""),
		field.multiSelect([]),
		field.dropdown(null),
		field.date(null),
		field.time(null),
		field.dateTime(""),
		field.file([]),
		field.userSelect([]),
		field.organizationSelect([]),
		field.groupSelect([]),
		field.subtable([]),
	];

	test("書き込める種別はすべて構築子で作れる", () => {
		const buildable = new Set(built.map(({ type }) => type));
		const missing = writable.filter((type) => !buildable.has(type));
		expect(missing).toEqual([]);
	});

	test("構築子が作る種別はすべて書き込める", () => {
		const notWritable = built
			.map(({ type }) => type)
			.filter((type) => isDroppedOnWrite(type));
		expect(notWritable).toEqual([]);
	});
});

describe("書き込みで落とすべき種別が実際に落ちる", () => {
	test("拒否される種別を含むレコードから、それらが消える", () => {
		const record = Object.fromEntries(
			OBSERVED_FIELD_TYPES.map((type) => [type, { type, value: "x" }]),
		);
		const { record: converted } = toRestWrite(record);

		const survived = OBSERVED_FIELD_TYPES.filter(
			(type) => isRejectedOnWrite(type) && type in converted,
		);
		expect(survived).toEqual([]);

		const dropped = OBSERVED_FIELD_TYPES.filter(
			(type) => !isDroppedOnWrite(type) && !(type in converted),
		);
		expect(dropped).toEqual([]);
	});

	test("$id と $revision は record ではなく id / revision になる", () => {
		const { record, id, revision } = toRestWrite({
			$id: { type: "__ID__", value: "42" },
			$revision: { type: "__REVISION__", value: "7" },
			text: { type: "SINGLE_LINE_TEXT", value: "a" },
		});
		expect(id).toBe("42");
		expect(revision).toBe("7");
		expect(Object.keys(record)).toEqual(["text"]);
	});

	test("undefined を渡しても落ちない", () => {
		expect(isDroppedOnWrite(undefined)).toBe(false);
		expect(isRejectedOnWrite(undefined)).toBe(false);
	});
});

describe("必要な採取文脈が揃っている", () => {
	// 型の主張の中には特定の採取が存在することに依存しているものがある。
	// 既存のテストは全称型が多く、サンプルが減っても素通りで通ってしまうため、
	// 「採ってあること」自体をここで要求する。詳細は test/contexts.ts。
	const observed = samples.map((sample) => ({
		event: sample.event,
		source: sample.source as string,
	}));

	test.each(
		REQUIRED_CONTEXTS.map(
			(requirement) =>
				[
					`${requirement.event}${requirement.match === "prefix" ? "*" : ""} / ${requirement.source}`,
					requirement,
				] as const,
		),
	)("%s が採取されている", (_label, requirement) => {
		const hit = observed.some(({ event, source }) =>
			matchesContext(requirement, event, source),
		);
		expect(hit, `この採取が無いと根拠が消える: ${requirement.why}`).toBe(true);
	});
});

describe("changes.row の根拠", () => {
	// ChangeEvent.row は `Editing.SubtableRow | null`。
	// null 側の根拠は表外の変更で採れるが、**非 null 側は表内の変更でしか採れない**。
	//
	// 手動採取の凍結フィクスチャには非 null のサンプルが 1 件も無かった。
	// つまり型の片側が実測の裏づけ無しで書かれていた。
	// 同じことが起きないよう、両側が実在することを要求する。
	const changeSamples = samples.filter(
		(sample) => sample.changes !== undefined && sample.changes.k === "object",
	);

	const rowOf = (sample: (typeof changeSamples)[number]) =>
		sample.changes?.k === "object" ? sample.changes.props.row : undefined;

	test("表内の変更で changes.row に行が入る", () => {
		const withRow = changeSamples.filter((sample) => {
			const row = rowOf(sample);
			return row?.k === "object" && row.keys.includes("value");
		});
		expect(
			withRow.length,
			"表内のセルを変更した change イベントが採れていない。ChangeEvent.row の非 null 側が根拠を失う",
		).toBeGreaterThan(0);
	});

	test("表外の変更では changes.row が null になる", () => {
		const withNull = changeSamples.filter(
			(sample) => rowOf(sample)?.k === "null",
		);
		expect(
			withNull.length,
			"表外のフィールドを変更した change イベントが採れていない",
		).toBeGreaterThan(0);
	});
});
