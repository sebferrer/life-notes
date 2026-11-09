import { test, expect, Phone } from './support/phone';
import { EDGE_V1, RICH_V2, V037, CUSTOM_TYPES, expectedCounts } from './support/corpus';
import { V1_SETTINGS_KEYS, VERSION_KEY, diff, diffDocs, pick, summary } from './support/compare';

// What an import does to a phone that already holds data, the other ways to save and import (advanced settings), and
// the imports that don't happen (cancelled, refused): the V2 must do exactly what the V1 does.

function check(label: string, differences: string[]): void {
	expect.soft(differences, `${label}: ${summary(differences)}`).toEqual([]);
}

// The backup of the 0.3.7, one of its symptoms renamed: it is also a symptom of the phone (migraine)
const RENAMED = (() => {
	const backup = JSON.parse(V037.text);
	backup.symptoms.find(s => s.key === 'migraine').label = 'Migraine (renommée dans la sauvegarde)';
	return { name: 'renamed.json', text: JSON.stringify(backup), backup };
})();

const SYMPTOMS_AFTER = new Set([...EDGE_V1.backup.symptoms.map(s => s._id), ...RENAMED.backup.symptoms.map(s => s._id)]).size;

test.describe('Import into a phone that has data', () => {

	test('the days are replaced, the symptoms added, as in the V1', async ({ phone }) => {
		const run = async (p: Phone) => {
			await p.firstLaunch('fr');
			await p.importBackup(EDGE_V1.name, EDGE_V1.text, expectedCounts(EDGE_V1));
			await p.importBackup(RENAMED.name, RENAMED.text, { days: RENAMED.backup.days.length, symptoms: SYMPTOMS_AFTER, language: 'fr' });
			return (await p.exportBackup()).json;
		};
		const [e1, e2] = await Promise.all([run(await phone('phone-v1', 'v1')), run(await phone('phone-v2', 'v2'))]);

		check('V2 vs V1: days', diffDocs('days', e1.days, e2.days));
		check('V2 vs V1: symptoms', diffDocs('symptoms', e1.symptoms, e2.symptoms));
		// lastWeeklyReminder and lastInstall come from the phone (see v1-backups.spec.ts)
		const compared = V1_SETTINGS_KEYS.filter(key => key !== 'lastWeeklyReminder' && key !== VERSION_KEY);
		check('V2 vs V1: settings', diff(pick(e1.settings, compared), pick(e2.settings, compared)));
		// What both versions do: only the days of the backup, the symptoms of the phone kept (with their name)
		check('days of the backup', diffDocs('days', RENAMED.backup.days, e2.days));
		expect.soft(e2.symptoms.find(s => s.key === 'migraine').label).toBe('Migraine');
		expect.soft(e2.symptoms.map(s => s.key)).toEqual(expect.arrayContaining(['jamais_utilise', 'vertiges']));
	});

	// The backup has no types and no custom entry: no type of the phone is kept (see v2-backups.spec.ts for a backup
	// of the V2 saved again by the V1, whose entries keep the types of the phone)
	test('a V2 phone with custom types: a V1 backup replaces them, as it replaces the days', async ({ phone }) => {
		const run = async (p: Phone) => {
			await p.firstLaunch('fr');
			await p.importBackup(RICH_V2.name, RICH_V2.text, expectedCounts(RICH_V2));
			if (p.version === 'v2') {
				await p.waitForStableData(d => d.customTypes.length === CUSTOM_TYPES.length);
			}
			const symptoms = new Set([...RICH_V2.backup.symptoms, ...V037.backup.symptoms].map(s => s._id)).size;
			await p.importBackup(V037.name, V037.text, { days: V037.backup.days.length, symptoms, language: 'fr' });
			return { exported: (await p.exportBackup()).json, dump: await p.dump() };
		};
		const [r1, r2] = await Promise.all([run(await phone('phone-v1', 'v1')), run(await phone('phone-v2', 'v2'))]);
		check('V2 vs V1: days', diffDocs('days', r1.exported.days, r2.exported.days));
		check('V2 vs V1: symptoms', diffDocs('symptoms', r1.exported.symptoms, r2.exported.symptoms));
		check('days of the backup', diffDocs('days', V037.backup.days, r2.exported.days));
		expect.soft(r2.exported.customTypes).toEqual([]);
		expect.soft(r2.dump.customTypes).toEqual([]);
	});

	test('a cancelled or refused import changes nothing', async ({ phone }) => {
		const run = async (p: Phone) => {
			await p.firstLaunch('fr');
			await p.importBackup(EDGE_V1.name, EDGE_V1.text, expectedCounts(EDGE_V1));
			const before = await p.dump();
			expect(await p.selectBackup(V037.name, V037.text)).toEqual({ accepted: true });
			await p.cancelImport();
			expect((await p.selectBackup('broken.json', '{"days": [')).accepted).toBe(false);
			await p.page.waitForTimeout(1500);
			const after = await p.dump();
			// Same documents, same revisions
			check(`${p.version}: days`, diffDocs('days', before.days, after.days));
			check(`${p.version}: symptoms`, diffDocs('symptoms', before.symptoms, after.symptoms));
			check(`${p.version}: settings`, diffDocs('settings', before.settings, after.settings));
		};
		await Promise.all([run(await phone('phone-v1', 'v1')), run(await phone('phone-v2', 'v2'))]);
	});
});

test.describe('Advanced settings', () => {

	// The manual save (JSON to copy) and the forced import (without checking the file) of the advanced settings
	test('the manual save gives the saved file, the forced import imports it as in the V1', async ({ phone }) => {
		const run = async (p: Phone) => {
			await p.firstLaunch('fr');
			await p.importBackup(EDGE_V1.name, EDGE_V1.text, expectedCounts(EDGE_V1));
			const [settings] = (await p.dump(['settings'])).settings;
			await p.writeDocs('settings', [{ ...settings, showAdvancedSettings: true }]);
			await p.restart();
			const saved = await p.exportBackup();

			// Manual save: the same backup as the file
			await p.page.locator('button[transloco="SETTINGS_MANUAL_SAVE_BUTTON"]').dispatchEvent('click');
			const textarea = p.page.locator('textarea[cdkAutosizeMinRows]');
			await expect(textarea).not.toHaveValue('');
			const manual = JSON.parse(await textarea.inputValue());
			check(`${p.version}: manual save vs saved file`, diff(saved.json, manual));

			// Forced import of the 0.3.7 backup
			await p.page.locator('#file-force-import').setInputFiles({ name: V037.name, mimeType: 'application/json', buffer: Buffer.from(V037.text) });
			const symptoms = new Set([...EDGE_V1.backup.symptoms, ...V037.backup.symptoms].map(s => s._id)).size;
			await p.confirmImport({ days: V037.backup.days.length, symptoms, language: 'fr' });
			return (await p.exportBackup()).json;
		};
		const [e1, e2] = await Promise.all([run(await phone('phone-v1', 'v1')), run(await phone('phone-v2', 'v2'))]);
		check('forced import, V2 vs V1: days', diffDocs('days', e1.days, e2.days));
		check('forced import, V2 vs V1: symptoms', diffDocs('symptoms', e1.symptoms, e2.symptoms));
		check('forced import: days of the backup', diffDocs('days', V037.backup.days, e2.days));
	});
});
