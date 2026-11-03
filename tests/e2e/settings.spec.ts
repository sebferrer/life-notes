import { test, expect, TODAY } from '../support/app';

test.describe('Settings', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
	});

	test('dark mode switches to the dark theme and palette, and is remembered', async ({ app, page }) => {
		await app.goToSettings('Apparence');
		await app.setToggle('Mode sombre', true);
		await expect(page.locator('body')).toHaveClass(/dark-theme/);
		expect(await app.cssVariable('--color-event-symptomLog')).toBe('#FF7A90');

		await app.reload();
		await expect(page.locator('body')).toHaveClass(/dark-theme/);
		await app.goToSettings('Apparence');
		await app.setToggle('Mode sombre', false);
		await expect(page.locator('body')).not.toHaveClass(/dark-theme/);
		expect(await app.cssVariable('--color-event-symptomLog')).toBe('#FF3154');
	});

	test('event colors are customized for the current theme only, remembered and reset', async ({ app, page }) => {
		const card = page.locator('.palette-card');
		const setSymptomColor = (color: string) => card.locator('input[type=color]').first().evaluate((input: HTMLInputElement, c) => {
			input.value = c;
			input.dispatchEvent(new Event('change'));
		}, color);

		// Only the palette of the theme displayed is shown
		await app.goToSettings('Apparence');
		await expect(card).toHaveCount(1);
		await expect(card.locator('.palette-card-title')).toHaveText('Mode clair');
		await setSymptomColor('#123456');
		await expect.poll(() => app.cssVariable('--color-event-symptomLog')).toBe('#123456');
		// Very dark color: what is drawn on it turns light to stay readable
		expect(await app.cssVariable('--color-event-symptomLog-on')).toBe('#FFFFFF');

		await app.reload();
		expect(await app.cssVariable('--color-event-symptomLog')).toBe('#123456');

		// In dark mode, the dark palette replaces it, and is changed independently
		await app.goToSettings('Apparence');
		await app.setToggle('Mode sombre', true);
		await expect(card).toHaveCount(1);
		await expect(card.locator('.palette-card-title')).toHaveText('Mode sombre');
		expect(await app.cssVariable('--color-event-symptomLog')).toBe('#FF7A90');
		// The native color picker gives lowercase colors
		await setSymptomColor('#abcdef');
		await expect.poll(() => app.cssVariable('--color-event-symptomLog')).toBe('#abcdef');

		await app.setToggle('Mode sombre', false);
		expect(await app.cssVariable('--color-event-symptomLog')).toBe('#123456');
		await card.locator('.palette-reset').click();
		await expect.poll(() => app.cssVariable('--color-event-symptomLog')).toBe('#FF3154');

		// Resetting the light palette keeps the dark one
		await app.setToggle('Mode sombre', true);
		expect(await app.cssVariable('--color-event-symptomLog')).toBe('#abcdef');
	});

	test('the 12 hour format is used everywhere times are shown', async ({ app, page }) => {
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToSettings('Heure');
		await app.settingsPanel('Heure').locator('mat-select').click();
		await page.locator('mat-option', { hasText: '12' }).click();
		await app.goToTimeline();
		await app.addEvent('log', { key: 'Note' });
		await expect(app.eventRows(TODAY, 'log').locator('.rail-time')).toHaveText('10:30 AM');
	});

	test('the intensity palette changes the intensity colors', async ({ app, page }) => {
		const color = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-pain-5').trim());
		const before = await color();
		await app.goToSettings('Apparence');
		await page.locator('.pain-palette-preview').first().click();
		await expect.poll(color).not.toBe(before);
	});

	test('appearance, calendar and reminder settings are remembered', async ({ app }) => {
		await app.goToSettings('Apparence');
		await app.setToggle('Mode paysage', true);
		await app.setToggle('Affichage compact', true);
		await app.goToSettings('Personnalisation');
		await app.setToggle('Rappel quotidien', true);
		await app.setToggle('Rappel hebdomadaire', false);

		await app.reload();
		await app.goToSettings('Apparence');
		await expect(app.settingsToggle('Mode paysage').locator('input')).toBeChecked();
		await expect(app.settingsToggle('Affichage compact').locator('input')).toBeChecked();
		await app.goToSettings('Personnalisation');
		await expect(app.settingsToggle('Rappel quotidien').locator('input')).toBeChecked();
		await expect(app.settingsToggle('Rappel hebdomadaire').locator('input')).not.toBeChecked();
	});

	test('the language can be changed', async ({ app, page }) => {
		await app.goToSettings('Langue');
		await app.settingsPanel('Langue').locator('mat-select').click();
		await page.locator('mat-option', { hasText: 'Anglais' }).click();
		await expect(page.locator('#settings-container .title')).toHaveText('Settings');
	});

	test('the reason of the manual backups is explained', async ({ app, page }) => {
		await app.goToSettings('Importer / Exporter');
		await page.locator('.help-container', { hasText: 'Pourquoi les sauvegardes sont-elles manuelles' }).click();
		await expect(page.locator('mat-bottom-sheet-container')).toContainText('cloud');
	});

	test('the manual backup of the advanced settings is explained as a last resort, and generates the data',
		async ({ app, page }) => {
			await app.addSymptom('Tête');
			await app.goToSettings('Personnalisation');
			await app.setToggle('Afficher les paramètres avancés', true);
			const advanced = app.settingsPanel('Avancé');
			await advanced.locator('mat-expansion-panel-header').first().click();

			await advanced.locator('.manual-backup-info').click();
			await expect(page.locator('mat-bottom-sheet-container')).toContainText('dernier recours');
			await page.locator('.cdk-overlay-backdrop').last().click({ position: { x: 10, y: 10 } });
			// The info icon is in a header of the "Advanced" panel: it must not close it
			await expect(advanced).toHaveClass(/mat-expanded/);

			await advanced.locator('#generateBackupButton').click();
			const data = JSON.parse(await advanced.locator('textarea').inputValue());
			expect(data.symptoms.map(s => s.label)).toEqual(['Tête']);
		});

	test('the toolbar highlights the current section', async ({ app, page }) => {
		const active = page.locator('.nav-button.active');
		await app.goToTimeline();
		await expect(active).toHaveAttribute('id', 'menu-icon-timeline');
		await app.goToCalendar();
		await expect(active).toHaveAttribute('id', 'menu-icon-calendar');
		await app.goToManage('med');
		await expect(active).toHaveAttribute('id', 'menu-icon-manage');
		await app.goToSettings();
		await expect(active).toHaveAttribute('id', 'menu-icon-settings');
	});
});
