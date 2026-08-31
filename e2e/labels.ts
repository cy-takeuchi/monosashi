/**
 * kintone 標準 UI のラベル。
 *
 * **表示言語は利用者の言語設定で変わる。** 実測でこの環境のログイン画面は
 * 英語だった（"Login name" / "Password" / "Login"）。
 * 日本語を前提にすると、環境が違うだけで採取が動かない。
 * OSS として他の人が自分の環境で走らせることを考えると、言語を仮定できない。
 *
 * ここに集約するのは、増えたときに一覧できるようにするため。
 * **そもそもここに足さずに済む方法があればそちらを採る**
 * （例: 編集画面へは URL で直接遷移する。ボタンを押さないので言語に依存しない）。
 *
 * なお検証アプリのフィールドラベル（「文字列1行(必須)」など）はここに入らない。
 * あれは fields.ts で我々が定義したもので、環境の言語では変わらない。
 */

export const LOGIN_NAME = /^(ログイン名|Login name)$/;
export const PASSWORD = /^(パスワード|Password)$/;
export const LOGIN_BUTTON = /^(ログイン|Login)$/;
export const SAVE_BUTTON = /^(保存|Save)$/;

/**
 * サブテーブルの行操作ボタン。
 *
 * **役割と名前で掴める**ことを実物で確認済み（`e2e/inspect.spec.ts`）。
 * 内部セレクタ（`.add-row-image-gaia` など）は使わない。
 *
 * 一方、フィールドの入力欄には accessible name が無いため、
 * UI での値入力は同じ方法では掴めない。
 */
/**
 * カスタマイズの実行時エラー。
 *
 * kintone は `set()` に不正な値を渡してもこのダイアログを出すだけで、
 * **`set()` の呼び出しは例外を投げない**（実測）。
 * そのためスクリプトからは成功に見え、実際それで誤った実測を記録しかけた。
 * 採取の途中でこれが出ていたら、その先の結果は信用できない。
 */
export const CUSTOMIZE_ERROR =
	/(カスタマイズ用のJavaScript|JavaScript for customization)/;

export const ADD_ROW = /^(行を追加|Add row)$/;
export const DELETE_ROW = /^(この行を削除|Delete this row)$/;
