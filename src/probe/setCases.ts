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

/** 「行 id を外す」の目印。実際の加工は実行側が行う */
export const STRIP_ROW_IDS = Symbol("サブテーブルの行 id を外す");

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
 * 読み取り専用フィールドを 1 種別ずつ渡すケース。
 *
 * まとめて 1 ケースにすると「どれが拒否されたか」が分からない。
 * REST 版も 1 種別ずつ投げている。
 *
 * 値は `get()` で読んだものをそのまま返す。
 * 別の値を作ると「値が不正だから拒否された」のか
 * 「種別として拒否された」のかが混ざる。
 */
const readOnlyCases: SetCase[] = READ_ONLY_TYPES.map((type) => ({
	id: `readonly-${type.toLowerCase()}`,
	question: `読み取り専用の ${type} を渡す（値は get() のまま）`,
	build: (codes) => {
		const code = codes.byType[type];
		if (code === undefined) return undefined;
		return { [code]: { type, value: CURRENT_VALUE } };
	},
}));

export const SET_CASES: SetCase[] = [
	// -------------------------------------------------------------------
	// 本命。REST から取ったレコードをそのまま渡せるか
	// -------------------------------------------------------------------
	// `null` を渡すケースは **`nullableString` の 3 種別すべて**を測る。
	//
	// `VALUE_SHAPE`（`src/build/setValue.ts`）は `type` → 値の形の対応表で、
	// `DROP_DOWN` / `DATE` / `TIME` は同じ `nullableString`。
	// 1 つだけ測って「同じ形だから同じだろう」と決めると、
	// **変換を形ごとに書くのか種別ごとに書くのかが決まらない**。
	//
	// 3 つ揃えれば 1 回の実測で分かる。
	// 揃わなければ種別ごと、揃えば形ごとに書ける。
	{
		id: "dropdown-null",
		question:
			"DROP_DOWN に null を渡す（REST の未入力表現。JS API は '' なので変換が要るか）",
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
			"SINGLE_LINE_TEXT に null を渡す（string 型なので null は想定外。対照として測る）",
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
		question: "$id / $revision をレコードに含めて渡す",
		build: (codes) => {
			const id = codes.byType.__ID__;
			const revision = codes.byType.__REVISION__;
			if (id === undefined && revision === undefined) return undefined;
			const out: Record<string, unknown> = {};
			if (id !== undefined) out[id] = { type: "__ID__", value: CURRENT_VALUE };
			if (revision !== undefined) {
				out[revision] = { type: "__REVISION__", value: CURRENT_VALUE };
			}
			return out;
		},
	},
	{
		id: "calc",
		question: "CALC を渡す（REST は受け入れて無視する。set() は別 API）",
		build: (codes) => {
			const code = codes.byType.CALC;
			if (code === undefined) return undefined;
			return { [code]: { type: "CALC", value: CURRENT_VALUE } };
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
		question: "サブテーブルの行に既存の id を付けて渡す（id が保たれるか）",
		build: (codes) => {
			if (codes.subtable === undefined) return undefined;
			return {
				[codes.subtable.code]: { type: "SUBTABLE", value: CURRENT_VALUE },
			};
		},
	},
	{
		id: "subtable-drop-row-id",
		question:
			"サブテーブルの行から id を外して渡す（行が置き換わるか、id が振り直されるか）",
		build: (codes) => {
			if (codes.subtable === undefined) return undefined;
			return {
				[codes.subtable.code]: {
					type: "SUBTABLE",
					value: STRIP_ROW_IDS,
				},
			};
		},
	},

	// -------------------------------------------------------------------
	// ルックアップ。JS API 側だけが持つ余分なキー
	// -------------------------------------------------------------------
	{
		id: "lookup-extra-keys",
		question:
			"ルックアップのキーに confirmed / recordId を付けたまま渡す（JS API 由来をそのまま渡した場合）",
		build: (codes) => {
			const code = codes.byType.SINGLE_LINE_TEXT;
			if (code === undefined) return undefined;
			return {
				[code]: {
					type: "SINGLE_LINE_TEXT",
					value: CURRENT_VALUE,
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
