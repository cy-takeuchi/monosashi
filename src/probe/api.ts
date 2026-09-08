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
 * **ただしそれは `tsconfig.json` の `include` に `e2e` が入っている前提。**
 * これを足すまで `e2e/` は型を誰にも見られておらず、
 * この JSDoc の主張は e2e 側については嘘だった
 * （`main.ts` の `satisfies` 側だけが効いていた）。
 * 漏れは `test/tsconfig.test.ts` が縛っている。
 *
 * ## 戻り値は JSON 直列化できるものだけ
 *
 * `page.evaluate` の戻り値は JSON を通るので、関数やクラスは落ちて空になる。
 * 呼び出しはブラウザ側で完結させ、**値だけ**を受け取る。
 */
/**
 * probe を注入済みの `window`。**パネルが立った後**の `page.evaluate` で使う。
 *
 * `page.evaluate` のコールバックはブラウザで動くので、e2e 側の
 * 変数やヘルパを閉じ込められない。`window` から取り出すしかなく、
 * その取り出しが 21 箇所に同じ形で書かれていた。ここで名前を付ける。
 */
export type ProbeWindow = { __kintoneRecordProbe: ProbeApi };

/**
 * probe がまだ無いかもしれない `window`。
 *
 * `waitForPanel` のように**パネルが立つのを待つ側**はこちらを使う。
 * カスタマイズの読み込み前は本当に `undefined` なので、
 * 上の型で書くと待てているように見えて待てていない。
 *
 * **2 つある理由を型の名前で残す。** 以前は同じキャストが
 * 非任意 18 箇所・任意 3 箇所という内訳で散っていて、
 * どちらを使うかが偶然に見えた。
 */
export type MaybeProbeWindow = { __kintoneRecordProbe?: ProbeApi };

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
