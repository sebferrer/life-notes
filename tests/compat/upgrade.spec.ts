import { test, expect, Phone } from './support/phone';
import { REF, RICH_V2, V037, CUSTOM_TYPES, expectedCounts } from './support/corpus';
import { V1_SETTINGS_KEYS, VERSION_KEY, diff, diffDocs, pick, summary, versionAfterStart } from './support/compare';
import { readBuilds } from './support/builds';
import { getDefaultEventPalettes } from '../../src/app/models/event-colors.model';

// The app updated in place, as by the store: the database of the phone (IndexedDB) is kept, the V2 starts on the data
// written by the V1. Then the other way (a rollback of the release), and back.

function check(label: string, differences: string[]): void {
	expect.soft(differences, `${label}: ${summary(differences)}`).toEqual([]);
}

// The settings of the V1 kept, but the version of the app (lastInstall), checked apart: a V2 with a version above the
// V1 one shows what's new at its first start and stores its own version
const V1_KEYS_BUT_VERSION = V1_SETTINGS_KEYS.filter(key => key !== VERSION_KEY);
const { v1: V1, v2: V2 } = readBuilds();

function checkSettings(label: string, before: any, after: any, appVersion: string): void {
	check(label, diff(pick(before, V1_KEYS_BUT_VERSION), pick(after, V1_KEYS_BUT_VERSION)));
	expect.soft(after[VERSION_KEY], `${label}: version`).toBe(versionAfterStart(before[VERSION_KEY], appVersion));
}

// A phone of a user of the published version: its days and symptoms imported by the V1 itself, then its settings as
// the V1 stored them
async function v1User(phone: Phone, file = REF, settings: any = REF.backup.settings): Promise<void> {
	await phone.firstLaunch('fr');
	await phone.importBackup(file.name, file.text, expectedCounts(file));
	await phone.writeDocs('settings', [settings]);
	await phone.restart();
}

// Settings given by the V2 to a user of a former version
const FORMER_USER_V2_SETTINGS = {
	uiVersion: 'v1', darkMode: false, landscapeMode: false, sleepChartMode: 'bars', dailyReminder: false,
	lastDailyReminder: 0, eventColors: getDefaultEventPalettes()
};

test.describe('Update of the app', () => {

	test('a V1 user updated to the V2 keeps every day, symptom and setting, untouched', async ({ phone }) => {
		const user = await phone('user', 'v1');
		await v1User(user);
		const before = await user.waitForStableData(d => d.days.length === REF.backup.days.length);
		const fromV1 = (await user.exportBackup()).json;
		// The phone holds the backup, settings included
		check('V1: days', diffDocs('days', REF.backup.days, fromV1.days));
		check('V1: settings', diff(REF.backup.settings, fromV1.settings));

		await user.installVersion('v2');
		const after = await user.waitForStableData(d => d.settings[0]?.newUiPopupSeen === true);
		// Marked as seen when it opens: the notice of the new interface may open after the dialogs closed at the start
		await user.closeDialogs();
		// Not a single day or symptom document rewritten by the start of the V2 (same revisions)
		check('days documents', diffDocs('days', before.days, after.days));
		check('symptoms documents', diffDocs('symptoms', before.symptoms, after.symptoms));
		// The V1 interface kept, the popup of the V2 seen
		await expect(user.page.locator('body')).toHaveClass(/ui-v1/);

		const fromV2 = (await user.exportBackup()).json;
		check('V2: days', diffDocs('days', REF.backup.days, fromV2.days));
		check('V2: symptoms', diffDocs('symptoms', REF.backup.symptoms, fromV2.symptoms));
		checkSettings('V2: settings of the V1', fromV1.settings, fromV2.settings, V2.version);
		expect.soft(fromV2.settings).toMatchObject({ ...FORMER_USER_V2_SETTINGS, newUiPopupSeen: true });
		expect.soft(fromV2.customTypes).toEqual([]);

		// Rollback to the V1: it still reads everything (the settings of the V2 left aside)
		await user.installVersion('v1');
		const rolledBack = (await user.exportBackup()).json;
		check('back to V1: days', diffDocs('days', REF.backup.days, rolledBack.days));
		check('back to V1: symptoms', diffDocs('symptoms', REF.backup.symptoms, rolledBack.symptoms));
		checkSettings('back to V1: settings of the V1', fromV2.settings, rolledBack.settings, V1.version);
	});

	test('a user of a 2025 version, updated to the V1 then to the V2', async ({ phone }) => {
		// Five settings, as saved by a 2025 version: the V1 completes them at its start
		const old = { _id: 'settings', targetSymptomKey: 'migraine', language: 'fr', timeFormat: 'eu', firstStart: false, lastInstall: '20250601120000' };
		const user = await phone('user', 'v1');
		await v1User(user, V037, old);
		const fromV1 = (await user.exportBackup()).json;
		expect.soft(fromV1.settings).toMatchObject({ painScale: 5, autoCalculateOverview: false, lastInstall: V1.version });

		await user.installVersion('v2');
		await user.waitForStableData(d => d.settings[0]?.uiVersion === 'v1' && d.settings[0]?.newUiPopupSeen === true);
		await user.closeDialogs();
		const fromV2 = (await user.exportBackup()).json;
		check('days', diffDocs('days', V037.backup.days, fromV2.days));
		check('symptoms', diffDocs('symptoms', V037.backup.symptoms, fromV2.symptoms));
		checkSettings('settings of the V1', fromV1.settings, fromV2.settings, V2.version);
		expect.soft(fromV2.settings).toMatchObject(FORMER_USER_V2_SETTINGS);
	});

	test('a V2 user going back to the V1, then to the V2 again, keeps everything', async ({ phone }) => {
		const user = await phone('user', 'v2');
		await user.firstLaunch('fr');
		await user.importBackup(RICH_V2.name, RICH_V2.text, expectedCounts(RICH_V2));
		const start = await user.waitForStableData(d => d.customTypes.length === CUSTOM_TYPES.length);

		// The V1 on the data of the V2: no error on its screens, every day saved
		await user.installVersion('v1');
		const page = user.page;
		await page.locator('#menu-icon-timeline').click();
		await page.mouse.wheel(0, 5000);
		await page.locator('#menu-icon-calendar').click();
		const previous = page.locator('.calendar-header .previous-button button');
		for (let i = 0; i < 4; i++) {
			await previous.click();
			await page.waitForTimeout(400);
		}
		const fromV1 = (await user.exportBackup()).json;
		check('V1: days', diffDocs('days', RICH_V2.backup.days, fromV1.days));
		check('V1: symptoms', diffDocs('symptoms', RICH_V2.backup.symptoms, fromV1.symptoms));

		// The V2 again: the custom types were kept in their database, the settings of the V2 in the settings
		await user.installVersion('v2');
		const end = await user.waitForStableData(d => d.customTypes.length === CUSTOM_TYPES.length);
		check('days documents', diffDocs('days', start.days, end.days));
		check('custom types documents', diffDocs('customTypes', start.customTypes, end.customTypes));
		const fromV2 = (await user.exportBackup()).json;
		check('V2: days', diffDocs('days', RICH_V2.backup.days, fromV2.days));
		check('V2: custom types', diffDocs('customTypes', RICH_V2.backup.customTypes, fromV2.customTypes, { idField: 'key' }));
		// The settings restored by the import of the backup, then kept through the V1
		expect.soft(fromV2.settings).toMatchObject(pick(RICH_V2.backup.settings,
			['darkMode', 'uiVersion', 'sleepChartMode', 'landscapeMode', 'eventColors', 'language', 'targetSymptomKey']));
		check('settings documents', diff(start.settings[0], { ...end.settings[0], _rev: start.settings[0]._rev }));
		await expect(page.locator('body')).toHaveClass(/dark-theme/);
	});
});
