/**
 * テストレコード。
 *
 * Q3 で「未入力 / 入力済みの両方を測る」と決めたので、
 * 空のレコードと全項目埋めたレコードの2件を必ず作る。
 * 手入力に委ねると再実行のたびに条件がブレて、
 * 「DROP_DOWN の未入力は null か空文字か」という問いに答えられなくなる。
 */

export const lookupAppRecords = [
	{
		key: { value: "K-001" },
		name: { value: "ルックアップ元1" },
		amount: { value: "1000" },
	},
	{
		key: { value: "K-002" },
		name: { value: "ルックアップ元2" },
		amount: { value: "2000" },
	},
];

/** 未入力レコード。必須フィールドだけ最小限埋める */
export const emptyRecord = (): Record<string, { value: unknown }> => ({
	singleLineTextRequired: { value: "必須-未入力ケース" },
});

/**
 * 全項目入力済みレコード。
 *
 * fileKey は実行時にアップロードして差し込むため引数で受ける。
 * kintone の fileKey は 1 回しか使えないため、添付を置く箇所の数だけ必要。
 * ここでは本体の file と サブテーブル1行目の t_file で 2 つ使う。
 * lookupKey に値を入れると kintone 側が lookupCopy* を自動で埋める
 * （＝コピー先を明示的に渡さないのが正しい呼び出し方であることの確認も兼ねる）。
 */
export const FILE_SLOT_COUNT = 2;

/**
 * 重複禁止（`unique: true`）フィールドの値。
 *
 * **既定値を置かない。** 以前は `filledRecord` が `"unique-001"` を
 * 決め打ちし、2 件目を作る呼び出し側が上書きする**約束**になっていた。
 * 約束は守られないことがある（2026-09-08 に
 * `[400] [CB_VA01] 入力内容が正しくありません。` で踏んだ）。
 * 引数にすれば、渡し忘れた呼び出しを tsc が落とす。
 *
 * **呼び出しごとに変える値を既定にもしない。** 入力した値は実測データに
 * そのまま残る（正規化は `type` で判定するので `SINGLE_LINE_TEXT` は伏せない）。
 * 検証アプリのテストレコードが毎回違う値になると、週次のライブ検証で
 * 本物の変化が差分に埋もれる。**固定にするか変えるかは用途で違う**ので、
 * 呼び出し側が決める。
 */
export type UniqueValues = {
	singleLineTextUnique: string;
};

export const filledRecord = (
	fileKeys: string[],
	loginCode: string,
	unique: UniqueValues,
): Record<string, { value: unknown }> => ({
	singleLineText: { value: "文字列1行の値" },
	singleLineTextRequired: { value: "必須-入力済みケース" },
	singleLineTextUnique: { value: unique.singleLineTextUnique },
	multiLineText: { value: "複数行\nの値" },
	richText: { value: "<div>リッチ<b>テキスト</b></div>" },
	number: { value: "1234.5" },
	checkBox: { value: ["sample1", "sample3"] },
	radioButton: { value: "two" },
	dropDown: { value: "beta" },
	dropDownWithDefault: { value: "beta" },
	multiSelect: { value: ["red", "blue"] },
	date: { value: "2026-08-30" },
	time: { value: "12:34" },
	dateTime: { value: "2026-08-30T03:34:00Z" },
	link: { value: "https://example.com" },
	linkMail: { value: "someone@example.com" },
	file: { value: [{ fileKey: fileKeys[0] }] },
	userSelect: { value: [{ code: loginCode }] },
	lookupKey: { value: "K-001" },
	subtable: {
		value: [
			{
				value: {
					t_singleLineText: { value: "行1" },
					t_number: { value: "10" },
					t_checkBox: { value: ["a"] },
					t_radioButton: { value: "y" },
					t_dropDown: { value: "p" },
					t_multiSelect: { value: ["m"] },
					t_date: { value: "2026-01-01" },
					t_time: { value: "01:00" },
					t_dateTime: { value: "2026-01-01T00:00:00Z" },
					t_link: { value: "https://example.com/1" },
					t_multiLineText: { value: "行1\n複数行" },
					t_richText: { value: "<div>行1</div>" },
					t_file: { value: [{ fileKey: fileKeys[1] }] },
					t_userSelect: { value: [{ code: loginCode }] },
				},
			},
			{
				value: {
					t_singleLineText: { value: "行2" },
					t_number: { value: "20" },
				},
			},
			{
				// 3行目は全て未入力。テーブル行の「未入力」も測る
				value: {},
			},
		],
	},
});
