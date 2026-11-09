import { test, expect, Phone, Dump, Exported } from './support/phone';
import { V1_CORPUS, CorpusFile, expectedCounts } from './support/corpus';
import { V1_SETTINGS_KEYS, V2_SETTINGS_KEYS, VERSION_KEY, diff, diffDocs, pick, summary } from './support/compare';
import { readBuilds } from './support/builds';

// Backups of the published version (V1), imported into the V1 and into the V2: the V2 must store and save them again
// exactly as the V1 does, and as they were, field by field and type by type.

async function importAndExport(phone: Phone, file: CorpusFile): Promise<{ dump: Dump, exported: Exported }> {
	await phone.firstLaunch('fr');
	await phone.importBackup(file.name, file.text, expectedCounts(file));
	const dump = await phone.dump();
	const exported = await phone.exportBackup();
	return { dump, exported };
}

function check(label: string, differences: string[]): void {
	expect.soft(differences, `${label}: ${summary(differences)}`).toEqual([]);
}

for (const file of V1_CORPUS) {
	test.describe(file.name, () => {

		test(`imported into the V2, saved again exactly as the V1 does (${file.description})`, async ({ phone }, testInfo) => {
			const [v1, v2] = await Promise.all([phone('phone-v1', 'v1'), phone('phone-v2', 'v2')]);
			const [r1, r2] = await Promise.all([importAndExport(v1, file), importAndExport(v2, file)]);
			const e1 = r1.exported.json;
			const e2 = r2.exported.json;
			await testInfo.attach('export-v1.json', { body: r1.exported.text, contentType: 'application/json' });
			await testInfo.attach('export-v2.json', { body: r2.exported.text, contentType: 'application/json' });

			// Same file name
			expect.soft(r2.exported.fileName).toBe(r1.exported.fileName);
			expect.soft(r2.exported.fileName).toMatch(/^life-notes-save-\d{12}\.json$/);

			// The days and symptoms of the file, unchanged, in both versions
			check('V1 export vs file: days', diffDocs('days', file.backup.days, e1.days));
			check('V2 export vs file: days', diffDocs('days', file.backup.days, e2.days));
			check('V2 export vs V1 export: days', diffDocs('days', e1.days, e2.days));
			expect.soft(e2.days.map(d => d._id), 'order of the days').toEqual(e1.days.map(d => d._id));
			check('V1 export vs file: symptoms', diffDocs('symptoms', file.backup.symptoms, e1.symptoms));
			check('V2 export vs file: symptoms', diffDocs('symptoms', file.backup.symptoms, e2.symptoms));
			expect.soft(e2.symptoms.map(s => s._id), 'order of the symptoms').toEqual(e1.symptoms.map(s => s._id));

			// The settings of the V1, same values; the V2 ones are the defaults of a new phone. lastWeeklyReminder isn't
			// in the backup (neither version imports it), it comes from the phone: the V1 shows its reminder at the first
			// launch and loses its date in a concurrent write of the settings (0), the V2 counts from the installation.
			// lastInstall: the version of each app
			const compared = V1_SETTINGS_KEYS.filter(key => key !== 'lastWeeklyReminder' && key !== VERSION_KEY);
			check('V2 vs V1: settings of the V1', diff(pick(e1.settings, compared), pick(e2.settings, compared)));
			expect.soft(e1.settings[VERSION_KEY], 'version of the V1').toBe(readBuilds().v1.version);
			expect.soft(e2.settings[VERSION_KEY], 'version of the V2').toBe(readBuilds().v2.version);
			expect.soft(Object.keys(e1.settings).filter(key => !V1_SETTINGS_KEYS.includes(key)), 'unknown settings in V1').toEqual([]);
			expect.soft(Object.keys(e2.settings).filter(key => ![...V1_SETTINGS_KEYS, ...V2_SETTINGS_KEYS].includes(key)),
				'unknown settings in V2').toEqual([]);
			expect.soft(e2.settings).toMatchObject({
				language: file.backup.settings.language,
				targetSymptomKey: file.backup.settings.targetSymptomKey,
				darkMode: false, landscapeMode: false, uiVersion: 'v2', sleepChartMode: 'bars', dailyReminder: false
			});

			// Structure of the file: the V2 adds the (empty) list of the custom types
			expect.soft(Object.keys(e1).sort()).toEqual(['days', 'settings', 'symptoms']);
			expect.soft(Object.keys(e2).sort()).toEqual(['customTypes', 'days', 'settings', 'symptoms']);
			expect.soft(e2.customTypes).toEqual([]);

			// The databases themselves (detailedDate included), the revisions apart
			check('V2 vs V1 database: days', diffDocs('days', r1.dump.days, r2.dump.days, { ignore: ['_rev'] }));
			check('V2 vs V1 database: symptoms', diffDocs('symptoms', r1.dump.symptoms, r2.dump.symptoms, { ignore: ['_rev'] }));
			expect.soft(r2.dump.customTypes).toEqual([]);

			// The V2 opened again: its start doesn't change the days nor the symptoms
			await v2.restart();
			const after = await v2.waitForStableData(dump => dump.days.length === r2.dump.days.length);
			check('V2 after a restart: days', diffDocs('days', r2.dump.days, after.days));
			check('V2 after a restart: symptoms', diffDocs('symptoms', r2.dump.symptoms, after.symptoms));
			const again = (await v2.exportBackup()).json;
			check('V2 export after a restart: days', diffDocs('days', file.backup.days, again.days));

			// The backup of the V2 goes back into the V1 (a phone not updated yet): everything is there
			await v1.importBackup('from-v2.json', r2.exported.text, expectedCounts(file));
			const back = (await v1.exportBackup()).json;
			check('V2 backup imported into the V1: days', diffDocs('days', file.backup.days, back.days));
			check('V2 backup imported into the V1: symptoms', diffDocs('symptoms', file.backup.symptoms, back.symptoms));
		});
	});
}
