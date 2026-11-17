import { readFileSync } from 'fs';
import { test, expect, App } from '../support/app';

// The data of the users of the former versions, still read by the current one. backup-0.3.7.json: a backup made
// by the version 0.3.7 (the one published before the V2) of September and October 2026: entries imported in it,
// and others typed in its interface on October 28 (a symptom "Vertiges", a migraine "Saisi avec la 0.3.7", a med,
// a note, a meal, the intensity of the day, the bedtime).
const BACKUP = readFileSync('tests/fixtures/backup-0.3.7.json', 'utf-8');
const OLD = JSON.parse(BACKUP);
const DAY = '2026-10-28';
const NOW = new Date(`${DAY}T20:45:00`);
// Everything a day of the version 0.3.7 holds
const DAY_FIELDS = ['date', 'symptomOverviews', 'symptoms', 'logs', 'meds', 'meals', 'wakeUp', 'goToBed'];

async function importOldBackup(app: App): Promise<void> {
	await app.importBackup({ name: 'life-notes-save.json', mimeType: 'application/json', buffer: Buffer.from(BACKUP) });
	await app.page.locator('.import-confirm .confirm-button').click();
	await app.afterImport(async () => {
		await expect(app.eventRows(DAY)).toHaveCount(9, { timeout: 1000 });
	});
}

test.describe('Data of the former versions', () => {

	// The day of the backup (after the clock of the tests, set with the app)
	test.beforeEach(async ({ app, page }) => {
		await page.clock.setFixedTime(NOW);
	});

	test('a backup of the version 0.3.7 brings back all its data', async ({ app, page }) => {
		await app.start();
		await importOldBackup(app);

		const day = app.dayCard(DAY);
		for (const text of ['Saisi avec la 0.3.7', 'Ibuprofène', 'Note de la 0.3.7', 'Soupe de légumes', 'Sumatriptan']) {
			await expect(day).toContainText(text);
		}
		await expect(day.locator('.sleep-row.goToBed .rail-time')).toHaveText('20:30');
		await app.goToCalendar();
		await expect(page.locator('.day-cell.today')).toHaveClass(/color-pain-/);
		await expect(page.locator('app-intensity-ring .ring-name')).toContainText(['Migraine']);
		await app.goToManage('symptomLog');
		await expect(page.locator('.symptom-card .symptom-label')).toContainText(['Migraine', 'Vertiges']);

		// Saved again as it was
		const { content } = await app.exportBackup();
		const days = new Map(content.days.map(d => [d.date, d]));
		for (const oldDay of OLD.days) {
			for (const field of DAY_FIELDS) {
				expect.soft((days.get(oldDay.date) as any)?.[field], `${oldDay.date} ${field}`).toEqual(oldDay[field]);
			}
		}
		expect(content.symptoms.map(s => [s.key, s.label])).toEqual(OLD.symptoms.map(s => [s.key, s.label]));
		expect(content.settings).toMatchObject({ language: 'fr', targetSymptomKey: 'migraine' });
	});

	test('a phone with the settings of a 2025 version gets the V1 and the defaults of then', async ({ app, page }) => {
		// Its days and symptoms as stored (their shape hasn't changed since), then the settings of a 2025 version:
		// five fields
		await app.start();
		await importOldBackup(app);
		await page.addScriptTag({ path: 'node_modules/pouchdb/dist/pouchdb.min.js' });
		await page.evaluate(async () => {
			const db = new (window as any).PouchDB('settings');
			const { _rev } = await db.get('settings');
			await db.put({
				_id: 'settings', _rev, targetSymptomKey: 'migraine', language: 'fr', timeFormat: 'eu', firstStart: false,
				lastInstall: '20250601120000'
			});
		});
		await page.reload();

		// Told about the update and the V2 in a single dialog (and reminded of the backups, never done); the V1 kept
		const popup = page.locator('app-dialog-new-ui');
		await expect(popup).toContainText('Life-Notes mis à jour');
		await expect(popup).toContainText('propose une nouvelle interface');
		await expect(page.locator('app-dialog-info', { hasText: 'Life-Notes mis à jour' })).toHaveCount(0);
		await expect(async () => {
			// The reminder of the backups may be on top: the dialog on top, not one playing its closing animation
			const close = page.locator('app-dialog-info button[mat-dialog-close]').filter({ visible: true }).last();
			if (await close.count() > 0) {
				await close.click({ timeout: 1000 }).catch(() => undefined);
			}
			await popup.locator('button', { hasText: 'Plus tard' }).click({ timeout: 1000 });
			await expect(popup).toHaveCount(0, { timeout: 1000 });
		}).toPass({ timeout: 15_000 });
		// The next one-time dialogs of a former user
		await app.closeDialogs();
		await page.locator('#menu-icon-timeline').click();
		await expect(page.locator(`#day-${DAY}`)).toContainText('Note de la 0.3.7');
		await expect(page.locator('.day-card')).toHaveCount(0);

		// The settings that didn't exist: their values for a former user
		const { content } = await app.exportBackup();
		expect(content.settings).toMatchObject({
			painScale: 5, autoCalculateOverview: false, uiVersion: 'v1', newUiPopupSeen: true, darkMode: false,
			calendarBlockView: false, painPalette: '2', timePicker: 'material', sleepChartMode: 'bars'
		});
		expect(content.days.length).toBe(OLD.days.length);
	});
});
