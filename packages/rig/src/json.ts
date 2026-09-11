import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * JSON を書く。**タブ整形 + 末尾改行**で揃える。
 *
 * この形は好みではなく理由がある。
 *
 * - **タブ整形** ... 1 行の巨大な JSON だと `git diff` が
 *   「1 行変わった」としか言わない。週次のライブ検証は差分を読んで
 *   「kintone が変わったか」を判断するので、行単位で読めないと機能しない
 * - **末尾改行** ... 無いと最終行に差分が出続ける
 *
 * 同じ式が 5 箇所に写されていた（採取 2 本・正規化 2 本・pack:check）。
 * 1 箇所でも整形を外すと、そのファイルの差分だけが読めなくなる。
 */
export const writeJson = (path: string, value: unknown): void => {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(value, null, "\t")}\n`);
};
