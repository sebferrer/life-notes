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
		const sheet = page.locator('.color-picker-sheet');
		// The code typed in the color picker, applied
		const setSymptomColor = async (color: string) => {
			await card.locator('.palette-swatch').first().click();
			await sheet.locator('.cp-hex-input').fill(color);
			await sheet.locator('.confirm-button').click();
			await expect(sheet).toBeHidden();
		};

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
		// Typed in lowercase, saved in uppercase as the default colors
		await setSymptomColor('#abcdef');
		await expect.poll(() => app.cssVariable('--color-event-symptomLog')).toBe('#ABCDEF');

		await app.setToggle('Mode sombre', false);
		expect(await app.cssVariable('--color-event-symptomLog')).toBe('#123456');
		await card.locator('.palette-reset').click();
		await expect.poll(() => app.cssVariable('--color-event-symptomLog')).toBe('#FF3154');

		// Resetting the light palette keeps the dark one
		await app.setToggle('Mode sombre', true);
		expect(await app.cssVariable('--color-event-symptomLog')).toBe('#ABCDEF');
	});

	test('the color picker starts from the current color, keeps it at hand and saves only when applied',
		async ({ app, page }) => {
			const card = page.locator('.palette-card');
			const sheet = page.locator('.color-picker-sheet');
			const code = sheet.locator('.cp-hex-input');
			// Drags from the middle of an element to a point given as fractions of its size
			const drag = async (selector: string, x: number, y: number) => {
				// Measured once it stands still: the sheet slides up when opened (a trial click only waits for that)
				await sheet.locator(selector).click({ trial: true });
				const box = await sheet.locator(selector).boundingBox();
				await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
				await page.mouse.down();
				await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 5 });
				await page.mouse.up();
			};

			await app.goToSettings('Apparence');
			await card.locator('.palette-swatch').first().click();
			await expect(code).toHaveValue('FF3154');
			// The default color of the symptoms is the first suggestion
			await expect(sheet.locator('.cp-swatch').first()).toHaveClass(/selected/);
			await expect(sheet.locator('.compare-initial')).toBeDisabled();

			// Saturation and brightness
			await drag('.cp-area', 0.3, 0.6);
			await expect(code).not.toHaveValue('FF3154');
			await expect(sheet.locator('.cp-swatch.selected')).toHaveCount(0);
			// The color the picker started from is one tap away
			await sheet.locator('.compare-initial').click();
			await expect(code).toHaveValue('FF3154');

			// Hue: blue at two thirds of the slider, saturation and brightness kept
			await drag('.cp-hue', 0.66, 0.5);
			const [r, g, b] = (await code.inputValue()).match(/../g).map(channel => parseInt(channel, 16));
			expect(b).toBe(255);
			expect(Math.max(r, g)).toBeLessThan(120);

			// Cancelled: nothing changes
			await sheet.locator('.cancel-button').click();
			await expect(sheet).toBeHidden();
			expect(await app.cssVariable('--color-event-symptomLog')).toBe('#FF3154');

			// A suggestion, applied: the picker then starts from it
			await card.locator('.palette-swatch').first().click();
			await expect(code).toHaveValue('FF3154');
			await sheet.locator('.cp-swatch').nth(1).click();
			await expect(code).toHaveValue('0096BF');
			await sheet.locator('.confirm-button').click();
			await expect.poll(() => app.cssVariable('--color-event-symptomLog')).toBe('#0096BF');
			await card.locator('.palette-swatch').first().click();
			await expect(code).toHaveValue('0096BF');

			// An incomplete code is ignored, a short one is completed
			await code.fill('12');
			await code.press('Enter');
			await expect(code).toHaveValue('0096BF');
			await code.fill('#f80');
			await code.press('Enter');
			await expect(code).toHaveValue('FF8800');
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

	test('the landscape mode is not offered for now', async ({ app }) => {
		await app.goToSettings('Apparence');
		await expect(app.settingsToggle('Mode sombre')).toBeVisible();
		await expect(app.settingsToggle('Mode paysage')).toHaveCount(0);
	});

	test('appearance, calendar and reminder settings are remembered', async ({ app }) => {
		await app.goToSettings('Apparence');
		await app.setToggle('Affichage compact', true);
		await app.goToSettings('Personnalisation');
		await app.setToggle('Rappel quotidien', true);
		await app.setToggle('Rappel hebdomadaire', false);

		await app.reload();
		await app.goToSettings('Apparence');
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

	// The "?" of the automatic overview: what it is, calculated (enabled) or entered by hand (disabled),
	// illustrated with the day of the version of the interface
	test('the help of the automatic overview', async ({ app, page }) => {
		const label = 'Calcul automatique du ressenti global';
		const openHelp = async () => {
			await app.goToSettings('Symptômes');
			await page.locator('.toggle-container', { hasText: label }).locator('.auto-overview-help-button').click();
			return page.locator('.auto-overview-help');
		};

		let help = await openHelp();
		await expect(help.locator('.title')).toHaveText(label);
		await expect(help.locator('.intro')).toContainText('pastille de couleur');
		const enabled = help.locator('.help-case.on');
		await expect(enabled.locator('.case-title')).toHaveText(/Activé/);
		await expect(enabled).toContainText('moyenne de leurs intensités');
		await expect(enabled.locator('.m-calc-formula')).toHaveText('(4 + 7) / 2 = 5,5');
		await expect(enabled.locator('.scene-auto-overview:not(.classic) .arrow-line')).toHaveCount(2);
		const disabled = help.locator('.help-case.off');
		await expect(disabled.locator('.case-title')).toHaveText(/Désactivé/);
		await expect(disabled).toContainText('vous devez le saisir vous-même');
		await expect(disabled.locator('.scene-day-overview')).toBeVisible();
		await help.locator('.sheet-close-button').click();
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
		// The "?" is next to the toggle, it doesn't change it (on by default for new users)
		await expect(app.settingsToggle(label).locator('input')).toBeChecked();

		// V1: its own day
		await app.setUiVersion('V1');
		help = await openHelp();
		await expect(help.locator('.intro')).toContainText('grand rond de couleur');
		await expect(help.locator('.help-case.on .scene-auto-overview.classic .arrow-line')).toHaveCount(2);
		await help.locator('.confirm-button').click();
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
	});
});
