import { test, expect, TODAY, YESTERDAY, shiftDate } from '../support/app';

test.describe('Symptoms', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
	});

	test('are listed alphabetically, in the manage page and in the toolbar menu', async ({ app, page }) => {
		for (const label of ['Ventre', 'Allergie', 'Tête']) {
			await app.addSymptom(label);
		}
		await expect(page.locator('.symptom-card:not(.add-card) .symptom-label')).toHaveText(['Allergie', 'Tête', 'Ventre']);
		await page.locator('#menu-icon-target-symptom').click();
		await expect(page.locator('.mat-menu-item')).toHaveText(['Allergie', 'Tête', 'Ventre']);
	});

	test('the toolbar switches the tracked symptom, the default one of the settings comes back at restart',
		async ({ app, page }) => {
			const chip = page.locator('#menu-icon-target-symptom .targetSymptomKey');
			// The first symptom becomes the default one
			await app.addSymptom('Tête');
			await app.addSymptom('Ventre');
			await app.targetSymptom('Ventre');
			await app.reload();
			await expect(chip).toHaveText('Tête');

			await app.goToSettings('Symptômes');
			await app.settingsPanel('Symptômes').locator('mat-select').first().click();
			await page.locator('mat-option', { hasText: 'Ventre' }).click();
			await expect(chip).toHaveText('Ventre');
			await app.reload();
			await expect(chip).toHaveText('Ventre');
		});

	test('show their entries', async ({ app, page }) => {
		await app.addSymptom('Tête');
		await app.addSymptom('Ventre');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('symptomLog', { detail: 'Côté gauche' });
		await app.goToManage('symptomLog');

		const head = page.locator('.symptom-card', { hasText: 'Tête' });
		await expect(head.locator('.manage-item-meta')).toHaveText(['1 fois', 'Dernière fois le 18 mars 2026']);
		// No tag for the symptom shown in the toolbar
		await expect(head.locator('.manage-item-tag')).toHaveCount(0);
		const stomach = page.locator('.symptom-card', { hasText: 'Ventre' });
		await expect(stomach.locator('.manage-item-meta')).toHaveText('Pas encore de saisie');

		await page.locator('.manage-list-header button[routerlink="/manage"]').click();
		await expect(page).toHaveURL(/#\/manage$/);
	});

	test('can be renamed', async ({ app, page }) => {
		await app.addSymptom('Tête');
		await page.locator('.symptom-card', { hasText: 'Tête' }).locator('.edit-btn').click();
		const sheet = page.locator('.add-symptom');
		await sheet.locator('input[matinput]').fill('Migraine');
		await sheet.locator('.confirm-button').click();
		await expect(page.locator('.symptom-card:not(.add-card) .symptom-label')).toHaveText(['Migraine']);
	});

	test('can be deleted after confirmation', async ({ app, page }) => {
		await app.addSymptom('Tête');
		await app.addSymptom('Ventre');
		const card = page.locator('.symptom-card', { hasText: 'Tête' });

		await card.locator('.delete-btn').click();
		await page.locator('.delete-symptom button', { hasText: 'Non' }).last().click();
		await expect(card).toBeVisible();

		await card.locator('.delete-btn').click();
		// The first sheet may still be closing
		await page.locator('.delete-symptom button', { hasText: 'Oui' }).last().click();
		await expect(page.locator('.symptom-card:not(.add-card) .symptom-label')).toHaveText(['Ventre']);
	});

	test('add and edit sheets only close with their close or Cancel button', async ({ app, page }) => {
		await app.goToManage('symptomLog');
		await page.locator('.add-card').click();
		const sheet = page.locator('.add-symptom');
		await expect(sheet).toBeVisible();
		// A tap outside must not lose an ongoing edition
		await page.locator('.cdk-overlay-backdrop').click({ position: { x: 10, y: 10 } });
		await expect(sheet).toBeVisible();
		await sheet.locator('.sheet-close-button').click();
		await expect(sheet).toBeHidden();

		// Cancel, next to Add: nothing is created
		await page.locator('.add-card').click();
		await sheet.locator('input[matinput]').fill('Dos');
		await expect(sheet.locator('.cancel-button')).toHaveText('Annuler');
		await sheet.locator('.cancel-button').click();
		await expect(sheet).toBeHidden();
		await expect(page.locator('.symptom-card', { hasText: 'Dos' })).toHaveCount(0);
	});
});

// High values are the good ones (e.g. a mood): the intensity colors are reversed for this symptom only
test.describe('Inverted intensity scale', () => {

	const GREEN = 'rgb(138, 245, 156)';
	const DARK_RED = 'rgb(178, 34, 34)';

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.addSymptom('Humeur', { invertedScale: true });
	});

	test('is chosen in the symptom sheet, and shown in the list', async ({ app, page }) => {
		const card = (label: string) => page.locator('.symptom-card', { hasText: label });
		// An icon, explained on tap
		const tag = card('Humeur').locator('.inverted-scale-tag');
		await expect(tag).toHaveAttribute('aria-label', 'Échelle inversée');
		await expect(tag.locator('mat-icon')).toHaveText('swap_vert');
		await expect(card('Tête').locator('.inverted-scale-tag')).toHaveCount(0);
		await tag.click();
		await expect(page.locator('.mat-tooltip')).toHaveText(
			'Échelle inversée : les valeurs hautes sont les bonnes, comme pour l\'humeur');
		await page.mouse.move(0, 0);
		await expect(page.locator('.mat-tooltip')).toHaveCount(0, { timeout: 6000 });

		// The preview of the colors follows the toggle
		await card('Humeur').locator('.edit-btn').click();
		const sheet = page.locator('.add-symptom');
		const toggle = sheet.locator('.inverted-scale-toggle');
		const colors = sheet.locator('.scale-preview .scale-color');
		await expect(toggle).toHaveClass(/mat-checked/);
		await expect(sheet.locator('.scale-preview .scale-end')).toHaveText(['0', '10']);
		await expect(colors.first()).toHaveCSS('background-color', DARK_RED);
		await expect(colors.last()).toHaveCSS('background-color', GREEN);
		await toggle.locator('label').click();
		await expect(colors.first()).toHaveCSS('background-color', GREEN);
		// Not saved
		await sheet.locator('.sheet-close-button').click();
		await expect(sheet).toBeHidden();
		await card('Humeur').locator('.edit-btn').click();
		await expect(toggle).toHaveClass(/mat-checked/);
		await sheet.locator('.sheet-close-button').click();
		await expect(sheet).toBeHidden();

		// Changed on another symptom, kept after a restart
		await card('Tête').locator('.edit-btn').click();
		await expect(toggle).not.toHaveClass(/mat-checked/);
		await toggle.locator('label').click();
		await sheet.locator('.confirm-button').click();
		await expect(card('Tête').locator('.inverted-scale-tag')).toBeVisible();
		await app.reload();
		await app.goToManage('symptomLog');
		await expect(card('Tête').locator('.inverted-scale-tag')).toBeVisible();
		await card('Tête').locator('.edit-btn').click();
		await expect(toggle).toHaveClass(/mat-checked/);
		await toggle.locator('label').click();
		await sheet.locator('.confirm-button').click();
		await expect(card('Tête').locator('.inverted-scale-tag')).toHaveCount(0);
		await expect(card('Humeur').locator('.inverted-scale-tag')).toBeVisible();
	});

	test('reverses the colors of this symptom only, everywhere', async ({ app, page }) => {
		const twoDaysAgo = shiftDate(TODAY, -2);
		await app.targetSymptom('Humeur');
		await app.goToTimeline();
		await app.setDayIntensity(10);
		await app.setDayIntensity(0, YESTERDAY);
		// Timeline: the best mood is green, the worst dark red, and a day without value has no color
		const dot = (date: string) => app.dayCard(date).locator('.day-card-overview mat-icon');
		await expect(dot(TODAY)).toHaveClass(/color-default/);
		await expect(dot(YESTERDAY)).toHaveClass(/color-pain-5/);
		await expect(dot(twoDaysAgo)).toHaveClass(/color-none/);

		// Calendar
		await app.goToCalendar();
		const cell = (date: string) => page.locator('.day-cell:not(.empty)').nth(Number(date.slice(8)) - 1);
		await expect(cell(TODAY)).toHaveClass(/color-default/);
		await expect(cell(YESTERDAY)).toHaveClass(/color-pain-5/);
		await expect(cell(twoDaysAgo)).toHaveClass(/color-none/);

		// Year in Pixels, its legend reversed: a day without value is neutral, not the worst mood
		await page.locator('.year-in-pixels-button').click();
		await expect(page.locator(`#pixel-${TODAY}`)).toHaveClass(/color-default/);
		await expect(page.locator(`#pixel-${YESTERDAY}`)).toHaveClass(/color-pain-5/);
		await expect(page.locator(`#pixel-${twoDaysAgo}`)).toHaveClass(/no-data/);
		await expect(page.locator('.legend-item').first()).toHaveText('Pas de donnée');
		const swatches = page.locator('.legend-item .swatch');
		await expect(swatches.nth(1)).toHaveClass(/color-pain-5/);
		await expect(swatches.last()).toHaveClass(/color-default/);

		// The other symptoms keep the usual scale: no value counts as no pain
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.setDayIntensity(10);
		await expect(dot(TODAY)).toHaveClass(/color-pain-5/);
		await expect(dot(twoDaysAgo)).toHaveClass(/color-default/);
		await app.goToCalendar();
		await expect(cell(TODAY)).toHaveClass(/color-pain-5/);
		await expect(cell(twoDaysAgo)).toHaveClass(/color-default/);

		// V1
		await app.targetSymptom('Humeur');
		await app.setUiVersion('V1');
		await app.goToTimeline();
		await expect(page.locator(`#day-${TODAY} .symptom-overview-icon`)).toHaveClass(/color-default/);
		await expect(page.locator(`#day-${YESTERDAY} .symptom-overview-icon`)).toHaveClass(/color-pain-5/);
		await app.goToCalendar();
		const tile = (date: string) => page.locator('.classic-calendar .grid-tile:not(.empty-tile)')
			.nth(Number(date.slice(8)) - 1);
		await expect(tile(TODAY)).toHaveClass(/color-default/);
		await expect(tile(YESTERDAY)).toHaveClass(/color-pain-5/);
		await expect(tile(twoDaysAgo)).toHaveClass(/color-none/);

		// PDF report: each symptom with its own scale
		await app.goToSettings('Importer / Exporter');
		await page.locator('mat-list-option', { hasText: 'Exporter en PDF' }).click();
		await page.locator('.export-pdf .confirm-button').click();
		await expect(page).toHaveURL(/#\/monthlyreport\/2026-0?3$/);
		const reportTile = (label: string, date: string) => page.locator('.sympmtom-container', { hasText: label })
			.locator('.grid-tile').nth(Number(date.slice(8)) - 1);
		await expect(reportTile('Humeur', TODAY)).toHaveClass(/color-default/);
		await expect(reportTile('Humeur', YESTERDAY)).toHaveClass(/color-pain-5/);
		await expect(reportTile('Humeur', twoDaysAgo)).toHaveClass(/color-none/);
		await expect(reportTile('Tête', TODAY)).toHaveClass(/color-pain-5/);
		await expect(reportTile('Tête', twoDaysAgo)).toHaveClass(/color-default/);
	});

	test('a value of 0 is data like the others', async ({ app, page }) => {
		// 0 is the worst mood, not an absence of symptom
		await app.targetSymptom('Humeur');
		await app.goToTimeline();
		await app.setDayIntensity(0);
		await app.goToManage('symptomLog');
		await expect(page.locator('.symptom-card', { hasText: 'Humeur' }).locator('.manage-item-meta'))
			.toContainText('18 mars 2026');
	});

	test('is kept in the backups', async ({ app }) => {
		// No backup without any day
		await app.goToTimeline();
		await app.addEvent('log', { key: 'Note' });
		const { content } = await app.exportBackup();
		const symptom = (key: string) => content.symptoms.find((s: any) => s.key === key);
		expect(symptom('humeur').invertedScale).toBe(true);
		expect(symptom('tete').invertedScale).toBe(false);
	});
});
