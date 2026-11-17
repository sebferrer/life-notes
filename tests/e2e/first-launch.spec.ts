import { test, expect } from '../support/app';

test.describe('First launch', () => {

	test('the chosen language is applied and remembered', async ({ app, page }) => {
		await app.start('fr');
		await app.goToSettings();
		await expect(page.locator('#settings-container .title')).toHaveText('Paramètres');

		// No language dialog anymore after a restart
		await page.reload();
		await expect(page.locator('#menu-icon-settings')).toBeVisible();
		await expect(page.locator('.language-label')).toHaveCount(0);
		await app.goToSettings();
		await expect(page.locator('#settings-container .title')).toHaveText('Paramètres');
	});

	test('the app can be used in English', async ({ app, page }) => {
		await app.start('en');
		await app.goToSettings();
		await expect(page.locator('#settings-container .title')).toHaveText('Settings');
		await app.goToManage();
		await expect(page.locator('.manage-tile.med')).toContainText('Medicines');
	});

	test('the settings written at first launch are all saved', async ({ app }) => {
		await app.start('fr');
		// The time format and the date of the backup reminder are written at the same time at first launch:
		// one of them used to be lost by a write conflict
		await app.addSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('log', { key: 'Note' });
		const { content } = await app.exportBackup();
		expect(content.settings.timeFormat).toBe('eu');
		expect(content.settings.lastWeeklyReminder).toBeGreaterThan(0);
		expect(content.settings.language).toBe('fr');
		expect(content.settings.firstStart).toBe(false);
	});

	test('a symptom is required before tracking: the symptom chip explains it', async ({ app, page }) => {
		await app.start('fr');
		await page.locator('#menu-icon-target-symptom').click();
		await expect(page.locator('mat-dialog-container')).toContainText('Aucun symptôme');
	});
});
