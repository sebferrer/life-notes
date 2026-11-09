import { test, expect, Phone } from './support/phone';
import { CUSTOM_TYPES, RICH_V2, expectedCounts } from './support/corpus';
import { Backup, countEvents, diff, diffDocs, pick, summary } from './support/compare';
import { App, NOW as APP_NOW, TODAY as APP_TODAY, YESTERDAY as APP_YESTERDAY } from '../support/app';
import { PUBLISHED_V1_SHA, readBuilds } from './support/builds';

// Backups of the V2 (sports, custom event types and their entries, inverted scales, appearance settings):
// - imported into the V2, everything comes back
// - imported into the V1 (a phone not updated yet), nothing of the days is lost, and the V2 gets them back
// The custom type definitions and the settings of the V2 are the only things the published V1 can't keep (it doesn't
// know them): see the README. A V1 published again (rollback, v1-rollback.patch) keeps them.

function check(label: string, differences: string[]): void {
	expect.soft(differences, `${label}: ${summary(differences)}`).toEqual([]);
}

function counts(backup: Backup): { days: number, symptoms: number, language: string } {
	return {
		days: new Set(backup.days.map(d => d._id)).size,
		symptoms: new Set(backup.symptoms.map(s => s._id)).size,
		language: backup.settings.language
	};
}

// The published V1 (0.3.7), or a V1 published again for a rollback (see v1-rollback.patch)
const PUBLISHED_V1 = readBuilds().v1.sha === PUBLISHED_V1_SHA;

// The settings a V2 backup restores
const RESTORED_SETTINGS = ['language', 'targetSymptomKey', 'darkMode', 'landscapeMode', 'uiVersion', 'sleepChartMode', 'eventColors'];

// Visits the screens of the V1 showing the days (timeline, calendar of the last months): no error with the days of
// the V2
async function browseV1(phone: Phone, months: number): Promise<void> {
	const page = phone.page;
	await page.locator('#menu-icon-timeline').click();
	await expect(page.locator('#menu-icon-timeline')).toBeVisible();
	await page.mouse.wheel(0, 5000);
	await page.waitForTimeout(500);
	await page.locator('#menu-icon-calendar').click();
	const previous = page.locator('.calendar-header .previous-button button');
	await expect(previous).toBeVisible();
	for (let i = 0; i < months; i++) {
		await previous.click();
		await page.waitForTimeout(400);
	}
}

// Every event of the days shown by the timeline of the V2, the days of the file not yet saved in the past
async function expectTimelineRows(phone: Phone, backup: Backup, dates: string[]): Promise<void> {
	const page = phone.page;
	await page.locator('#menu-icon-calendar').click();
	await page.locator('#menu-icon-timeline').click();
	for (const date of dates) {
		const day = backup.days.find(d => d.date === date);
		const card = page.locator(`#day-${date}`);
		await expect(async () => {
			if (await card.count() === 0) {
				await page.mouse.wheel(0, 3000);
			}
			await expect(card).toBeAttached({ timeout: 1000 });
		}).toPass({ timeout: 30_000 });
		await expect.soft(card.locator('.event-row'), `events of ${date}`).toHaveCount(countEvents(day));
	}
}

test.describe('Backups of the V2', () => {

	test('a V2 backup imported into the V2 brings back everything', async ({ phone }) => {
		const v2 = await phone('phone-v2', 'v2');
		await v2.firstLaunch('fr');
		await v2.importBackup(RICH_V2.name, RICH_V2.text, expectedCounts(RICH_V2));
		const dump = await v2.waitForStableData(d => d.customTypes.length === CUSTOM_TYPES.length);
		const exported = (await v2.exportBackup()).json;

		check('days', diffDocs('days', RICH_V2.backup.days, exported.days));
		check('symptoms', diffDocs('symptoms', RICH_V2.backup.symptoms, exported.symptoms));
		check('custom types', diffDocs('customTypes', RICH_V2.backup.customTypes, exported.customTypes, { idField: 'key' }));
		check('restored settings', diff(pick(RICH_V2.backup.settings, RESTORED_SETTINGS), pick(exported.settings, RESTORED_SETTINGS)));
		// As stored: the id of a type is its key
		expect.soft(dump.customTypes.map(t => t._id).sort()).toEqual(CUSTOM_TYPES.map(t => t.key).sort());

		// Shown as saved: dark theme, colors of the types, every entry of the last days
		await expect(v2.page.locator('body')).toHaveClass(/dark-theme/);
		await expectTimelineRows(v2, RICH_V2.backup, RICH_V2.backup.days.map(d => d.date).sort().reverse().slice(0, 20));
		await expect(v2.page.locator('.event-row.custom').first()).toHaveClass(/custom-type-ct/);

		// Opened again: nothing changes
		await v2.restart();
		const again = (await v2.exportBackup()).json;
		check('days after a restart', diffDocs('days', RICH_V2.backup.days, again.days));
		check('custom types after a restart', diffDocs('customTypes', RICH_V2.backup.customTypes, again.customTypes, { idField: 'key' }));
	});

	test('a V2 backup imported into the V1 keeps every day, and goes back into the V2', async ({ phone }) => {
		const v1 = await phone('phone-v1', 'v1');
		await v1.firstLaunch('fr');
		// Accepted by the V1: its check only looks at days, symptoms and settings
		await v1.importBackup(RICH_V2.name, RICH_V2.text, expectedCounts(RICH_V2));
		const fromV1 = await v1.exportBackup();

		// The V1 stores the days and the symptoms as they are: the sports, the custom entries and the inverted scales
		// are kept, even if the V1 doesn't show them
		check('V1 export: days', diffDocs('days', RICH_V2.backup.days, fromV1.json.days));
		check('V1 export: symptoms', diffDocs('symptoms', RICH_V2.backup.symptoms, fromV1.json.symptoms));
		if (PUBLISHED_V1) {
			// Known limit of the published version: it doesn't know the custom type definitions
			expect.soft(fromV1.json.customTypes, 'the V1 has no custom types').toBeUndefined();
		} else {
			check('V1 export: custom types', diffDocs('customTypes', RICH_V2.backup.customTypes, fromV1.json.customTypes, { idField: 'key' }));
		}
		// The screens of the V1 still work with these days
		await browseV1(v1, 4);

		// Back into the V2 (e.g. the phone updated): every day, every symptom
		const v2 = await phone('phone-v2', 'v2');
		await v2.firstLaunch('fr');
		await v2.importBackup('from-v1.json', fromV1.text, expectedCounts(RICH_V2));
		const back = (await v2.exportBackup()).json;
		check('back in V2: days', diffDocs('days', RICH_V2.backup.days, back.days));
		check('back in V2: symptoms', diffDocs('symptoms', RICH_V2.backup.symptoms, back.symptoms));
		if (PUBLISHED_V1) {
			// A new phone: the definitions aren't in the file of the V1, nor on the phone
			expect.soft(back.customTypes, 'definitions lost through the V1').toEqual([]);
		} else {
			check('back in V2: custom types', diffDocs('customTypes', RICH_V2.backup.customTypes, back.customTypes, { idField: 'key' }));
			check('back in V2: settings', diff(pick(RICH_V2.backup.settings, RESTORED_SETTINGS), pick(back.settings, RESTORED_SETTINGS)));
		}
		// The entries of the lost types are still shown (with a neutral label and color), none is hidden
		await expectTimelineRows(v2, RICH_V2.backup, RICH_V2.backup.days.map(d => d.date).sort().reverse().slice(0, 10));
	});

	test('a V2 backup saved again by the V1, back into the V2 phone: its custom types and settings kept', async ({ phone }) => {
		const [v1, v2] = await Promise.all([phone('phone-v1', 'v1'), phone('phone-v2', 'v2')]);
		await Promise.all([v1.firstLaunch('fr'), v2.firstLaunch('fr')]);
		await v2.importBackup(RICH_V2.name, RICH_V2.text, expectedCounts(RICH_V2));
		await v2.waitForStableData(d => d.customTypes.length === CUSTOM_TYPES.length);
		const fromV2 = await v2.exportBackup();
		// Through a phone not updated, which saves it again without the types nor the settings of the V2
		await v1.importBackup('from-v2.json', fromV2.text, expectedCounts(RICH_V2));
		const fromV1 = await v1.exportBackup();
		if (PUBLISHED_V1) {
			expect.soft(fromV1.json.customTypes, 'the V1 has no custom types').toBeUndefined();
		}

		// Back into the V2 phone: the types used by the entries of the file are those of the phone
		await v2.importBackup('from-v1.json', fromV1.text, expectedCounts(RICH_V2));
		await v2.waitForStableData(d => d.customTypes.length === CUSTOM_TYPES.length, 30_000);
		const back = (await v2.exportBackup()).json;
		check('days', diffDocs('days', RICH_V2.backup.days, back.days));
		check('symptoms', diffDocs('symptoms', RICH_V2.backup.symptoms, back.symptoms));
		check('custom types', diffDocs('customTypes', RICH_V2.backup.customTypes, back.customTypes, { idField: 'key' }));
		// The settings of the V2 aren't in the file of the V1: those of the phone are kept
		check('settings', diff(pick(RICH_V2.backup.settings, RESTORED_SETTINGS), pick(back.settings, RESTORED_SETTINGS)));
		await expect(v2.page.locator('body')).toHaveClass(/dark-theme/);
	});

	test('data typed in the V2 interface goes through the V1 and back', async ({ phone }, testInfo) => {
		// The helpers of the regression tests type the entries of each kind, on their day (frozen clock)
		const v2 = await phone('phone-v2', 'v2', APP_NOW);
		const app = new App(v2.page);
		await app.start();
		await app.addSymptom('Tête');
		await app.addSymptom('Humeur', { invertedScale: true });
		await app.targetSymptom('Tête');
		await app.createCustomType('Eau', { icon: 'water_drop', color: 0, quantity: true, unit: 'L' });
		await app.createCustomType('Méditation', { icon: 'self_improvement' });
		await app.goToTimeline();
		await app.addEvent('symptomLog', { detail: 'Côté gauche' });
		await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
		await app.addEvent('log', { key: 'Mauvaise nuit', detail: 'Réveillé deux fois' });
		await app.addEvent('sport', { key: 'Course à pied', detail: '5 km' });
		await app.addEvent('meal', { key: 'Pâtes', detail: 'Carbonara' });
		await app.addCustomEvent('Eau', { key: 'Plate', quantity: '1,5', detail: 'Au réveil' });
		await app.addCustomEvent('Méditation', { detail: 'Dix minutes' });
		await app.addEvent('sport', { key: 'Vélo' }, APP_YESTERDAY);
		await app.addCustomEvent('Eau', { quantity: '0,5' }, APP_YESTERDAY);
		await app.setSleepTime('wakeUp', '07:15');
		await app.setDayIntensity(4);
		await app.goToSettings('Apparence');
		await app.setToggle('Mode sombre', true);
		const original = await v2.exportBackup();
		await testInfo.attach('typed-in-v2.json', { body: original.text, contentType: 'application/json' });
		const typed = original.json;
		const today = typed.days.find(d => d.date === APP_TODAY);
		// Sanity: everything typed is in the backup
		expect(countEvents(today)).toBe(7);
		expect(typed.customTypes.map(t => t.label)).toEqual(['Eau', 'Méditation']);
		expect(typed.symptoms.find(s => s.label === 'Humeur').invertedScale).toBe(true);

		// Into a V1
		const v1 = await phone('phone-v1', 'v1', APP_NOW);
		await v1.firstLaunch('fr');
		await v1.importBackup('typed-in-v2.json', original.text, counts(typed));
		const fromV1 = await v1.exportBackup();
		check('V1 export: days', diffDocs('days', typed.days, fromV1.json.days));
		check('V1 export: symptoms', diffDocs('symptoms', typed.symptoms, fromV1.json.symptoms));

		// Back into a V2
		const other = await phone('phone-v2-bis', 'v2', APP_NOW);
		await other.firstLaunch('fr');
		await other.importBackup('from-v1.json', fromV1.text, counts(typed));
		const back = (await other.exportBackup()).json;
		check('back in V2: days', diffDocs('days', typed.days, back.days));
		check('back in V2: symptoms', diffDocs('symptoms', typed.symptoms, back.symptoms));

		// And straight from V2 to V2: the types too, and the appearance
		const third = await phone('phone-v2-ter', 'v2', APP_NOW);
		await third.firstLaunch('fr');
		await third.importBackup('typed-in-v2.json', original.text, counts(typed));
		await third.waitForStableData(d => d.customTypes.length === 2);
		const copy = (await third.exportBackup()).json;
		check('V2 to V2: days', diffDocs('days', typed.days, copy.days));
		check('V2 to V2: symptoms', diffDocs('symptoms', typed.symptoms, copy.symptoms));
		check('V2 to V2: custom types', diffDocs('customTypes', typed.customTypes, copy.customTypes, { idField: 'key' }));
		check('V2 to V2: restored settings', diff(pick(typed.settings, RESTORED_SETTINGS), pick(copy.settings, RESTORED_SETTINGS)));
	});
});
