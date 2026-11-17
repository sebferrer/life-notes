import { test, expect, Phone } from './support/phone';
import { NEWER_DATA as FILE, expectedCounts } from './support/corpus';
import { diff, omit, summary } from './support/compare';
import { PUBLISHED_V1_SHA, readBuilds } from './support/builds';

// Data of a newer version edited by an older one: an app rolled back, or a backup restored on a phone not updated
// yet. An older version keeps in the days it writes the fields it doesn't know (the sports and the custom entries of
// the V2, for the V1). But when the last entry it knows is removed from a day without wake-up nor bedtime, it removes
// the day if it deems it empty: the V1 0.3.7 removes this way the sports and the custom entries of the day
// (isDayEmpty of days.service.ts).
//
// The published V1 has this fault, and keeps it on the phones not updated: with it, the V1 tests are expected to fail.
// A V1 published again (a rollback) must pass them: build it from the 0.3.7 with v1-rollback.patch (see README.md).

const PUBLISHED_V1 = readBuilds().v1.sha === PUBLISHED_V1_SHA;
const PUBLISHED_V1_FAULT = 'Fault of the published V1 (0.3.7): the day is removed with the entries of the V2';
const DATES = FILE.backup.days.map(d => d.date);
// Only the day holding nothing but its symptom is removed with it
const REMOVED = ['2026-11-04'];
const NOT_COMPARED = ['_rev', 'detailedDate', 'symptoms', 'symptomOverviews'];

type Interface = 'v1' | 'v2';

// Removes the symptom of a day: page of the day, the entry, "Delete", "Yes"
async function removeSymptom(phone: Phone, date: string, ui: Interface): Promise<void> {
	const page = phone.page;
	// Through another page: the page of a day doesn't read the date again when only the date changes
	await page.evaluate(() => { location.hash = '#/about'; });
	await expect(page.locator('app-about')).toBeAttached();
	await page.evaluate(d => { location.hash = `#/${d}`; }, date);
	await page.locator(ui === 'v2'
		? `.day-page#day-${date} .event-row.symptomLog`
		: `.day-container#day-${date} mat-chip.day-day-item-symptomLog .event-container`).click();
	await page.locator('.delete-button').click();
	await page.locator('.delete-timeline-event .confirm-button').click();
	await phone.waitForStableData(dump => {
		const day = dump.days.find(d => d._id === date);
		return day == null || day.symptoms.length === 0;
	});
}

async function removeSymptoms(phone: Phone, ui: Interface): Promise<void> {
	for (const date of DATES) {
		await removeSymptom(phone, date, ui);
	}
}

// Every day kept but the one left empty, with everything but its symptom
function check(days: any[]): void {
	const differences: string[] = [];
	for (const expected of FILE.backup.days) {
		const day = days.find(d => d._id === expected._id);
		if (REMOVED.includes(expected._id)) {
			if (day != null) {
				differences.push(`${expected._id}: kept though empty`);
			}
		} else if (day == null) {
			const lost = Object.keys(omit(expected, [...NOT_COMPARED, '_id', 'date']))
				.filter(key => expected[key] != null && expected[key].length > 0);
			differences.push(`${expected._id}: day removed, with its ${lost.join(', ')}`);
		} else {
			diff(omit(expected, NOT_COMPARED), omit(day, NOT_COMPARED), expected._id, differences);
			expect.soft(day.symptoms, `${expected._id}: symptom removed`).toEqual([]);
		}
	}
	expect(differences, summary(differences)).toEqual([]);
}

async function useInterface(phone: Phone, ui: Interface): Promise<void> {
	const [settings] = (await phone.dump(['settings'])).settings;
	await phone.writeDocs('settings', [{ ...settings, uiVersion: ui, newUiPopupSeen: true }]);
	await phone.restart();
	await expect(phone.page.locator('body')).toHaveClass(ui === 'v1' ? /ui-v1/ : /^(?!.*ui-v1)/);
}

async function importFile(phone: Phone): Promise<void> {
	await phone.firstLaunch('fr');
	await phone.importBackup(FILE.name, FILE.text, expectedCounts(FILE));
	await phone.waitForStableData(d => d.customTypes.length === FILE.backup.customTypes.length);
}

test.describe('V2 data edited by the V1', () => {

	test('app rolled back to the V1: removing the last symptom of a day keeps its other entries', async ({ phone }) => {
		test.fail(PUBLISHED_V1, PUBLISHED_V1_FAULT);
		const p = await phone('phone', 'v2');
		await importFile(p);
		await p.installVersion('v1');
		await removeSymptoms(p, 'v1');
		await p.installVersion('v2');
		const dump = await p.dump();
		check(dump.days);
		expect(dump.customTypes.map(t => t.key), 'custom types').toEqual(FILE.backup.customTypes.map(t => t.key));
	});

	test('V2 backup restored on a phone still in V1, edited, saved, imported into the V2: nothing lost', async ({ phone }) => {
		test.fail(PUBLISHED_V1, PUBLISHED_V1_FAULT);
		const [v1, v2] = await Promise.all([phone('phone-v1', 'v1'), phone('phone-v2', 'v2')]);
		await Promise.all([v1.firstLaunch('fr'), v2.firstLaunch('fr')]);
		await v1.importBackup(FILE.name, FILE.text, expectedCounts(FILE));
		await removeSymptoms(v1, 'v1');
		const saved = await v1.exportBackup();
		await v2.importBackup('from-v1.json', saved.text, {
			days: saved.json.days.length, symptoms: saved.json.symptoms.length, language: saved.json.settings.language
		});
		// The V1 doesn't save the custom types (see README.md): only the days are compared
		check((await v2.dump()).days);
	});
});

test.describe('Data of a later version edited by the V2', () => {

	for (const ui of ['v2', 'v1'] as Interface[]) {
		test(`${ui.toUpperCase()} interface: removing the last symptom of a day keeps its other entries`, async ({ phone }) => {
			const v2 = await phone('phone-v2', 'v2');
			await importFile(v2);
			await useInterface(v2, ui);
			await removeSymptoms(v2, ui);
			const dump = await v2.dump();
			check(dump.days);
			expect(dump.customTypes.map(t => t.key), 'custom types').toEqual(FILE.backup.customTypes.map(t => t.key));
		});
	}
});
