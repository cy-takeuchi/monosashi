import {
	runPackCheck,
	type Scenario,
	shippedConsumer,
} from "@jissoku/rig/packCheck";
import { runScript } from "@jissoku/rig/run";

/**
 * 出荷物を利用者の立場で検査する。**シナリオだけを持つ。**
 *
 * 手順（pack → 空プロジェクトへ install → 依存の実体を確かめる →
 * 2 モード × 2 バージョンで型検査 → 実行時に読み込む）は
 * `@jissoku/rig/packCheck` にある。
 *
 * ## 何を確かめるのか
 *
 * | | |
 * |---|---|
 * | **実行時依存がゼロ** | tarball を空のプロジェクトに入れて、`node_modules` に `kisekae` 以外が現れないこと |
 * | `.d.ts` が両モードで解決できる | `bundler` と `nodenext` の 2 モード |
 * | `.d.ts` が両バージョンで通る | TypeScript 7 と 5.9 |
 * | **`.d.ts` 自体が壊れていない** | `skipLibCheck: false` で `dist/*.d.ts` を直接検査 |
 *
 * 1 つめが kisekae の設計の要。型を自前で持つと決めた目的は
 * 「`@kintone/rest-api-client` の 7MB を利用者に背負わせない」ことなので、
 * **`peerDependencies` に忍び込んでも落ちる**形で縛る
 * （`docs/DECISIONS.md`「4. 型の出どころ」）。
 *
 * 4 つめを外すと**型が黙って any に落ちる**のを見逃す。
 * 利用者は既定の `skipLibCheck: true` で使うので、こちらの `.d.ts` が
 * 壊れていてもエラーにならない。他のシナリオは「通ること」しか見ていないので
 * any でも緑になる（monosashi の DECISIONS
 * 「『通ること』しか見ない検査は any を捕まえられない」）。
 *
 * ## 利用者のコードは 1 本
 *
 * 以前はここに `CONSUMER` と `NARROWING` という文字列を持っていたが、
 * **中身は `test/dist/consumer.ts` の部分集合だった。**
 * 文字列は biome も tsc も見ないので、壊れていても気づけない。
 * ファイルを 1 本にして、import 先だけをパッケージ名に差し替える。
 *
 * ルックアップの分割（`Field.OneOf` が判別ユニオンのままであること）は
 * kisekae の設計の中心で、そのファイルが**出荷物に対して**縛っている。
 */

/** 利用者のコード。`@kintone/rest-api-client` を**入れていない**利用者を想定する */
const CONSUMER = shippedConsumer("kisekae");

/**
 * 実行時依存がゼロであることを、型の側からも確かめる。
 *
 * `@kintone/rest-api-client` を入れていない環境で `dist/*.d.ts` を
 * `skipLibCheck: false` で直接検査する。`.d.ts` があちらを参照していたら
 * ここで **TS2307（モジュールが見つからない）** が出る。
 */
const DIST_PROBE = `
export {};
`;

const SCENARIOS: readonly Scenario[] = [
	{
		name: "@kintone/rest-api-client を入れていない利用者",
		files: { "consumer.ts": CONSUMER },
		entries: ["consumer.ts"],
		expected: [],
		note: "これが通ることが、型を自前で持つことにした目的（7MB を背負わせない）の証拠。ルックアップの分割が出荷物でも効いていることもここで見る（絞れなくなると field.unit でエラーが出る）",
	},
	{
		name: "ブラウザの型が無い環境（Node / AWS Lambda 相当）",
		files: { "consumer.ts": CONSUMER },
		entries: ["consumer.ts"],
		expected: [],
		lib: ["ES2022"],
		note: "kisekae は DOM を参照しない。`lib` から DOM を外しても通ること",
	},
	{
		name: "dist/*.d.ts 自体を検査する（skipLibCheck: false）",
		files: { "probe.ts": DIST_PROBE },
		entries: ["probe.ts", "node_modules/kisekae/dist/index.d.ts"],
		expected: [],
		skipLibCheck: false,
		lib: ["ES2022"],
		note: "利用者は既定の skipLibCheck: true で使うので、こちらの .d.ts が壊れていてもエラーにならず型が黙って any に落ちる。ここだけは直接検査してその穴を塞ぐ",
	},
];

runScript(() => {
	runPackCheck({ packageName: "kisekae", scenarios: SCENARIOS });
});
