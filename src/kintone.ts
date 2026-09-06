import type { EventOf, KintoneEventName } from "./types/event";
import type { EditingRecord } from "./types/record";

/**
 * kintone のグローバルオブジェクトの型宣言。
 *
 * `@kintone/dts-gen` の kintone.d.ts を土台に、**レコード周りだけ**を差し替える。
 * それ以外（proxy / plugin / portal / getLoginUser など）は dts-gen 準拠のまま。
 *
 * 差し替えるのは 3 箇所。
 *
 * 1. `kintone.events.on` ... `(event: any) => any` を、
 *    イベント名リテラルから event の形を引く形にする
 * 2. `kintone.app.record.get` ... `any` を Editing のレコードにする
 * 3. `kintone.app.record.set` ... `any` を書き込み用の型にする
 *
 * dts-gen の `fieldTypes` 名前空間は使わない。
 * 全フィールドに `disabled?` / `error?` を持たせているが、
 * 実測ではどちらも読み取りには存在しない（84 サンプルで 0 件）。
 */

declare global {
	namespace kintone {
		namespace events {
			/**
			 * イベントハンドラを登録する。
			 *
			 * イベント名のリテラルから event の形が決まる。
			 * 配列で複数渡した場合、handler の引数はそれらのユニオンになる。
			 *
			 * ```ts
			 * kintone.events.on("app.record.detail.show", (event) => {
			 *   event.record;    // SavedRecord
			 *   event.recordId;  // number
			 *   return event;
			 * });
			 *
			 * kintone.events.on("app.record.edit.submit", (event) => {
			 *   // 保存を止めるときは error を設定して返す
			 *   return { ...event, error: "保存できません" };
			 * });
			 * ```
			 *
			 * マップに無いイベント名も渡せる。
			 * 閉じたマップだけにすると、kintone が新しいイベントを追加したときに
			 * ライブラリの更新を待つまで使えなくなるため。
			 * その場合 event は緩い型になる。
			 */
			function on<Name extends KintoneEventName>(
				event: Name | Name[],
				// 戻り値の void は必要。undefined にすると `(event) => { ... }`
				// （推論結果が void）を渡せなくなる（tsc で確認済み: TS2345）
				handler: (
					event: EventOf<Name>,
					// biome-ignore lint/suspicious/noConfusingVoidType: 何も返さないハンドラを許すために必要
				) => EventOf<Name> | Promise<EventOf<Name>> | void,
			): void;
			function on(
				event: (string & {}) | (string & {})[],
				handler: (event: EventOf<string>) => unknown,
			): void;

			function off<Name extends KintoneEventName>(
				event: Name | Name[],
				handler: (event: EventOf<Name>) => unknown,
			): boolean;
			function off(event: string | string[]): boolean;
			function off(): boolean;
		}

		namespace app {
			namespace record {
				function getId(): number | null;

				/**
				 * 画面が保持しているレコードを取得する。
				 *
				 * **`kintone.events.on` のハンドラ内では動作しない**（null を返す）。
				 * ボタンのクリックなど、イベント処理の外から呼ぶ。
				 *
				 * 返るのは編集中のフォームの状態なので `EditingRecord`。
				 * 値が一度も設定されたことのないフィールドは `value` が undefined になる。
				 * 一覧画面では null を返す。
				 */
				function get(): { record: EditingRecord } | null;

				/**
				 * 画面のレコードを書き換える。
				 *
				 * **`kintone.events.on` のハンドラ内では動作しない**。
				 *
				 * `disabled` と `error` はここでのみ意味を持つ。
				 * 設定しても `get()` では返らない（実測）。
				 */
				function set(record: { record: KintoneSetRecord }): void;

				function getHeaderMenuSpaceElement(): HTMLElement | null;
				function getFieldElement(fieldCode: string): HTMLElement | null;
				function getSpaceElement(id: string): HTMLElement | null;
				function setFieldShown(fieldCode: string, isShown: boolean): void;
				function setGroupFieldOpen(fieldCode: string, isOpen: boolean): void;
			}
		}
	}

	/**
	 * `kintone.app.record.set()` に渡せるレコード。
	 *
	 * 読み取り型と違い `disabled` と `error` を持てる。
	 * 実測では set() で設定しても get() では返らないため、
	 * これらは書き込み専用のプロパティとして扱う。
	 *
	 * 部分更新ができるので、変更したいフィールドだけを含めればよい。
	 */
	type KintoneSetRecord = {
		[fieldCode: string]: {
			/**
			 * **必須**。省略すると実行時に落ちる（実測 2026-08-30）。
			 *
			 * ```
			 * kintone.app.record.set({ record: { singleLineText: { value: "x" } } });
			 * → カスタマイズ用の JavaScript の実行時にエラーが発生しました。
			 *   event.record['singleLineText'].type が不正です。
			 * ```
			 *
			 * 当初は optional として宣言していたが、根拠が無かった。
			 * 実測で否定されたので必須にする。
			 */
			type: string;
			value?: unknown;
			disabled?: boolean;
			error?: string | null;
		};
	};
}

// このファイルはグローバル宣言のみを持つ。
// 先頭の import があるためモジュールとして扱われ、declare global が有効になる。
//
// index.ts からは import しない。ライブラリが利用者のグローバルスコープを
// 勝手に書き換えないため。使う側が明示的に取り込む。
//
//   import "monosashi/kintone";
//
// サーバサイドで toRestWrite などだけを使う利用者に kintone グローバルを
// 生やすと、実行時に存在しないものをコンパイルが通してしまう。
