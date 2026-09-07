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

export type ProbeStore = {
	version: 1;
	samples: Sample[];
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
	const store = load();
	store.samples.push(sample);
	save(store);
};

export const clear = (): void => {
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
