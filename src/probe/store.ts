import type { Probed, StructureReport } from "./serialize.js";

/**
 * 採取結果の蓄積。
 *
 * 作成 / 詳細 / 編集 は別ページロードなので、1回の実行では全文脈を採れない。
 * 画面をまたいで localStorage に貯め、最後にまとめて1ファイルへ書き出す。
 */

const STORAGE_KEY = "kintone-record-probe/v1";

/** どの取得手段で採ったか */
export type Source =
	| "event.record"
	| "event.records"
	| "kintone.app.record.get"
	| "rest.getRecord"
	| "rest.getRecords";

export type Sample = {
	/** イベント名。ボタン起動の場合は起動時点の画面を表す擬似名 */
	event: string;
	source: Source;
	/** 採取時点のレコードの状態。テストレコードの識別に使う */
	label: string;
	appId: number | null;
	recordId: number | null;
	isMobile: boolean;
	/** ISO8601。ブラウザのローカル時刻 */
	at: string;
	data: Probed;
	/** event オブジェクト全体（record を含む）。event 由来のときのみ */
	envelope?: Probed;
	/**
	 * change イベントの changes。
	 * envelope とは別に辿る。changes.field は record 内のフィールドと
	 * 同一オブジェクトへの参照で、まとめて辿ると循環参照として畳まれるため。
	 */
	changes?: Probed;
	structure?: StructureReport[];
	/**
	 * set() で値を変えたとき change イベントが発火するかの測定。
	 *
	 * 発火するなら e2e は probe のボタンを押すだけで済み、kintone の DOM に触らずに済む。
	 * 発火しないなら Playwright がフィールドへ実際に入力するしかない。
	 * e2e の実装量と壊れやすさがこの1点で決まるので、推測せず測る。
	 */
	setValueProbe?: {
		targetCode: string;
		newValue: string;
		/** set() 呼び出し前までに観測した change イベント数 */
		countBefore: number;
		/** set() 直後（同期）*/
		countAfterSync: number;
		/** 1 タスク譲ったあと（非同期で飛ぶ場合に備える）*/
		countAfterTick: number;
		/**
		 * この操作の間に実際に発火したイベント名。
		 *
		 * 件数だけでは「何が飛んだか」が分からず、
		 * 前後のサンプルの時系列から推測することになる。
		 * 推測を根拠にしないため、名前をそのまま記録する。
		 */
		firedEvents: string[];
		/**
		 * この時点で登録されていた change イベント名の総数。
		 *
		 * 「飛ばなかった」は「聞いていた」ことを示せて初めて意味を持つ。
		 */
		watchedCount: number;
	};
};

/**
 * `kintone.app.record.set()` に 1 ケース渡した結果（#14）。
 *
 * ## 失敗は probe 側では検出できない
 *
 * **`set()` に不正な値を渡しても例外は飛ばない。**
 * kintone が「カスタマイズ用の JavaScript の実行時にエラーが発生しました」を
 * 画面に出すだけで、呼び出し元には何も返らない（`e2e/panel.ts` に既に記録がある）。
 *
 * 最初は try/catch で捕まえる設計にしていたが、**それでは何も測れない**。
 * 実際に走らせて分かった（2026-09-08）。
 *
 * だから判定は e2e 側が行う。probe は「渡したもの」と「前後の値」だけを残し、
 * kintone がエラーを表示したかは Playwright が見て `errorShown` に書き戻す。
 *
 * ## 1 ケースずつ、間にリロードを挟む
 *
 * **一度エラー表示が出ると後続の `set()` も失敗する。**
 * 21 ケースを 1 回のクリックで回す設計だと、最初の失敗が残り全部を汚染して
 * 「どのケースが原因か」が分からなくなる。実際そうなった。
 *
 * e2e が 1 ケースごとに編集画面を読み直してから走らせる。
 */
export type SetCaseResult = {
	id: string;
	question: string;
	/** この画面に対象が無くて飛ばした場合。理由も残す */
	skipped?: string;
	/** set() に実際に渡したもの。差し込み後の値 */
	sent?: Probed;
	/** set() の前後で get() から読んだ、監視対象フィールドの値 */
	before?: Probed;
	after?: Probed;
	/**
	 * kintone がカスタマイズのエラーを表示したか。**e2e が書き戻す。**
	 *
	 * `undefined` は「まだ判定していない」。
	 * 手でボタンを押して走らせたときはこれが埋まらないので、
	 * 結論を出す前に `fixture:set-behavior` が弾く。
	 */
	errorShown?: boolean;
	/**
	 * サブテーブルの行 id が前後で保たれたか。
	 *
	 * **行 id は正規化で `<row-id>` に伏せられる**ので、
	 * `before` / `after` を並べても比較できない。
	 * 真偽値は環境に依らないので、probe 側で比べて残す。
	 *
	 * 監視対象にサブテーブルが無ければ `undefined`。
	 */
	rowIdsPreserved?: boolean;
	/**
	 * 前後の値を観測できるか。
	 *
	 * **`kintone.app.record.get()` は編集画面で FILE を空配列で返す**
	 * （実測 2026-09-08）。この経路で観測できないフィールドは
	 * 「変わらなかった」と「見えていない」の区別がつかないので、
	 * 結論を「無視された」にしてはいけない。
	 */
	observable?: boolean;
	/** 採取時刻。正規化で伏せられる */
	at: string;
	isMobile: boolean;
	/** どの画面で測ったか。set() は作成 / 編集画面でしか動かない */
	screen: string;
};

export type ProbeStore = {
	version: 1;
	samples: Sample[];
	/**
	 * set() の受け入れ挙動（#14）。
	 *
	 * `samples` と別の配列にする。あちらは「レコードがどんな形で来るか」、
	 * こちらは「何を渡すと弾かれるか」で、突き合わせる相手が違う。
	 * 混ぜると `test/coverage.test.ts` の「全サンプルを走査」が
	 * 意味の違うものまで拾ってしまう。
	 */
	setBehavior?: SetCaseResult[];
};

const emptyStore = (): ProbeStore => ({ version: 1, samples: [] });

export const load = (): ProbeStore => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return emptyStore();
		const parsed = JSON.parse(raw) as ProbeStore;
		if (parsed.version !== 1 || !Array.isArray(parsed.samples)) {
			return emptyStore();
		}
		return parsed;
	} catch {
		return emptyStore();
	}
};

const save = (store: ProbeStore): void => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

/**
 * 1件追加する。
 *
 * ここで JSON.stringify を使うのは「Probed に包んだ後」なので情報は落ちない。
 * 包む前の生レコードに対して stringify しないことが要点（serialize.ts の冒頭を参照）。
 */
export const add = (sample: Sample): void => {
	// **set() の測定中は自動採取を止める。**
	// 測定は 1 ケースごとに編集画面をリロードするので、
	// そのたびに show イベントが飛んで同じ文脈のサンプルが積み上がる。
	// 情報は増えないのに measured.json が膨らみ、週次の差分が読めなくなる。
	//
	// localStorage に置くのは、リロードを跨いで効かせる必要があるため。
	// show イベントはページ読み込み中に飛ぶので、
	// e2e が毎回フラグを立て直す形にはできない
	if (isSuppressed()) return;
	const store = load();
	store.samples.push(sample);
	save(store);
};

const SUPPRESS_KEY = `${STORAGE_KEY}/suppress`;

const isSuppressed = (): boolean => {
	try {
		return localStorage.getItem(SUPPRESS_KEY) === "1";
	} catch {
		return false;
	}
};

/**
 * 自動採取の停止を切り替える（e2e から呼ぶ）。
 *
 * 止めるのは `add`（サンプル）だけ。
 * `addSetCase` は測定そのものなので止めない。
 */
export const suppressSamples = (on: boolean): void => {
	if (on) localStorage.setItem(SUPPRESS_KEY, "1");
	else localStorage.removeItem(SUPPRESS_KEY);
};

/**
 * set() のケース結果を 1 件追加する。
 *
 * 同じ id が既にあれば置き換える。1 ケースずつリロードして走らせるので、
 * やり直したときに古い結果が残らないようにする。
 */
export const addSetCase = (result: SetCaseResult): void => {
	const store = load();
	const rest = (store.setBehavior ?? []).filter(({ id }) => id !== result.id);
	store.setBehavior = [...rest, result];
	save(store);
};

/**
 * kintone がエラーを表示したかを書き戻す（e2e から呼ぶ）。
 *
 * probe 側では `set()` の失敗を検出できないので、これが唯一の判定材料。
 * 対象が見つからなければ何もしない（飛ばしたケースには結果が無い）。
 */
export const markSetCase = (id: string, errorShown: boolean): void => {
	const store = load();
	const results = store.setBehavior ?? [];
	const at = results.findIndex((result) => result.id === id);
	if (at === -1) return;
	const target = results[at];
	if (target === undefined) return;
	results[at] = { ...target, errorShown };
	store.setBehavior = results;
	save(store);
};

export const clear = (): void => {
	suppressSamples(false);
	localStorage.removeItem(STORAGE_KEY);
};

export const count = (): number => load().samples.length;

/** 採取済みの (event, source) の組を数える。UI の進捗表示用 */
export const coverage = (): { key: string; n: number }[] => {
	const map = new Map<string, number>();
	for (const sample of load().samples) {
		const key = `${sample.event} / ${sample.source}`;
		map.set(key, (map.get(key) ?? 0) + 1);
	}
	return [...map.entries()]
		.map(([key, n]) => ({ key, n }))
		.sort((a, b) => a.key.localeCompare(b.key));
};

export const exportToFile = (): void => {
	const store = load();
	const blob = new Blob([JSON.stringify(store, null, "\t")], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = `kintone-record-probe-${store.samples.length}.json`;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
};

/** Playwright から取り出すための口。window 経由で読む */
export const exportToString = (): string => JSON.stringify(load());
