import { test, expect } from '../support/app';

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

	test('show their entries, and which one is tracked', async ({ app, page }) => {
		await app.addSymptom('Tête');
		await app.addSymptom('Ventre');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('symptomLog', { detail: 'Côté gauche' });
		await app.goToManage('symptomLog');

		const head = page.locator('.symptom-card', { hasText: 'Tête' });
		await expect(head.locator('.manage-item-tag')).toHaveText('Suivi');
		await expect(head.locator('.manage-item-meta')).toHaveText(['1 fois', 'Dernière fois le 18 mars 2026']);
		const stomach = page.locator('.symptom-card', { hasText: 'Ventre' });
		await expect(stomach.locator('.manage-item-tag')).toHaveCount(0);
		await expect(stomach.locator('.manage-item-meta')).toHaveText('Pas encore de saisie');

		await page.locator('.manage-list-header button').click();
		await expect(page).toHaveURL(/#\/manage$/);
	});

	test('can be renamed', async ({ app, page }) => {
		await app.addSymptom('Tête');
		await page.locator('.symptom-card', { hasText: 'Tête' }).locator('.edit-btn').click();
		const sheet = page.locator('.add-symptom');
		await sheet.locator('input').fill('Migraine');
		await sheet.locator('.actions button').click();
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

	test('add and edit sheets only close with their close button', async ({ app, page }) => {
		await app.goToManage('symptomLog');
		await page.locator('.add-card').click();
		const sheet = page.locator('.add-symptom');
		await expect(sheet).toBeVisible();
		// A tap outside must not lose an ongoing edition
		await page.locator('.cdk-overlay-backdrop').click({ position: { x: 10, y: 10 } });
		await expect(sheet).toBeVisible();
		await sheet.locator('.sheet-close-button').click();
		await expect(sheet).toBeHidden();
	});
});
