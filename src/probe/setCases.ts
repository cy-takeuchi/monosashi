/**
 * `kintone.app.record.set()` に「何を渡すと弾かれるか」を測るケース定義。
 *
 * `toSetRecord`（未実装）が何を落とし、何を変換すべきかは、この結果が根拠になる。
 * 推測で「読み取り専用は落とすべき」と決めるのではなく、実際に渡して確かめる（#14）。
 *
 * ## REST 版（`tools/probe-write/cases.ts`）と何が違うか
 *
 * REST は Node から投げられるが、**`set()` はブラウザでしか動かない**。
 * しかも `events.on` のハンドラ内では動かないので、ボタン経由で呼ぶ必要がある。
 * そのためケース定義がここ（`src/probe/`）に居る。
 *
 * ## 主な用途は 2 方向ある
 *
 * | 向き | 何が問題になるか |
 * |---|---|
 * | `get()` → `set()` | JS API 同士なので値の表現は揃っている。落とす種別だけが論点 |
 * | **REST の `getRecord` → `set()`** | **値の表現が違う**（`DROP_DOWN` の未入力が REST は `null`、JS API は `""`） |
 *
 * 後者のほうが厄介で、フィルタだけでは済まない可能性がある。
 * `dropdown-null` のケースがそこを直接確かめる。
 *
 * ## 失敗の観測方法
 *
 * `set()` が失敗したときに **JS の例外として捕まるかどうかが分かっていない**。
 * 既に分かっているのは、`type` を省くと kintone が
 * 「カスタマイズ用の JavaScript の実行時にエラーが発生しました」を出すこと
 * （実測 2026-08-30）。あれは**捕まえられなかった**エラーの表示なので、
 * try/catch すれば捕まる見込みだが、確かめていない。
 *
 * どちらでも記録できるように、各ケースで 2 つを残す。
 *
 * 1. **例外が出たか**（出たならメッセージ）
 * 2. **`set()` の前後で `get()` の値が変わったか**
 *
 * 例外も出ず値も変わらなければ「黙って無視された」と言える。
 * kintone のエラー表示を DOM から読むことはしない（内部セレクタは使用禁止）。
 */

/** 現在のレコードから解決した、種別ごとの代表フィールドコード */
export type ResolvedCodes = {
	/** 種別 → その種別を持つ最初のフィールドコード */
	readonly byType: { readonly [type: string]: string | undefined };
	/** サブテーブルのフィールドコードと、既存の行 id */
	readonly subtable:
		| { readonly code: string; readonly rowIds: readonly (string | null)[] }
		| undefined;
	/** 中身のある FILE のフィールドコードと、その 1 件目 */
	readonly file:
		| {
				readonly code: string;
				readonly first: Readonly<Record<string, unknown>>;
		  }
		| undefined;
};

export type SetCase = {
	readonly id: string;
	/** 何を確かめたいか。そのまま表の 1 列になる */
	readonly question: string;
	/**
	 * `set()` に渡すレコードを組み立てる。
	 *
	 * `undefined` を返すとそのケースは飛ばす（この画面には対象が無い、など）。
	 * 飛ばしたことも結果に残すので、黙って減ることはない。
	 */
	readonly build: (codes: ResolvedCodes) => Record<string, unknown> | undefined;
	/**
	 * 前後を比べるフィールドコード。
	 *
	 * 既定は `build` が返したレコードのキー。
	 * 「A を渡したら B が変わった」を見たいときだけ指定する。
	 */
	readonly watch?: (codes: ResolvedCodes) => readonly string[];
};

/**
 * 「`get()` で読んだ値をそのまま使う」の目印。
 *
 * ケース定義は純粋にしておきたいので、実際の値の差し込みは
 * 実行側（`main.ts`）が行う。ここでは印だけを置く。
 */
export const CURRENT_VALUE = Symbol("現在の値をそのまま使う");

/**
 * サブテーブルの行を組み立て直す目印。
 *
 * どちらも**セルを 1 つ書き換える**。同じ行をそのまま渡すと
 * 前後が一致してしまい、「id が保たれた」のか「まるごと無視された」のかが
 * 区別できない（読み取り専用のケースと同じ理由）。
 *
 * 書き換えるセルは `type` が `SINGLE_LINE_TEXT` の最初のもの。
 * フィールドコードは我々が決めたものなので当てにしない。
 */
export const ROWS_KEEP_ID = Symbol("行 id を保ったまま、セルを 1 つ書き換える");
export const ROWS_DROP_ID = Symbol("行 id を外して、セルを 1 つ書き換える");

/** 上の 2 つがセルに入れる値。前後の差として読める文字列にする */
export const EDITED_CELL = "set() で書き換えたセル";

/** 読み取り専用として REST が拒否した種別（`fixtures/write-behavior.md`）*/
const READ_ONLY_TYPES = [
	"RECORD_NUMBER",
	"CREATOR",
	"CREATED_TIME",
	"MODIFIER",
	"UPDATED_TIME",
	"STATUS",
	"STATUS_ASSIGNEE",
	"CATEGORY",
] as const;

/**
 * 読み取り専用の種別ごとに、**いまと違う値**を渡す。
 *
 * ## なぜ「get() の値をそのまま」ではだめだったか
 *
 * 最初は現在の値をそのまま返していた。**変わらないのが当たり前**で、
 * 「無視された」としか記録できず、
 * **書き換えられるのかどうかが分からない**（2026-09-08 に踏んだ）。
 *
 * 違う値を渡すと 3 つに分かれる。
 *
 * | 結果 | 意味 |
 * |---|---|
 * | エラー表示 | 種別として拒否される |
 * | 値が変わった | **書き換えられてしまう**（落とさないと画面が壊れる） |
 * | 値が変わらない | 黙って無視される |
 *
 * ## 型ごとに「明らかに違う値」を用意する
 *
 * `VALUE_SHAPE` が受け付ける形に合わせる。形を外すと
 * 「値の形が不正だから拒否された」のか
 * 「種別として拒否された」のかが混ざる。
 */
const DIFFERENT_VALUE: { readonly [type: string]: unknown } = {
	RECORD_NUMBER: "SET-9999",
	CREATOR: { code: "no-such-user", name: "実測用の別人" },
	CREATED_TIME: "2000-01-01T00:00:00Z",
	MODIFIER: { code: "no-such-user", name: "実測用の別人" },
	UPDATED_TIME: "2000-01-01T00:00:00Z",
	STATUS: "実測用の別ステータス",
	STATUS_ASSIGNEE: [{ code: "no-such-user", name: "実測用の別人" }],
	CATEGORY: ["実測用の別カテゴリー"],
};

const readOnlyCases: SetCase[] = READ_ONLY_TYPES.map((type) => ({
	id: `readonly-${type.toLowerCase()}`,
	question: `読み取り専用の ${type} に別の値を渡す`,
	build: (codes) => {
		const code = codes.byType[type];
		if (code === undefined) return undefined;
		return { [code]: { type, value: DIFFERENT_VALUE[type] } };
	},
}));

export const SET_CASES: SetCase[] = [
	// -------------------------------------------------------------------
	// 本命。REST から取ったレコードをそのまま渡せるか
	// -------------------------------------------------------------------
	// `null` を渡すケースは **種別ごとに 1 つずつ置く**。
	//
	// `DROP_DOWN` / `DATE` / `TIME` は `VALUE_SHAPE` 上では同じ形だが、
	// **形でまとめない。** 結論は種別ごとの表になる
	// （`REJECTED_ON_WRITE` が種別の一覧であるのと同じ）。
	//
	// 1 つだけ測って残りを「同じ形だから同じだろう」と埋めるのが、
	// このリポジトリが繰り返し塞いできた誤り。
	// 3 つとも測れば、3 つとも根拠を持つ。
	{
		id: "dropdown-null",
		question:
			"値が入った DROP_DOWN に null を渡す（REST の未入力表現。消えるか無視されるか）",
		build: (codes) => {
			const code = codes.byType.DROP_DOWN;
			if (code === undefined) return undefined;
			return { [code]: { type: "DROP_DOWN", value: null } };
		},
	},
	{
		id: "date-null",
		question:
			"DATE に null を渡す（REST も詳細画面も null。DROP_DOWN と同じ形）",
		build: (codes) => {
			const code = codes.byType.DATE;
			if (code === undefined) return undefined;
			return { [code]: { type: "DATE", value: null } };
		},
	},
	{
		id: "time-null",
		question:
			"TIME に null を渡す（nullableString の 3 つ目。3 つ揃えて比べる）",
		build: (codes) => {
			const code = codes.byType.TIME;
			if (code === undefined) return undefined;
			return { [code]: { type: "TIME", value: null } };
		},
	},
	{
		id: "single-line-text-null",
		question:
			"値が入った SINGLE_LINE_TEXT に null を渡す（string 型なので想定外。対照）",
		build: (codes) => {
			const code = codes.byType.SINGLE_LINE_TEXT;
			if (code === undefined) return undefined;
			return { [code]: { type: "SINGLE_LINE_TEXT", value: null } };
		},
	},

	// -------------------------------------------------------------------
	// 読み取り専用フィールド。落とす対象を決める
	// -------------------------------------------------------------------
	...readOnlyCases,
	{
		id: "id-revision",
		question: "$id / $revision に別の値を渡す（書き換えられてしまうか）",
		build: (codes) => {
			const id = codes.byType.__ID__;
			const revision = codes.byType.__REVISION__;
			if (id === undefined && revision === undefined) return undefined;
			const out: Record<string, unknown> = {};
			// 現在の値をそのまま渡すと変化が読めない（読み取り専用のケースと同じ理由）
			if (id !== undefined) out[id] = { type: "__ID__", value: "999999" };
			if (revision !== undefined) {
				out[revision] = { type: "__REVISION__", value: "999" };
			}
			return out;
		},
	},
	{
		id: "calc",
		question:
			"CALC に別の値を渡す（REST は受け入れて無視する。set() は別 API）",
		build: (codes) => {
			const code = codes.byType.CALC;
			if (code === undefined) return undefined;
			return { [code]: { type: "CALC", value: "999999" } };
		},
	},

	// -------------------------------------------------------------------
	// FILE。kintone-typeguard が { fileKey } だけに削っている根拠を確かめる
	// -------------------------------------------------------------------
	{
		id: "file-all-keys",
		question:
			"FILE に 4 キーすべてを渡す（contentType / fileKey / name / size。REST も JS API も同形）",
		build: (codes) => {
			if (codes.file === undefined) return undefined;
			return {
				[codes.file.code]: { type: "FILE", value: [codes.file.first] },
			};
		},
	},
	{
		id: "file-key-only",
		question:
			"FILE に fileKey だけを渡す（kintone-typeguard がこの形に削っている）",
		build: (codes) => {
			if (codes.file === undefined) return undefined;
			const { fileKey } = codes.file.first;
			if (typeof fileKey !== "string") return undefined;
			return { [codes.file.code]: { type: "FILE", value: [{ fileKey }] } };
		},
	},
	{
		id: "file-empty",
		question: "FILE に空配列を渡す（添付を消せるか）",
		build: (codes) => {
			if (codes.file === undefined) return undefined;
			return { [codes.file.code]: { type: "FILE", value: [] } };
		},
	},

	// -------------------------------------------------------------------
	// サブテーブル。行 id をそのまま渡せるか
	// -------------------------------------------------------------------
	{
		id: "subtable-keep-row-id",
		question:
			"行 id を付けたままセルを書き換える（id が保たれるか。REST の行をそのまま渡せるか）",
		build: (codes) => {
			if (codes.subtable === undefined) return undefined;
			return {
				[codes.subtable.code]: { type: "SUBTABLE", value: ROWS_KEEP_ID },
			};
		},
	},
	{
		id: "subtable-drop-row-id",
		question:
			"行 id を外してセルを書き換える（id が振り直されるか、行が置き換わるか）",
		build: (codes) => {
			if (codes.subtable === undefined) return undefined;
			return {
				[codes.subtable.code]: { type: "SUBTABLE", value: ROWS_DROP_ID },
			};
		},
	},

	// -------------------------------------------------------------------
	// ルックアップ。JS API 側だけが持つ余分なキー
	// -------------------------------------------------------------------
	{
		id: "lookup-extra-keys",
		question:
			"confirmed / recordId を付けたまま渡す（JS API 由来をそのまま渡した場合）",
		build: (codes) => {
			const code = codes.byType.SINGLE_LINE_TEXT;
			if (code === undefined) return undefined;
			return {
				[code]: {
					// 値も変える。同じ値だと「余分なキーのせいで無視された」のか
					// 「もともと変わらない」のかが分からない
					type: "SINGLE_LINE_TEXT",
					value: "余分なキー付きで渡した値",
					confirmed: true,
					recordId: "1",
				},
			};
		},
	},

	// -------------------------------------------------------------------
	// 既に実測済みのもの。回帰として残す
	// -------------------------------------------------------------------
	{
		id: "no-type",
		question:
			"type を省いて渡す（実測 2026-08-30 では落ちた。回帰として確かめる）",
		build: (codes) => {
			const code = codes.byType.SINGLE_LINE_TEXT;
			if (code === undefined) return undefined;
			return { [code]: { value: "type を省いた" } };
		},
	},
	{
		id: "unknown-field-code",
		question: "存在しないフィールドコードを渡す",
		build: () => ({
			この項目は存在しない: { type: "SINGLE_LINE_TEXT", value: "x" },
		}),
		watch: () => [],
	},
];
