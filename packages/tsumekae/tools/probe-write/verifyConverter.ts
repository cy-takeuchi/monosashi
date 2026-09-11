import { createClient, log } from "@jissoku/rig/client";
import { describeError } from "@jissoku/rig/describeError";
import { env } from "@jissoku/rig/env";
import { runScript } from "@jissoku/rig/run";
import { toRestWrite } from "../../src/convert/toRestWrite";

/**
 * 変換関数の出力が実際に kintone に通ることを確かめる。
 *
 * 単体テストは「変換が期待どおりの形になるか」しか見ていない。
 * その形を kintone が受け付けるかは、実際に投げないと分からない。
 * 変換の目的そのものなので、ここを確認しないと意味がない。
 */

const main = async (): Promise<void> => {
	const client = createClient();
	const app = env.fixtureAppId();

	// 全項目入力済みのレコードを取得する。
	// システムフィールド・ルックアップ・サブテーブルが揃っているものが要る。
	const { records } = await client.record.getRecords({ app });
	const source = records.find(
		(record) =>
			record.subtable?.value !== undefined &&
			Array.isArray(record.subtable.value) &&
			record.subtable.value.length > 0,
	);
	if (source === undefined) {
		throw new Error("サブテーブルに行があるレコードが見つかりません");
	}

	const sourceId = String(source.$id?.value ?? "");
	log(`取得元レコード id=${sourceId}`);
	log(`  フィールド数: ${Object.keys(source).length}`);

	// 変換せずそのまま投げたらどうなるかを先に確認する（対照）
	log("");
	log("[1/3] 変換せずに投げる（失敗するはず）");
	const probeId = String(
		(
			await client.record.addRecord({
				app,
				record: { singleLineTextRequired: { value: "変換の検証用" } },
			})
		).id,
	);
	log(`  検証用レコードを作成 id=${probeId}`);
	try {
		await client.record.updateRecord({
			app,
			id: probeId,
			record: source as never,
		});
		log("  受け入れられた（想定外。実測と食い違う）");
	} catch (error) {
		log(`  期待どおり失敗: ${describeError(error).split("\n")[0]}`);
	}

	log("");
	log("[2/3] 変換して投げる（成功するはず）");
	const { record, revision } = toRestWrite(
		source as unknown as { [code: string]: { type: string; value: unknown } },
	);
	log(`  変換後のフィールド数: ${Object.keys(record).length}`);
	log(`  取り出した revision: ${revision ?? "(なし)"}`);
	await client.record.updateRecord({
		app,
		id: probeId,
		record: record as never,
	});
	log("  受け入れられた");

	log("");
	log("[3/3] サブテーブルの行 id が保たれているか");
	const { record: after } = await client.record.getRecord({ app, id: probeId });
	const beforeIds = ((source.subtable?.value ?? []) as { id: string }[]).map(
		(row) => row.id,
	);
	const afterIds = ((after.subtable?.value ?? []) as { id: string }[]).map(
		(row) => row.id,
	);
	log(`  変換元の行 id: ${JSON.stringify(beforeIds)}`);
	log(`  書き込み後  : ${JSON.stringify(afterIds)}`);
	log(
		afterIds.length === beforeIds.length
			? `  行数は保たれた（id は別レコードなので振り直される）`
			: `  行数が変わった。id の扱いに問題がある`,
	);

	log("");
	log("結論: 変換関数の出力は kintone に受け入れられる");
};

runScript(main);
