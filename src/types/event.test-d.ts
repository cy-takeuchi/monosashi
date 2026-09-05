import { describe, expectTypeOf, test } from "vitest";
import type { EventOf, KintoneEventName, UnknownKintoneEvent } from "./event";
import type { CreateRecord, EditingRecord, SavedRecord } from "./record";

/**
 * イベント名から event の形が引けることを確かめる。
 *
 * これが機能しないなら、6 つのプラグインが手書きしている
 * 各プラグインが手書きしているイベント型を置き換えられない。
 */

describe("show 系", () => {
	test("詳細画面は recordId が number で record は Saved", () => {
		type E = EventOf<"app.record.detail.show">;
		expectTypeOf<E["recordId"]>().toEqualTypeOf<number>();
		expectTypeOf<E["record"]>().toEqualTypeOf<SavedRecord>();
		expectTypeOf<E["appId"]>().toEqualTypeOf<number>();
	});

	test("編集画面の show はまだ Saved", () => {
		type E = EventOf<"app.record.edit.show">;
		expectTypeOf<E["record"]>().toEqualTypeOf<SavedRecord>();
	});

	test("作成画面は recordId を持たず reuse を持つ", () => {
		type E = EventOf<"app.record.create.show">;
		expectTypeOf<E["reuse"]>().toEqualTypeOf<boolean>();
		expectTypeOf<E["record"]>().toEqualTypeOf<CreateRecord>();
		// @ts-expect-error 作成画面に recordId は無い
		type _ = E["recordId"];
	});

	test("一覧画面は実測で見つかったキーを持つ", () => {
		type E = EventOf<"app.record.index.show">;
		expectTypeOf<E["viewName"]>().toEqualTypeOf<string>();
		expectTypeOf<E["offset"]>().toEqualTypeOf<number>();
		expectTypeOf<E["size"]>().toEqualTypeOf<number>();
		expectTypeOf<E["date"]>().toEqualTypeOf<string | null>();
		expectTypeOf<E["records"]>().toEqualTypeOf<SavedRecord[]>();
	});

	test("モバイル版も同じ形で引ける", () => {
		type E = EventOf<"mobile.app.record.detail.show">;
		expectTypeOf<E["record"]>().toEqualTypeOf<SavedRecord>();
	});
});

describe("submit 系", () => {
	test("編集の submit は Editing のレコードを持つ", () => {
		type E = EventOf<"app.record.edit.submit">;
		expectTypeOf<E["record"]>().toEqualTypeOf<EditingRecord>();
	});

	test("作成の submit はシステムフィールドを持たないレコード", () => {
		type E = EventOf<"app.record.create.submit">;
		expectTypeOf<E["record"]>().toEqualTypeOf<CreateRecord>();
	});

	test("submit の error は optional", () => {
		type E = EventOf<"app.record.edit.submit">;
		expectTypeOf<E["error"]>().toEqualTypeOf<string | undefined>();
	});

	test("submit.success の recordId は string（他は number）", () => {
		expectTypeOf<
			EventOf<"app.record.edit.submit.success">["recordId"]
		>().toEqualTypeOf<string>();
		expectTypeOf<
			EventOf<"app.record.create.submit.success">["recordId"]
		>().toEqualTypeOf<string>();
		expectTypeOf<
			EventOf<"app.record.edit.submit">["recordId"]
		>().toEqualTypeOf<number>();
	});

	test("submit.success は record を持つ（url ではない）", () => {
		type E = EventOf<"app.record.create.submit.success">;
		expectTypeOf<E["record"]>().toEqualTypeOf<SavedRecord>();
		// @ts-expect-error url は存在しない
		type _ = E["url"];
	});
});

describe("一覧のインライン編集（2026-09-05 実測）", () => {
	test("show の recordId は string。編集画面（number）と違う", () => {
		expectTypeOf<
			EventOf<"app.record.index.edit.show">["recordId"]
		>().toEqualTypeOf<string>();
		expectTypeOf<
			EventOf<"app.record.edit.show">["recordId"]
		>().toEqualTypeOf<number>();
	});

	test("change も appId / recordId が string", () => {
		type E = EventOf<"app.record.index.edit.change.singleLineText">;
		expectTypeOf<E["appId"]>().toEqualTypeOf<string>();
		expectTypeOf<E["recordId"]>().toEqualTypeOf<string>();
	});

	test("submit は appId まで string。編集画面の submit は number", () => {
		expectTypeOf<
			EventOf<"app.record.index.edit.submit">["appId"]
		>().toEqualTypeOf<string>();
		expectTypeOf<
			EventOf<"app.record.index.edit.submit">["recordId"]
		>().toEqualTypeOf<string>();
		expectTypeOf<
			EventOf<"app.record.edit.submit">["appId"]
		>().toEqualTypeOf<number>();
	});
});

describe("プロセス管理（2026-09-05 実測）", () => {
	test("appId も recordId も持たない", () => {
		type E = EventOf<"app.record.detail.process.proceed">;
		// @ts-expect-error 実測では envelope に appId が無かった
		type _appId = E["appId"];
		// @ts-expect-error 実測では envelope に recordId が無かった
		type _recordId = E["recordId"];
	});

	test("action / status / nextStatus は文字列ではなくオブジェクト", () => {
		type E = EventOf<"app.record.detail.process.proceed">;
		expectTypeOf<E["action"]>().toEqualTypeOf<{ value: string }>();
		expectTypeOf<E["status"]>().toEqualTypeOf<{ value: string }>();
		expectTypeOf<E["nextStatus"]>().toEqualTypeOf<{ value: string }>();
	});
});

describe("モバイル（2026-09-05 実測）", () => {
	test("編集画面の record だけ Editing。PC とも詳細画面とも違う", () => {
		expectTypeOf<
			EventOf<"mobile.app.record.edit.show">["record"]
		>().toEqualTypeOf<EditingRecord>();
		expectTypeOf<
			EventOf<"app.record.edit.show">["record"]
		>().toEqualTypeOf<SavedRecord>();
		expectTypeOf<
			EventOf<"mobile.app.record.detail.show">["record"]
		>().toEqualTypeOf<SavedRecord>();
	});
});

describe("change 系", () => {
	test("フィールドコードが埋まったイベント名を引ける", () => {
		type E = EventOf<"app.record.edit.change.singleLineText">;
		expectTypeOf<E["record"]>().toEqualTypeOf<EditingRecord>();
		expectTypeOf<E["changes"]["row"]>().not.toBeNever();
	});

	test("recordId の有無が画面で違う（2026-09-05 実測）", () => {
		// 作成画面の change は recordId を持たない
		type Create = EventOf<"app.record.create.change.singleLineText">;
		// @ts-expect-error 実測では create.change に recordId が無かった
		type _ = Create["recordId"];

		// 編集画面は持つ
		expectTypeOf<
			EventOf<"app.record.edit.change.singleLineText">["recordId"]
		>().toEqualTypeOf<number>();
	});

	test("作成画面の change は CreateRecord", () => {
		type E = EventOf<"app.record.create.change.foo">;
		expectTypeOf<E["record"]>().toEqualTypeOf<CreateRecord>();
	});
});

describe("未知イベントの退避口", () => {
	test("マップに無い名前は緩い型になる", () => {
		expectTypeOf<
			EventOf<"kintone.が.将来.追加する.イベント">
		>().toEqualTypeOf<UnknownKintoneEvent>();
	});

	test("既知のイベント名は退避口にならない", () => {
		expectTypeOf<
			EventOf<"app.record.detail.show">
		>().not.toEqualTypeOf<UnknownKintoneEvent>();
	});
});

describe("kintone.events.on が絞り込めること", () => {
	test("単一のイベント名", () => {
		kintone.events.on("app.record.detail.show", (event) => {
			expectTypeOf(event.recordId).toEqualTypeOf<number>();
			expectTypeOf(event.record).toEqualTypeOf<SavedRecord>();
			return event;
		});
	});

	test("配列で渡すとユニオンになる", () => {
		kintone.events.on(
			["app.record.detail.show", "app.record.edit.show"],
			(event) => {
				expectTypeOf(event.recordId).toEqualTypeOf<number>();
				expectTypeOf(event.record).toEqualTypeOf<SavedRecord>();
				return event;
			},
		);
	});

	test("submit では error を足して返せる", () => {
		kintone.events.on("app.record.edit.submit", (event) => {
			return { ...event, error: "保存できません" };
		});
	});

	test("未知のイベント名も渡せる", () => {
		kintone.events.on("将来の.新しい.イベント", (event) => {
			expectTypeOf(event.type).toEqualTypeOf<string>();
			return event;
		});
	});
});

describe("kintone.app.record", () => {
	test("get() は Editing のレコードを返す", () => {
		const result = kintone.app.record.get();
		if (result === null) return;
		expectTypeOf(result.record).toEqualTypeOf<EditingRecord>();
	});

	test("set() は disabled / error を受け付ける", () => {
		kintone.app.record.set({
			record: {
				singleLineText: {
					type: "SINGLE_LINE_TEXT",
					value: "a",
					disabled: true,
					error: "だめ",
				},
			},
		});
	});

	test("set() は type を省略できない", () => {
		kintone.app.record.set({
			record: {
				// @ts-expect-error type が無いと実行時に「type が不正です」で落ちる（実測）
				singleLineText: { value: "a" },
			},
		});
	});

	test("set() は部分更新できる。変えたいフィールドだけでよい", () => {
		kintone.app.record.set({
			record: { singleLineText: { type: "SINGLE_LINE_TEXT", value: "a" } },
		});
	});
});

describe("イベント名の網羅", () => {
	test("主要なイベントがマップに含まれている", () => {
		expectTypeOf<"app.record.detail.show">().toMatchTypeOf<KintoneEventName>();
		expectTypeOf<"app.record.create.submit">().toMatchTypeOf<KintoneEventName>();
		expectTypeOf<"mobile.app.record.index.show">().toMatchTypeOf<KintoneEventName>();
		expectTypeOf<"portal.show">().toMatchTypeOf<KintoneEventName>();
		expectTypeOf<"app.report.show">().toMatchTypeOf<KintoneEventName>();
	});
});
