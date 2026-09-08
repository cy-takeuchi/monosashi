/**
 * probe がブラウザの `window` に出す API の型。**probe と e2e の唯一の出どころ**。
 *
 * e2e 側で同じ形を手で書くと、probe を直したときに黙ってずれる。
 * `testIds.ts` が `ACTION`（ボタンの識別子）に対してやっているのと同じことを、
 * API の形に対してやる。
 *
 * > Playwright 側でリテラルを書くと、probe を直したときに黙ってずれる。
 * > このプロジェクトで何度も塞いできた形なので、最初から 1 箇所にする。
 * > （`testIds.ts`）
 *
 * **同じ理屈が型には適用されていなかった。**
 * `setCaseIds` / `runSetCase` / `markSetCase` / `suppressSamples` を足したとき、
 * 両側に手で書いた。一致していたのは気をつけたからで、仕組みではなかった。
 *
 * `main.ts` が `satisfies ProbeApi` で代入し、e2e はこの型を import する。
 * 片方だけ直すと `tsc` が落ちる。
 *
 * ## 戻り値は JSON 直列化できるものだけ
 *
 * `page.evaluate` の戻り値は JSON を通るので、関数やクラスは落ちて空になる。
 * 呼び出しはブラウザ側で完結させ、**値だけ**を受け取る。
 */
export type ProbeApi = {
	/** 採取済みデータを JSON 文字列で出す */
	export: () => string;
	/** 採取済みデータを消す。自動採取の停止も解除する */
	clear: () => void;
	count: () => number;
	coverage: () => { key: string; n: number }[];
	/**
	 * change ハンドラの登録が済んだか。
	 *
	 * 登録は `getFieldCodes` を待つので非同期。
	 * これを待たずに `set()` 系を実行すると、発火していても件数が 0 になる。
	 */
	ready: () => boolean;
	/** 直近の操作の失敗メッセージ。成功していれば null */
	lastError: () => string | null;
	/** 判定された画面。ボタンの出し分けがこれに依存している */
	screen: () => string;
	/** 実際に登録した change イベント名 */
	changeEvents: () => string[];
	beginWatch: () => void;
	watched: () => string[];
	endWatch: (label: string) => void;
	rowCount: () => number;
	/** 次の submit で error を返して保存を止める */
	blockNextSubmit: (message: string) => void;

	// --- set() の受け入れ挙動（#14）------------------------------------------
	// パネルのボタンにしない。1 ケースごとに画面を読み直す必要があり、
	// それは probe 側からはできない
	setCaseIds: () => string[];
	/** 1 ケースだけ渡す。走らせたら true、対象が無くて飛ばしたら false */
	runSetCase: (id: string) => boolean;
	/** kintone がエラーを表示したかを書き戻す。判定は e2e が行う */
	markSetCase: (id: string, errorShown: boolean) => void;
	/** 測定中だけ自動採取（show イベントのサンプル）を止める */
	suppressSamples: (on: boolean) => void;
};
