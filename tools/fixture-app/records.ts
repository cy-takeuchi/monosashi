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

export const filledRecord = (
	fileKeys: string[],
	loginCode: string,
): Record<string, { value: unknown }> => ({
	singleLineText: { value: "文字列1行の値" },
	singleLineTextRequired: { value: "必須-入力済みケース" },
	singleLineTextUnique: { value: "unique-001" },
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
