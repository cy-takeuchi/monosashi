import { createClient, log } from "@jissoku/rig/client";
import { describeError } from "@jissoku/rig/describeError";
import { env } from "@jissoku/rig/env";
import { runScript } from "@jissoku/rig/run";

/**
 * .env が指しているアプリの中身を読み取り専用で確認する。
 *
 * kintone にはアプリ削除の REST API が無いため、
 * FIXTURE_APP_ID / FIXTURE_LOOKUP_APP_ID を取り違えたまま app:build を実行すると
 * 誤ったアプリのフィールドを全消ししてしまう。その事故を防ぐための事前確認。
 */

const inspect = async (label: string, app: string): Promise<void> => {
	const client = createClient();
	try {
		const { name } = await client.app.getApp({ id: app });
		const { properties } = await client.app.getFormFields({ app });
		const { records } = await client.record.getRecords({
			app,
			fields: ["$id"],
		});
		const codes = Object.keys(properties).sort();

		log(`${label} (app=${app})`);
		log(`  アプリ名  : ${name}`);
		log(
			`  フィールド: ${codes.length} 件 ${codes.length === 0 ? "(なし)" : `[${codes.slice(0, 8).join(", ")}${codes.length > 8 ? ", …" : ""}]`}`,
		);
		log(`  レコード  : ${records.length} 件`);

		// getFormFields と レコード実物で、どのフィールドが見えるかは一致しない。
		// CATEGORY / STATUS / STATUS_ASSIGNEE の有効・無効はレコード側でしか判定できないため、
		// 両方を並べて出す。
		const { records: full } = await client.record.getRecords({ app });
		const first = full[0];
		if (first !== undefined) {
			const types = [
				...new Set(Object.values(first).map((field) => field.type as string)),
			].sort();
			log(`  レコードに現れる type: ${types.join(", ")}`);
			for (const special of ["CATEGORY", "STATUS", "STATUS_ASSIGNEE"]) {
				log(`    ${special}: ${types.includes(special) ? "あり" : "なし"}`);
			}
		}
	} catch (error) {
		log(`${label} (app=${app})`);
		log(`  取得できません: ${describeError(error)}`);
	}
	log("");
};

const main = async (): Promise<void> => {
	log("");
	await inspect("FIXTURE_APP_ID       (測定用のはず)", env.fixtureAppId());
	await inspect(
		"FIXTURE_LOOKUP_APP_ID(ルックアップ元のはず)",
		env.lookupAppId(),
	);
	log("アプリ名と役割が一致しているか確認してください。");
	log("入れ違っている場合は .env を直してから app:build を実行します。");
};

runScript(main);
