import {
	runPackCheck,
	type Scenario,
	shippedConsumer,
} from "@jissoku/rig/packCheck";
import { runScript } from "@jissoku/rig/run";

/**
 * 公開したときに利用者が本当に使えるかを、tarball を入れて確かめる。
 * **シナリオだけを持つ。**
 *
 * 手順（pack → 空プロジェクトへ install → 依存の実体を確かめる →
 * 2 モード × 2 バージョンで型検査 → 実行時に読み込む）は
 * `@jissoku/rig/packCheck` にある。
 *
 * ## なぜ build:check では足りないか
 *
 * `test/dist/consumer.ts` は `../../dist/index` と**相対パスで**読んでいる。
 * これは `.d.ts` の劣化は捕まえられるが、
 *
 *   - `exports` マップ
 *   - `files` に入れ忘れたファイル
 *   - `types` の指し先
 *   - `moduleResolution` の違い
 *   - そもそも実行時に読み込めるか
 *
 * を一切通らない。**パッケージ名で解決していない**のが穴で、
 * `exports` が壊れていても build:check は緑のままになる。
 *
 * ここでは `pnpm pack` した tarball を空のプロジェクトに入れ、
 * `tsumekae` という名前で読む。利用者と同じ経路になる。
 *
 * kintone に接続しないので、認証情報なしでいつでも回せる。
 */

/**
 * 出荷物の consumer を、パッケージ名で解決して読む。
 *
 * `build:check` が相対パスで見ているのと**同じ主張**を、`exports` マップ
 * 経由でもう一度確かめる。サブテーブルの行 `id` と `*WithMeta` の交差型は
 * TypeScript 7 の宣言出力で実際に壊れた箇所なので、
 * 解決経路を変えても保たれることを見る。
 */
const SHIPPED_CONSUMER = shippedConsumer("tsumekae");

/**
 * `@kintone/rest-api-client` を入れていない利用者。
 *
 * 本体は REST に依存しないので、**これが通らなければ切り出しが失敗している**。
 * 逆にここが通ることが、ブラウザ側だけの利用者に 7MB を背負わせていない証拠になる。
 */
const CONSUMER = `
// グローバル拡張はこの副作用 import でのみ有効になる
import "tsumekae/kintone";
import {
	type Api,
	type EventOf,
	field,
	guard,
	type LooseField,
	type LooseRecord,
	type Rest,
	type RestRecord,
	convertFieldForSet,
	isRejectedOnSet,
	setValue,
	toSetRecord,
	toUpdateParams,
} from "tsumekae";

// REST で取ったレコードを画面に反映する経路。set() は REST と除く対象が違う
declare const restRecord2: RestRecord;
const forSet = toSetRecord(restRecord2);
const forSetCell = convertFieldForSet({ type: "NUMBER", value: "1" });
const catRejected: boolean = isRejectedOnSet("CATEGORY");

const text = field.singleLineText("a");
const record: LooseRecord = { text };
setValue(record, "text", "b");
const params: { app: string; id: string } = toUpdateParams("1", record);

declare const cell: LooseField;
if (guard.isSingleLineText(cell)) console.log(cell.type);

// REST の型も本体から出る。外部依存は要らない
declare const restRecord: RestRecord;
declare const restNumber: Rest.Number;

// イベント名から event の形が引けること
type Detail = EventOf<"app.record.detail.show">;
declare const detail: Detail;
const recordId: number = detail.recordId;

// グローバルが生えていること
kintone.events.on("app.record.detail.show", (event) => event);

// **dts-gen にしか無かったもの**が生えていること
const appId: number | null = kintone.app.getId();
const user: string = kintone.getLoginUser().name;
const pluginConfig = kintone.plugin.app.getConfig("id");

// **dts-gen に無い、公式ドキュメントの API** が生えていること
declare const fields: Promise<Record<string, { type: string }>>;
const form: typeof fields = kintone.app.getFormFields();
const answer: Promise<"OK" | "CANCEL" | "CLOSE"> = kintone.showConfirmDialog({
	title: "確認",
});
const shown: Promise<void> = kintone.app.record.setFieldStyle("code", {
	content: { color: "red" },
});
const state: Promise<"VISIBLE" | "HIDDEN"> =
	kintone.app.record.getPagerDisplayState();

// JS API の値の型はルートから引ける
declare const loginUser: Api.LoginUser;

// **DOM の型も Api から引けること。** 名前空間の外に置いていた頃は
// exports が "." と "./kintone" の 2 つだけなので名前で参照できず、
// showOpenDialog に body を渡す型が利用者から書けなかった
declare const dialogBody: Api.DomElement;
declare const uploadValue: Api.DomBlob;
const dialog: Api.DialogConfig = { title: "確認", body: dialogBody };
const upload: Api.ProxyUploadData = { format: "RAW", value: uploadValue };

console.log(appId, user, pluginConfig, form, answer, shown, state, loginUser);
console.log(dialog, upload);

console.log(params, recordId, restRecord, restNumber);
console.log(forSet, forSetCell, catRejected);
`;

/**
 * 自前の `kintone.d.ts` を持つプロジェクトが、
 * **JS API の宣言はそのまま使い、レコードの値の型だけ tsumekae から取る**形。
 *
 * `tsumekae/kintone` は import しない。代わりに自分の `declare global` の中で
 * `EditingRecord` / `SetRecord` / `EventOf` を参照する。
 * 名前空間のマージが起きないので、順序に依存しない。
 *
 * `getFormFields` は tsumekae 側に無い宣言で、
 * **併用しても自前の宣言を失わない**ことの証拠として置いている。
 */
const OWN_AMBIENT = `
import type {
	EditingRecord,
	EventOf,
	KintoneEventName,
	SetRecord,
} from "tsumekae";

declare global {
	namespace kintone {
		namespace app {
			namespace record {
				function get(): { record: EditingRecord } | null;
				function set(record: { record: SetRecord }): void;
			}
			function getFormFields(): Promise<{ [code: string]: { type: string } }>;
		}
		namespace events {
			function on<Name extends KintoneEventName>(
				event: Name | Name[],
				handler: (event: EventOf<Name>) => unknown,
			): void;
		}
	}
}
`;

/**
 * 併用したときにぶつかる相手。`get()` が any のまま残っている自前宣言。
 *
 * **リポジトリに残っている唯一の `any`。** これは我々のコードではなく
 * 「利用者がこう書いていたら」という**検査の入力**なので、消すと
 * シナリオそのものが成り立たない。文字列の中なので biome も見ない。
 */
const OWN_ANY_AMBIENT = `
export {};
declare global {
	namespace kintone {
		namespace app {
			namespace record {
				function get(): any;
			}
		}
	}
}
`;

/** 自前 ambient に tsumekae の型を差し込んだプロジェクトの利用コード */
const OWN_AMBIENT_CONSUMER = `
import { guard } from "tsumekae";

// 自前にしか無い宣言が生きている
const fields = kintone.app.getFormFields();

// get() の値の型は tsumekae から来ている
const got = kintone.app.record.get();
if (got !== null) {
	const cell = got.record.text;
	if (guard.isSingleLineText(cell) && guard.hasValue(cell)) {
		const value: string = cell.value;
		console.log(value);
	}
}

// set() は type 必須（実測 2026-08-30）
kintone.app.record.set({
	record: { text: { type: "SINGLE_LINE_TEXT", value: "x" } },
});

// イベントも自前の宣言経由で引ける
kintone.events.on("app.record.detail.show", (event) => {
	const recordId: number = event.recordId;
	console.log(recordId);
});

console.log(fields);
`;

/**
 * 名前空間がマージされたときに、tsumekae 側が採用されたかを見る踏み台。
 *
 * tsumekae が勝てば「そんなプロパティは無い」で落ちる。
 * 自前の any が勝てば **1 つも落ちない**。
 * `any` は TS2339 を出しようがないので、この 1 つで勝敗が決まる。
 */
const MERGE_PROBE = `
import "tsumekae/kintone";

const got = kintone.app.record.get();
if (got === null) throw new Error("一覧画面では null");
const value: string = got.record.text.存在しないプロパティ;
export { value };
`;

/**
 * AWS SAM の Lambda 相当。**`kintone` グローバルも DOM も無い**。
 *
 * `tsumekae/kintone` を import しない。ルートだけを使う。
 * ここが通ることが、サーバサイドで本体だけ使えることの証拠になる。
 */
const NODE_CONSUMER = `
import {
	type Api,
	field,
	guard,
	type RestRecord,
	toRestWrite,
	toUpdateParams,
} from "tsumekae";

declare const sink: (value: unknown) => void;
declare const record: RestRecord;

const params = toUpdateParams("1", { text: field.singleLineText("x") });
const converted = toRestWrite({ text: field.singleLineText("x") });
if (guard.isSingleLineText(record.code)) sink(record.code.value);

// DOM を参照する型もルートから引ける。DOM が無い環境でも解決できること
declare const upload: Api.ProxyUploadData;
declare const dialog: Api.DialogConfig;

sink([params, converted, upload, dialog]);
`;

const SCENARIOS: readonly Scenario[] = [
	{
		name: "tsumekae/kintone をそのまま使う",
		files: { "consumer.ts": CONSUMER },
		entries: ["consumer.ts"],
		expected: [],
	},
	{
		name: "出荷物の consumer をパッケージ名で解決する",
		files: { "shipped.ts": SHIPPED_CONSUMER },
		entries: ["shipped.ts"],
		expected: [],
		note: "build:check が相対パスで見ているのと同じ主張を exports マップ経由でも確かめる。行 id と *WithMeta の交差型は TS 7 の宣言出力で実際に壊れた箇所",
	},
	{
		name: "自前 ambient に tsumekae の型を差し込む（推奨）",
		files: { "own.d.ts": OWN_AMBIENT, "own-consumer.ts": OWN_AMBIENT_CONSUMER },
		entries: ["own.d.ts", "own-consumer.ts"],
		expected: [],
	},
	{
		name: "併用: 自前 ambient が先。tsumekae が勝つ",
		files: { "own-any.d.ts": OWN_ANY_AMBIENT, "probe.ts": MERGE_PROBE },
		entries: ["own-any.d.ts", "probe.ts"],
		expected: ["TS2339"],
	},
	{
		name: "併用: tsumekae が先。自前の any が黙って勝つ",
		files: { "own-any.d.ts": OWN_ANY_AMBIENT, "probe.ts": MERGE_PROBE },
		entries: ["probe.ts", "own-any.d.ts"],
		expected: [],
		note:
			"**これは望ましい結果ではない。** 同じ名前空間をマージすると、" +
			"同名の関数はオーバーロードとして併存し、先に宣言された側が採用される。" +
			"TypeScript は Duplicate identifier を出さないので、" +
			"型が any に落ちたことに誰も気づけない。" +
			"1 つ上との違いは files の並びだけで、どちらも診断はゼロ。" +
			"この挙動が変わったら README を直す",
	},
	{
		name: "Node（AWS SAM 相当）。kintone グローバルも DOM も無い",
		files: { "node-consumer.ts": NODE_CONSUMER },
		entries: ["node-consumer.ts"],
		expected: [],
		lib: ["ES2022"],
		// **skipLibCheck を切る。** 切らないと、こちらの .d.ts が DOM を
		// 参照していても TS2304 が出ず、型が黙って any に落ちる。
		// 2026-09-08 まで実際にそうなっていた（Element / Blob を直接書いていた）
		skipLibCheck: false,
	},
	{
		name: "dist/*.d.ts 自体を検査する（skipLibCheck: false）",
		files: { "consumer.ts": CONSUMER },
		entries: ["consumer.ts"],
		expected: [],
		skipLibCheck: false,
		note:
			"利用者は既定の skipLibCheck: true で使うので、" +
			"**こちらの .d.ts が壊れていてもエラーにならず、型が黙って any に落ちる**。" +
			"上のシナリオはどれも「通ること」しか見ていないので、any でも緑になる。" +
			"ここだけは .d.ts を直接検査して、その穴を塞ぐ",
	},
];

runScript(() => {
	runPackCheck({ packageName: "tsumekae", scenarios: SCENARIOS });
});
