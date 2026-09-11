import { describe, expectTypeOf, test } from "vitest";
import type { Editing, FileInformation, Rest, Saved } from "../types/field.js";
import type { LooseField, LooseRecord } from "../types/loose.js";
import type { EditingRecord, SavedRecord, SetRecord } from "../types/record.js";
import type { RestRecord } from "../types/rest.js";
import type * as guards from "./record.js";
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

/**
 * ガードの形。**`R` に制約を付けるためだけに名前を付ける。**
 *
 * ## なぜ名前を付けるのか
 *
 * 絞り込み先を取り出すだけなら
 * `F extends (field: ...) => field is infer R ? R : never` と書きたいが、
 * そのままでは TS2677（A type predicate's type must be assignable to its
 * parameter's type）で落ちる。`infer R` に制約が無いので、TypeScript が
 * 「R は引数の型に代入できる」と言えないため。
 * **以前はここを `any` にして黙らせていた。**
 *
 * `field is infer R extends LooseField` と書けば tsc は通る。
 * ただし条件型の中では末尾の `extends` が曖昧になるので関数型を括弧でくくる
 * 必要があり、**biome のフォーマッタがその括弧を外してしまう**
 * （外れると `expected ? but instead found ;` で構文エラー）。
 *
 * 型引数の制約として書けば括弧が要らず、tsc も biome も通る。
 *
 * 引数を `unknown` にする手も試したが、**`hasValue` だけ拾えなくなる**
 * （関数の引数は反変なので、`unknown` を受ける関数としては扱えない）。
 */
type GuardShape<R extends LooseField> = (
	field: LooseField | undefined | null,
) => field is R;

/**
 * ガードの型述語から、絞り込み先の型を取り出す。
 *
 * ジェネリックなガード（`<T extends LooseField>(f: T) => f is Narrow<T, ...>`）は
 * `T` が制約（`LooseField`）で具体化されるので、**緩い入力での絞り込み結果**が取れる。
 */
type NarrowedBy<F> = F extends GuardShape<infer R> ? R : never;

/**
 * `src/guard/record.ts` が出している型述語**すべて**。
 *
 * 表を持たない。エクスポートから拾うので、
 * **ガードを足したら自動でこの検査の対象になる**。
 * 表を作ると、足したのに書き忘れて素通りする道が残る。
 */
type GuardName = {
	// 形は NarrowedBy と同じ。絞り込み先は使わないので名前だけ取る
	[K in keyof typeof guards]: (typeof guards)[K] extends GuardShape<infer _R>
		? K
		: never;
}[keyof typeof guards];

/**
 * 全ガードを総当たりして、**value が絞れていないもの**を集める。
 *
 * `never` になれば全部絞れている。名前が残ればそれが絞れていない。
 * 個別に `expectTypeOf` を書くと、書き忘れた種別が素通りする。
 *
 * `hasValue` だけは除く。あれは `value !== undefined` を主張するもので、
 * `T & { value: Exclude<T["value"], undefined> }` に絞る。
 * `T` が `LooseField` のときは `Exclude<unknown, undefined>` = `unknown` になり、
 * **これは正しい**（種別が分からないので値の型も分からない）。
 * 種別のガードと重ねて初めて絞れる。
 */
type LeftUnknown = {
	[K in Exclude<GuardName, "hasValue">]: NarrowedBy<
		(typeof guards)[K]
	> extends {
		value: infer V;
	}
		? unknown extends V
			? K
			: never
		: K;
}[Exclude<GuardName, "hasValue">];

describe("全ガードを総当たりする", () => {
	// **`not.toBeNever()` では弱い。** 1 つでも拾えていれば通るので、
	// 絞り込みの書き方を変えたときに「29 個中 28 個しか拾えていない」状態を
	// 見逃す。`record.ts` の export は全部が型述語なので、全件と一致するはず
	test("record.ts の型述語を 1 つ残らず拾えている", () => {
		expectTypeOf<GuardName>().toEqualTypeOf<keyof typeof guards>();
	});

	// 緩い入力で value が絞れないガードがあれば、ここに名前が出て落ちる。
	// 2026-09-08 まで 28 種別すべてがここに出る状態だった
	test("value が unknown のまま残るガードは無い", () => {
		expectTypeOf<LeftUnknown>().toBeNever();
	});
});

/**
 * union のうち、そのキーを持つメンバーを集める。
 *
 * **`Extract<U, { disabled: unknown }>` ではだめ。**
 * `disabled?: boolean` のように **optional で生えた場合を素通りする**
 * （2026-09-08 に自分の変異テストで気づいた）。
 * dts-gen の `fieldTypes` はまさに optional で持っているので、
 * 素通りされると引き写しの混入に気づけない。
 *
 * `keyof` で見れば optional でも拾える。
 */
type HavingKey<U, K extends string> = U extends unknown
	? K extends keyof U
		? U
		: never
	: never;

describe("disabled / error はどの読み取り型にも無い", () => {
	// 実測 84 サンプルで 0 件（DECISIONS）。`kintone.app.record.set()` で
	// 設定しても `get()` では返らないので、**書き込み専用**として扱う。
	//
	// 型テストは Saved.SingleLineText の 1 種別だけだった（types.test-d.ts）。
	// union 全体を見れば 28 種別すべてを 1 行で縛れる。
	// 1 つでも持っていれば never にならずに落ちる。
	test("Saved / Editing / Rest のどれも disabled を持たない", () => {
		expectTypeOf<HavingKey<Saved.OneOf, "disabled">>().toBeNever();
		expectTypeOf<HavingKey<Editing.OneOf, "disabled">>().toBeNever();
		expectTypeOf<HavingKey<Rest.OneOf, "disabled">>().toBeNever();
	});

	test("error も同じ", () => {
		expectTypeOf<HavingKey<Saved.OneOf, "error">>().toBeNever();
		expectTypeOf<HavingKey<Editing.OneOf, "error">>().toBeNever();
		expectTypeOf<HavingKey<Rest.OneOf, "error">>().toBeNever();
	});

	// 書き込み用の型は逆に持っていること。
	// 上の主張が「そもそも型が空」で通ってしまわないようにする
	test("書き込み用の SetRecord は disabled / error を持つ", () => {
		expectTypeOf<SetRecord[string]["disabled"]>().toEqualTypeOf<
			boolean | undefined
		>();
		expectTypeOf<SetRecord[string]["error"]>().toEqualTypeOf<
			string | null | undefined
		>();
	});

	// 絞り込んだ先でも生えていないこと。kintone-typeguard のテストが
	// `field.value[0].disabled` を @ts-expect-error で縛っているのと同じ意図
	test("絞り込んだ先にも生えていない", () => {
		const record: SavedRecord = {};
		const f = record.code;
		if (isFile(f)) {
			// @ts-expect-error 添付ファイルの要素に disabled は無い
			f.value[0]?.disabled;
			// @ts-expect-error 添付ファイルの要素に error は無い
			f.value[0]?.error;
		}
		if (isSingleLineText(f)) {
			// @ts-expect-error 読み取り型に disabled は無い
			f.disabled;
			// @ts-expect-error 読み取り型に error は無い
			f.error;
		}
	});
});
