import type { Probed } from "../src/probe/serialize";

/**
 * Probed から「型の形」を表す文字列を作る。テストヘルパ。
 *
 * 旧 `tools/analyze/shape.ts`。手採取時代の分析スクリプトの一部だったが、
 * 分析側は e2e 採取に置き換わって消えた。残ったのはこれだけ。
 *
 * 値そのものではなく形に潰すことで、多数のサンプルを突き合わせられるようにする。
 * ただし "" と null と undefined と [] は潰さない。
 * その4つの区別こそが今回の測定目的だから。
 */
export const shapeOf = (
	probed: Probed,
	maxDepth = Number.POSITIVE_INFINITY,
	depth = 0,
): string => {
	if (depth > maxDepth) return "…";

	switch (probed.k) {
		case "undefined":
			return "undefined";
		case "null":
			return "null";
		case "string":
			return probed.v === "" ? '""' : "string";
		case "number":
			return "number";
		case "boolean":
			return "boolean";
		case "bigint":
			return "bigint";
		case "symbol":
			return "symbol";
		case "function":
			return "function";
		case "circular":
			return "circular";
		case "maxDepth":
			return "…";
		case "array": {
			if (probed.items.length === 0) return "[]";
			const inner = [
				...new Set(
					probed.items.map((item) => shapeOf(item, maxDepth, depth + 1)),
				),
			].sort();
			return `${inner.join(" | ")}[]`;
		}
		case "object": {
			const entries = probed.keys
				.map((key) => {
					const child = probed.props[key];
					return `${key}: ${child === undefined ? "?" : shapeOf(child, maxDepth, depth + 1)}`;
				})
				.sort();
			return `{ ${entries.join("; ")} }`;
		}
	}
};
