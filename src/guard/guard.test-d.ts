import { describe, expectTypeOf, test } from "vitest";
import type { Editing, FileInformation, Saved } from "../types/field.js";
import type { LooseRecord } from "../types/loose.js";
import type { EditingRecord, SavedRecord } from "../types/record.js";
import type { RestRecord } from "../types/rest.js";
import {
	hasValue,
	isCheckBox,
	isDropdown,
	isFile,
	isLookup,
	isNumber,
	isSingleLineText,
	isSubtable,
} from "./record.js";

/**
 * 型ガードが 3 文脈それぞれで正しく絞り込むことを確かめる。
 *
 * kintone-typeguard は 4 名前空間の直積を FFF<A,B,C,D> で扱っており、
 * 絞り込んだあとに何の型か読めなくなっていた。
 * ここでは入力の型がそのまま保たれることを検証する。
 */

describe("Saved のレコードを絞り込む", () => {
	test("value が Saved の型になる", () => {
		const record: SavedRecord = {};
		const f = record.code;
		if (isSingleLineText(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string>();
		}
		if (isDropdown(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string>();
		}
		if (isCheckBox(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string[]>();
		}
	});

	test("サブテーブルの行 id は文字列", () => {
		const record: SavedRecord = {};
		const f = record.table;
		if (isSubtable(f)) {
			expectTypeOf(f.value[0]).toEqualTypeOf<Saved.SubtableRow | undefined>();
		}
	});
});

describe("Editing のレコードを絞り込む", () => {
	test("value に undefined が残る", () => {
		const record: EditingRecord = {};
		const f = record.code;
		if (isSingleLineText(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string | undefined>();
		}
	});

	test("hasValue と組み合わせると undefined が消える", () => {
		const record: EditingRecord = {};
		const f = record.code;
		if (isSingleLineText(f) && hasValue(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string>();
		}
	});

	test("サブテーブルの行 id は null になりうる", () => {
		const record: EditingRecord = {};
		const f = record.table;
		if (isSubtable(f)) {
			expectTypeOf(f.value[0]).toEqualTypeOf<Editing.SubtableRow | undefined>();
		}
	});
});

describe("Rest のレコードを絞り込む", () => {
	test("DROP_DOWN は null になりうる", () => {
		const record: RestRecord = {};
		const f = record.code;
		if (isDropdown(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string | null>();
		}
	});
});

describe("ルックアップは type ではなくキーで判別する", () => {
	test("confirmed と recordId に絞り込める", () => {
		const record: SavedRecord = {};
		const f = record.code;
		if (isLookup(f)) {
			expectTypeOf(f.confirmed).toEqualTypeOf<boolean>();
			expectTypeOf(f.recordId).toEqualTypeOf<string | null>();
		}
	});
});

describe("緩い型のレコードでも絞り込める", () => {
	// プラグインのコードでは、設定から受け取ったフィールドコードで
	// 緩い型のレコードを引く場面が多い。
	// `LooseRecord` は「自前のヘルパを書くときに骨格を再定義しなくて済むよう」
	// 公開しているので、そこでガードが効かないと公開した意味が無い。
	test("type が絞られる", () => {
		const loose: LooseRecord = {};
		const f = loose.code;
		if (isSingleLineText(f)) {
			expectTypeOf(f.type).toEqualTypeOf<"SINGLE_LINE_TEXT">();
		}
	});

	// **`not.toBeNever()` では足りない。** 以前はそう書いていたが、
	// `value` が `unknown` のまま残っていても never ではないので通ってしまい、
	// 実際に絞れていないことに気づけなかった（2026-09-08）。
	// 何に絞られるかを書く。
	test("value まで絞られる。3 文脈の union になる", () => {
		const loose: LooseRecord = {};

		const text = loose.code;
		if (isSingleLineText(text)) {
			// Saved / Rest は string、Editing だけ undefined を持つ
			expectTypeOf(text.value).toEqualTypeOf<string | undefined>();
			// hasValue を重ねれば undefined が落ちる
			if (hasValue(text)) expectTypeOf(text.value).toEqualTypeOf<string>();
		}

		const file = loose.code;
		if (isFile(file)) {
			expectTypeOf(file.value).toEqualTypeOf<FileInformation[]>();
		}

		const table = loose.code;
		if (isSubtable(table)) {
			// 行の配列であること。要素の型は文脈で違うので union になる
			expectTypeOf(table.value).toBeArray();
			expectTypeOf(table.value).not.toBeUnknown();
		}

		const number = loose.code;
		if (isNumber(number)) {
			expectTypeOf(number.value).toEqualTypeOf<string | undefined>();
		}
	});

	test("絞り込んだ値をそのまま使える（unknown だと通らない書き方）", () => {
		const loose: LooseRecord = {};
		const f = loose.code;
		if (isSingleLineText(f) && hasValue(f)) {
			expectTypeOf(f.value.trim()).toEqualTypeOf<string>();
		}
		const g = loose.code;
		if (isFile(g)) {
			expectTypeOf(g.value.length).toEqualTypeOf<number>();
			expectTypeOf(g.value[0]?.fileKey).toEqualTypeOf<string | undefined>();
		}
	});
});

describe("undefined と null を受け付ける", () => {
	test("インデックスアクセスの結果をそのまま渡せる", () => {
		const record: SavedRecord = {};
		// noUncheckedIndexedAccess により undefined を含む
		const f = record.code;
		expectTypeOf(f).toEqualTypeOf<Saved.OneOf | undefined>();
		if (isSingleLineText(f)) {
			expectTypeOf(f.value).toEqualTypeOf<string>();
		}
	});
});
