/**
 * 実測用シリアライザ。
 *
 * JSON.stringify を使わない理由:
 *   JSON.stringify({ a: undefined }) === '{}'
 * となり「キーが存在しない」と「キーは存在するが値が undefined」が区別できない。
 * 今回の測定目的は disabled? / error? / $id? / id? が optional かどうかの判定であり、
 * まさにその区別そのものなので、素朴なダンプでは目的が最初の一手で壊れる。
 *
 * ここでは Object.keys() で採ったキー集合を保持したうえで、各値を種別つきで包む。
 * これにより undefined / null / "" / [] / {} がすべて区別可能になる。
 */

export type Probed =
	| { k: "undefined" }
	| { k: "null" }
	| { k: "string"; v: string }
	| { k: "number"; v: number }
	| { k: "boolean"; v: boolean }
	| { k: "bigint"; v: string }
	| { k: "symbol"; v: string }
	| { k: "function"; name: string }
	| { k: "array"; length: number; items: Probed[] }
	| {
			k: "object";
			ctor: string;
			/** Object.keys() の結果。値が undefined のキーもここに残る */
			keys: string[];
			props: { [key: string]: Probed };
	  }
	| { k: "circular"; at: string }
	| { k: "maxDepth" };

const MAX_DEPTH = 12;

const ctorNameOf = (value: object): string => {
	const proto = Object.getPrototypeOf(value);
	if (proto === null) return "null-prototype";
	const ctor = (proto as { constructor?: { name?: string } }).constructor;
	return ctor?.name ?? "unknown";
};

export const probe = (
	value: unknown,
	depth = 0,
	seen: WeakSet<object> = new WeakSet(),
	path = "$",
): Probed => {
	if (value === undefined) return { k: "undefined" };
	if (value === null) return { k: "null" };

	switch (typeof value) {
		case "string":
			return { k: "string", v: value };
		case "number":
			return { k: "number", v: value };
		case "boolean":
			return { k: "boolean", v: value };
		case "bigint":
			return { k: "bigint", v: value.toString() };
		case "symbol":
			return { k: "symbol", v: value.toString() };
		case "function":
			return { k: "function", name: (value as { name?: string }).name ?? "" };
	}

	if (depth >= MAX_DEPTH) return { k: "maxDepth" };

	const obj = value as object;
	if (seen.has(obj)) return { k: "circular", at: path };
	seen.add(obj);

	if (Array.isArray(obj)) {
		return {
			k: "array",
			length: obj.length,
			items: obj.map((item, i) =>
				probe(item, depth + 1, seen, `${path}[${i}]`),
			),
		};
	}

	// Object.keys() は「列挙可能な自身のキー」。値が undefined でもキーは残る。
	const keys = Object.keys(obj);
	const props: { [key: string]: Probed } = {};
	for (const key of keys) {
		props[key] = probe(
			(obj as Record<string, unknown>)[key],
			depth + 1,
			seen,
			`${path}.${key}`,
		);
	}

	return { k: "object", ctor: ctorNameOf(obj), keys, props };
};

/**
 * 構造チェック（Q4 の「1回だけ実行する」分）。
 *
 * event.record が素の data property の集合なのか、getter や非列挙キーを持つのかを見る。
 * immer の createDraft を通しているプラグイン実装の
 * 前提が成立しているかの検証がここの目的。
 */
export type StructureReport = {
	path: string;
	ctor: string;
	prototype: string;
	frozen: boolean;
	sealed: boolean;
	extensible: boolean;
	/** Object.keys() */
	enumerableOwnKeys: string[];
	/** Reflect.ownKeys() のうち文字列キー。enumerableOwnKeys との差が非列挙キー */
	allOwnStringKeys: string[];
	ownSymbolKeys: string[];
	/** get / set を持つキー。空でなければ素の data property ではない */
	accessorKeys: string[];
	nonWritableKeys: string[];
	nonConfigurableKeys: string[];
};

export const inspectStructure = (
	value: unknown,
	path = "$",
	depth = 0,
): StructureReport[] => {
	if (typeof value !== "object" || value === null) return [];
	if (depth > 1) return [];

	const obj = value as object;
	const enumerableOwnKeys = Object.keys(obj);
	const allOwnStringKeys = Reflect.ownKeys(obj).filter(
		(key): key is string => typeof key === "string",
	);
	const ownSymbolKeys = Reflect.ownKeys(obj)
		.filter((key): key is symbol => typeof key === "symbol")
		.map((key) => key.toString());

	const accessorKeys: string[] = [];
	const nonWritableKeys: string[] = [];
	const nonConfigurableKeys: string[] = [];
	for (const key of allOwnStringKeys) {
		const desc = Object.getOwnPropertyDescriptor(obj, key);
		if (desc === undefined) continue;
		if (desc.get !== undefined || desc.set !== undefined)
			accessorKeys.push(key);
		if (desc.writable === false) nonWritableKeys.push(key);
		if (desc.configurable === false) nonConfigurableKeys.push(key);
	}

	const proto = Object.getPrototypeOf(obj);

	const self: StructureReport = {
		path,
		ctor: ctorNameOf(obj),
		prototype: proto === null ? "null" : ctorNameOf(proto as object),
		frozen: Object.isFrozen(obj),
		sealed: Object.isSealed(obj),
		extensible: Object.isExtensible(obj),
		enumerableOwnKeys,
		allOwnStringKeys,
		ownSymbolKeys,
		accessorKeys,
		nonWritableKeys,
		nonConfigurableKeys,
	};

	// レコード本体とその直下のフィールドまで（depth 0 と 1）。
	// それ以上の深さは出力が膨れるだけで、getter の有無という問いには答えない。
	const children = enumerableOwnKeys.flatMap((key) => {
		const child = (obj as Record<string, unknown>)[key];
		if (typeof child !== "object" || child === null) return [];
		if (Array.isArray(child)) return [];
		return inspectStructure(child, `${path}.${key}`, depth + 1);
	});

	return [self, ...children];
};
