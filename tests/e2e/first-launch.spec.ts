import { test, expect } from '../support/app';
import { readFileSync } from 'fs';
import { LANGUAGES } from '../../src/app/models/language.model';

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

	test('a new user sees the welcome then the tutorial notice, without the update dialog', async ({ page }) => {
		await page.goto('/');
		await page.locator('.language-label', { hasText: 'Français' }).click();
		const welcome = page.locator('app-dialog-info', { hasText: 'Avant de commencer' });
		await expect(welcome).toBeVisible();
		await welcome.locator('button[mat-dialog-close]').click();
		await expect(page.locator('app-dialog-tutorial-notice')).toBeVisible();
		await expect(page.locator('mat-dialog-container', { hasText: 'Life-Notes mis à jour' })).toHaveCount(0);
		await page.locator('app-dialog-tutorial-notice button[mat-dialog-close]:not([routerlink])').click();
		// Nothing else after the tutorial notice
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);
		await page.waitForTimeout(1000);
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);
	});

	test('a symptom is required before tracking: the symptom chip explains it', async ({ app, page }) => {
		await app.start('fr');
		await page.locator('#menu-icon-target-symptom').click();
		await expect(page.locator('mat-dialog-container')).toContainText('Aucun symptôme');
	});

	for (const language of LANGUAGES.filter(l => l.code !== 'fr' && l.code !== 'en')) {
		test(`the app can be used in ${language.name}`, async ({ app, page }) => {
			const texts = JSON.parse(readFileSync(`src/assets/i18n/${language.code}.json`, 'utf-8'));
			await app.start(language.code);
			// Language of the page: Japanese shapes of the characters, pronunciation of the screen readers
			await expect(page.locator('html')).toHaveAttribute('lang', language.code);
			await app.goToSettings();
			await expect(page.locator('#settings-container .title')).toHaveText(texts.SETTINGS_TITLE);
			await app.goToManage();
			await expect(page.locator('.manage-tile.med')).toContainText(texts.MANAGE_MEDS);
			// Chosen language remembered after a restart
			await page.reload();
			await app.goToSettings();
			await expect(page.locator('#settings-container .title')).toHaveText(texts.SETTINGS_TITLE);
		});
	}
});
