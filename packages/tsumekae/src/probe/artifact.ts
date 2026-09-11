/**
 * 採取カスタマイズの成果物の場所。**ここが唯一の出どころ。**
 *
 * CLAUDE.md は「採取コードを二重に持たない。`probe-dist/probe.js` が
 * 唯一の成果物」と書いているが、**そのパスは 3 箇所に書かれていた。**
 *
 * | 場所 | 役割 |
 * |---|---|
 * | `vite.probe.config.ts` | 作る |
 * | `tools/fixture-app/deployProbe.ts` | 貼る |
 * | `tools/fixture-app/checkProbe.ts` | 貼られているものと比べる |
 *
 * 3 つ目は配信物のハッシュを手元のビルドと突き合わせる検査で、
 * **ここがずれると「古い probe で採った結果」を最新として扱う**。
 * それはこのリポジトリで最悪の失敗（kintone が変わったと誤認する）。
 *
 * `testIds.ts` が probe と e2e の識別子に対してやっているのと同じ扱いにする。
 */

/** ビルドの出力先ディレクトリ */
export const PROBE_OUT_DIR = "probe-dist";

/** 成果物のファイル名。kintone にこの名前でアップロードする */
export const PROBE_FILE_NAME = "probe.js";

/** リポジトリのパッケージ直下から見た成果物 */
export const PROBE_PATH = `${PROBE_OUT_DIR}/${PROBE_FILE_NAME}`;
