import type { Probed } from "../../src/probe/serialize";
import type { ProbeStore, Sample } from "../../src/probe/store";

/**
 * 採取結果から、実行ごと・環境ごとに変わる値を伏せる。
 *
 * ## なぜ必要か
 *
 * 定期ライブ検証は「前回と同じ結果か」を diff で見る。
 * 採取フローを固定してあるので大半は決定的だが、
 * レコード id や時刻のように必ず変わるものが残る。
 * それを伏せないと毎回差分が出て、やがて誰も見なくなる。
 *
 * 加えて、他の人が自分の kintone で走らせても同じファイルが出るようにする。
 * appId やユーザーの識別子が残っていると環境ごとに差分が出て、
 * フィクスチャが「この環境でだけ正しいもの」になってしまう。
 *
 * ## 値そのものは伏せない
 *
 * `"2026-08-29"` を `<str>` のように一律で潰すことはしない。
 * kintone の更新で日時フォーマットが変わるような**値の変化こそ検出したい**。
 * 伏せるのは「変わって当然」と分かっているものだけを列挙する。
 *
 * ## 伏せ方
 *
 * `{k:"string", v:"6"}` → `{k:"string", v:"<id>"}` のように **`v` だけ**を置換する。
 * `k`（種別）とキーの存在は測定の目的そのものなので壊さない。
 * 空文字は空文字のまま残す。`""` と非空の区別は DROP_DOWN の型を決めた根拠であり、
 * 潰すと `"" | string` が `string` になって型が変わる。
 *
 * ## フィールドコードではなく type で判定する
 *
 * 「レコード番号」「作成日時」といったフィールドコードは環境の言語で変わる。
 * `type`（`RECORD_NUMBER` / `CREATED_TIME`）は変わらない。
 */

const PLACEHOLDER = {
	id: "<id>",
	recordNumber: "<record-number>",
	dateTime: "<datetime>",
	entityCode: "<entity-code>",
	entityName: "<entity-name>",
	fileKey: "<file-key>",
	rowId: "<row-id>",
	at: "<at>",
	viewId: -1,
	viewName: "<view-name>",
	appId: -1,
	/**
	 * 文字列で来る appId 用。
	 *
	 * `app.record.index.edit.submit` だけ appId が**文字列**で来る
	 * （2026-09-05 実測。他のイベントは number）。数値だけを伏せていると
	 * ここが実際のアプリ ID のまま残り、環境ごとに差分が出る。
	 * 型の違いは根拠なので、伏せても string / number の区別は保つ。
	 */
	appIdText: "<app-id>",
	number: -1,
} as const;

/** 空文字は残す。`""` と非空の区別は型の根拠になっている */
const maskString = (
	node: Probed | undefined,
	to: string,
): Probed | undefined => {
	if (node === undefined) return undefined;
	if (node.k !== "string") return node;
	if (node.v === "") return node;
	return { k: "string", v: to };
};

const maskNumber = (
	node: Probed | undefined,
	to: number,
): Probed | undefined => {
	if (node === undefined) return undefined;
	if (node.k !== "number") return node;
	return { k: "number", v: to };
};

const withProps = (
	node: Extract<Probed, { k: "object" }>,
	changes: { [key: string]: Probed | undefined },
): Probed => {
	const props: { [key: string]: Probed } = { ...node.props };
	for (const [key, value] of Object.entries(changes)) {
		if (value !== undefined) props[key] = value;
	}
	return { ...node, props };
};

/** ユーザー / 組織 / グループ。code と name が個人を特定しうる */
const maskEntity = (node: Probed): Probed => {
	if (node.k === "array") {
		return { ...node, items: node.items.map(maskEntity) };
	}
	if (node.k !== "object") return node;
	return withProps(node, {
		code: maskString(node.props.code, PLACEHOLDER.entityCode),
		name: maskString(node.props.name, PLACEHOLDER.entityName),
	});
};

/** 添付ファイル。fileKey は時刻を含むランダムトークンで毎回変わる */
const maskFiles = (node: Probed): Probed => {
	if (node.k !== "array") return node;
	return {
		...node,
		items: node.items.map((item) =>
			item.k === "object"
				? withProps(item, {
						fileKey: maskString(item.props.fileKey, PLACEHOLDER.fileKey),
					})
				: item,
		),
	};
};

/** フィールド 1 つ。type に応じて value を伏せる */
const maskField = (
	field: Extract<Probed, { k: "object" }>,
	type: string,
): Probed => {
	const value = field.props.value;
	if (value === undefined) return field;

	switch (type) {
		case "__ID__":
			return withProps(field, { value: maskString(value, PLACEHOLDER.id) });
		case "RECORD_NUMBER":
			return withProps(field, {
				value: maskString(value, PLACEHOLDER.recordNumber),
			});
		case "CREATED_TIME":
		case "UPDATED_TIME":
			return withProps(field, {
				value: maskString(value, PLACEHOLDER.dateTime),
			});
		case "CREATOR":
		case "MODIFIER":
		case "USER_SELECT":
		case "ORGANIZATION_SELECT":
		case "GROUP_SELECT":
		case "STATUS_ASSIGNEE":
			return withProps(field, { value: maskEntity(value) });
		case "FILE":
			return withProps(field, { value: maskFiles(value) });
		case "SUBTABLE":
			return withProps(field, { value: maskRows(value) });
		default:
			// __REVISION__ は伏せない。毎回まっさらなレコードから始まるので
			// 必ず 1 → 2 になり、ずれたら本物の信号になる
			return field;
	}
};

/** サブテーブルの行。id は毎回新しく振られる */
const maskRows = (node: Probed): Probed => {
	if (node.k !== "array") return node;
	return {
		...node,
		items: node.items.map((row) => {
			if (row.k !== "object") return row;
			const inner = row.props.value;
			return withProps(row, {
				id: maskString(row.props.id, PLACEHOLDER.rowId),
				value: inner === undefined ? undefined : maskProbed(inner),
			});
		}),
	};
};

const fieldTypeOf = (
	node: Extract<Probed, { k: "object" }>,
): string | undefined => {
	const type = node.props.type;
	return type?.k === "string" ? type.v : undefined;
};

/**
 * Probed の木をたどって伏せる。
 *
 * フィールド（type と value を持つ객体）は type で分岐し、
 * それ以外のキーは名前で分岐する（envelope の viewId など）。
 */
export const maskProbed = (node: Probed): Probed => {
	if (node.k === "array") {
		return { ...node, items: node.items.map(maskProbed) };
	}
	if (node.k !== "object") return node;

	const type = fieldTypeOf(node);
	if (type !== undefined && node.props.value !== undefined) {
		return maskField(node, type);
	}

	// サブテーブルの行。`type` を持たないので上の分岐に入らない。
	// SUBTABLE の value 配下は maskRows が拾うが、`changes.row` は
	// フィールドの外に裸で置かれるため、ここで拾わないと行 id が残る。
	// 実際 2 回の採取で id だけが 47 と 49 に食い違った
	if (
		node.keys.includes("id") &&
		node.props.value?.k === "object" &&
		node.props.type === undefined
	) {
		const inner = node.props.value;
		return withProps(node, {
			id: maskString(node.props.id, PLACEHOLDER.rowId),
			value: maskProbed(inner),
		});
	}

	// event の外枠。フィールドではないので名前で判定する
	const props: { [key: string]: Probed } = {};
	for (const key of node.keys) {
		const child = node.props[key];
		if (child === undefined) continue;
		switch (key) {
			case "appId":
				props[key] =
					child.k === "number"
						? (maskNumber(child, PLACEHOLDER.appId) ?? child)
						: (maskString(child, PLACEHOLDER.appIdText) ?? child);
				break;
			case "recordId":
				props[key] =
					child.k === "number"
						? (maskNumber(child, PLACEHOLDER.number) ?? child)
						: (maskString(child, PLACEHOLDER.id) ?? child);
				break;
			case "viewId":
				props[key] = maskNumber(child, PLACEHOLDER.viewId) ?? child;
				break;
			case "viewName":
				// 表示言語で変わる。既定ビュー名は環境の言語設定に依存する
				props[key] = maskString(child, PLACEHOLDER.viewName) ?? child;
				break;
			default:
				props[key] = maskProbed(child);
		}
	}
	return { ...node, props };
};

const maskSample = (sample: Sample): Sample => ({
	...sample,
	// 採取時刻。probe が付けたメタ情報で kintone とは無関係
	at: PLACEHOLDER.at,
	appId: sample.appId === null ? null : PLACEHOLDER.appId,
	recordId: sample.recordId === null ? null : PLACEHOLDER.number,
	data: maskProbed(sample.data),
	...(sample.envelope === undefined
		? {}
		: { envelope: maskProbed(sample.envelope) }),
	...(sample.changes === undefined
		? {}
		: { changes: maskProbed(sample.changes) }),
});

export const normalize = (store: ProbeStore): ProbeStore => ({
	version: store.version,
	samples: store.samples.map(maskSample),
});
