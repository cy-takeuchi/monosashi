/**
 * REST の updateRecord に「何を渡すと弾かれるか」を測るケース定義。
 *
 * 変換関数 (forRestWrite) が何を落とすべきかは、この結果が根拠になる。
 * 推測で「CALC は落とすべき」と決めるのではなく、実際に投げて確かめる。
 */

export type Case = {
	id: string;
	/** 何を確かめたいか */
	question: string;
	/**
	 * 送信するレコード。
	 * 組み込みフィールドのコードは環境の言語で変わるため、解決済みのものを受け取る。
	 */
	build: (codes: BuiltInCodes, state: RecordState) => Record<string, unknown>;
	/** 送信後に確認したいこと（任意） */
	inspect?: (after: Record<string, any>) => string;
};

export type BuiltInCodes = {
	recordNumber: string;
	creator: string;
	createdTime: string;
	modifier: string;
	updatedTime: string;
	status: string;
	statusAssignee: string;
	category: string;
};

export type RecordState = {
	/** 既存のサブテーブル行 id */
	subtableRowIds: string[];
	/** 事前にアップロードした有効な fileKey */
	fileKey: string;
};

export const cases: Case[] = [
	{
		id: "lookup-key-only",
		question: "ルックアップのキーだけを渡す（正しい使い方のはず）",
		build: () => ({ lookupKey: { value: "K-002" } }),
		inspect: (after) =>
			`lookupCopyName=${JSON.stringify(after.lookupCopyName?.value)} lookupCopyAmount=${JSON.stringify(after.lookupCopyAmount?.value)}`,
	},
	{
		id: "lookup-key-and-copy",
		question: "キーとコピー先を両方渡す（変換で落とすべきか判定する本命）",
		build: () => ({
			lookupKey: { value: "K-001" },
			lookupCopyName: { value: "手で入れた値" },
		}),
		inspect: (after) =>
			`lookupCopyName=${JSON.stringify(after.lookupCopyName?.value)}`,
	},
	{
		id: "lookup-copy-only",
		question: "コピー先だけを渡す（キーなし）",
		build: () => ({ lookupCopyName: { value: "手で入れた値" } }),
		inspect: (after) =>
			`lookupCopyName=${JSON.stringify(after.lookupCopyName?.value)}`,
	},
	{
		id: "lookup-with-js-extra-keys",
		question:
			"JS API 由来の confirmed / recordId を付けたまま渡す（変換せず投げた場合）",
		build: () => ({
			lookupKey: {
				type: "SINGLE_LINE_TEXT",
				value: "K-001",
				confirmed: true,
				recordId: "1",
			},
		}),
	},
	{
		id: "disabled-error",
		question: "disabled / error を付けたまま渡す（UI 専用プロパティ）",
		build: () => ({
			singleLineText: {
				type: "SINGLE_LINE_TEXT",
				value: "disabled/error 付き",
				disabled: true,
				error: null,
			},
		}),
	},
	{
		id: "calc",
		question: "CALC を渡す（計算フィールドは書き込めないはず）",
		build: () => ({ calc: { type: "CALC", value: "999" } }),
	},
	{
		id: "system-record-number",
		question: "レコード番号を渡す",
		build: (codes) => ({
			[codes.recordNumber]: { type: "RECORD_NUMBER", value: "999" },
		}),
	},
	{
		id: "system-created-time",
		question: "作成日時を渡す",
		build: (codes) => ({
			[codes.createdTime]: {
				type: "CREATED_TIME",
				value: "2020-01-01T00:00:00Z",
			},
		}),
	},
	{
		id: "system-creator",
		question: "作成者を渡す",
		build: (codes) => ({
			[codes.creator]: { type: "CREATOR", value: { code: "x", name: "x" } },
		}),
	},
	{
		id: "system-modifier",
		question: "更新者を渡す",
		build: (codes) => ({
			[codes.modifier]: { type: "MODIFIER", value: { code: "x", name: "x" } },
		}),
	},
	{
		id: "system-updated-time",
		question: "更新日時を渡す",
		build: (codes) => ({
			[codes.updatedTime]: {
				type: "UPDATED_TIME",
				value: "2020-01-01T00:00:00Z",
			},
		}),
	},
	{
		id: "status-assignee",
		question: "作業者を渡す",
		build: (codes) => ({
			[codes.statusAssignee]: { type: "STATUS_ASSIGNEE", value: [] },
		}),
	},
	{
		id: "status",
		question: "ステータスを渡す",
		build: (codes) => ({ [codes.status]: { type: "STATUS", value: "処理中" } }),
	},
	{
		id: "category",
		question: "カテゴリーを渡す",
		build: (codes) => ({ [codes.category]: { type: "CATEGORY", value: [] } }),
	},
	{
		id: "meta-id-revision",
		question: "$id / $revision をレコードの中に含めて渡す",
		build: () => ({
			$id: { type: "__ID__", value: "2" },
			$revision: { type: "__REVISION__", value: "1" },
			singleLineText: { value: "メタ付き" },
		}),
	},
	{
		id: "file-minimal",
		question: "FILE を REST の形（fileKey のみ）で渡す",
		build: (_codes, state) => ({
			file: { type: "FILE", value: [{ fileKey: state.fileKey }] },
		}),
		inspect: (after) =>
			`value=${JSON.stringify((after.file?.value ?? []).map((f: any) => Object.keys(f)))}`,
	},
	{
		id: "file-full-shape",
		question:
			"FILE を JS API の形（contentType / name / size 付き・有効な fileKey）で渡す。縮約が必須か",
		build: (_codes, state) => ({
			file: {
				type: "FILE",
				value: [
					{
						contentType: "text/plain",
						fileKey: state.fileKey,
						name: "probe.txt",
						size: "3",
					},
				],
			},
		}),
		inspect: (after) =>
			`value=${JSON.stringify((after.file?.value ?? []).map((f: any) => f.name))}`,
	},
	{
		id: "subtable-keep-id",
		question: "サブテーブルを既存の id 付きで渡す（行が保たれるか）",
		build: (_codes, state) => ({
			subtable: {
				type: "SUBTABLE",
				value: state.subtableRowIds.map((id) => ({
					id,
					value: { t_singleLineText: { value: `id保持 ${id}` } },
				})),
			},
		}),
		inspect: (after) =>
			`行 id = ${JSON.stringify((after.subtable?.value ?? []).map((r: any) => r.id))}`,
	},
	{
		id: "subtable-drop-id",
		question:
			"サブテーブルを id なしで渡す（落とすと全行が新規行になるという想定の検証）",
		build: () => ({
			subtable: {
				type: "SUBTABLE",
				value: [{ value: { t_singleLineText: { value: "id なし" } } }],
			},
		}),
		inspect: (after) =>
			`行数=${(after.subtable?.value ?? []).length} 行 id = ${JSON.stringify((after.subtable?.value ?? []).map((r: any) => r.id))}`,
	},
	{
		id: "unknown-field",
		question: "存在しないフィールドコードを渡す",
		build: () => ({ フィールドは存在しない: { value: "x" } }),
	},
	{
		id: "group-field",
		question: "GROUP フィールドを渡す（レコードには現れないが書けるか）",
		build: () => ({ group: { type: "GROUP", value: "" } }),
	},
	{
		id: "reference-table",
		question: "関連レコード一覧を渡す（レコードには現れないが書けるか）",
		build: () => ({ referenceTable: { type: "REFERENCE_TABLE", value: [] } }),
	},
];
