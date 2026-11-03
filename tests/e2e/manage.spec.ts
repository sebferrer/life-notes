import { test, expect, TODAY, YESTERDAY } from '../support/app';

test.describe('Manage menu', () => {

	test('opens the four lists', async ({ app, page }) => {
		await app.start();
		await app.goToManage();
		await expect(page.locator('.manage-tile')).toHaveText([/Symptômes/, /Médicaments/, /Notes/, /Sport/]);
		for (const [tile, route] of [['symptomLog', 'symptoms'], ['med', 'meds'], ['log', 'logs'], ['sport', 'sports']]) {
			await app.goToManage(tile as any);
			await expect(page).toHaveURL(new RegExp(`#/${route}$`));
		}
	});

	test('empty lists explain how to fill them', async ({ app, page }) => {
		await app.start();
		await app.goToManage('med');
		await expect(page.locator('.manage-list-empty')).toContainText("Il n'y a pas de médicament enregistré ici");
	});

	test.describe('with entries', () => {

		test.beforeEach(async ({ app }) => {
			await app.start();
			await app.addSymptom('Tête');
			await app.targetSymptom('Tête');
			await app.goToTimeline();
			await app.addEvent('med', { key: 'Doliprane', quantity: '1000' }, YESTERDAY);
			await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
			await app.addEvent('log', { key: 'Mauvaise nuit' });
			await app.addEvent('sport', { key: 'Course à pied' });
		});

		test('medications are listed with their dose, count and last date', async ({ app, page }) => {
			await app.goToManage('med');
			const item = page.locator('.manage-item');
			await expect(item).toHaveCount(1);
			await expect(item.locator('.manage-item-title')).toHaveText('Doliprane');
			await expect(item.locator('.manage-item-meta').first()).toContainText('1000 mg');
			await expect(item.locator('.manage-item-meta').first()).toContainText('2 fois');
			await expect(item.locator('.manage-item-meta').nth(1)).toHaveText('Dernière fois le 18 mars 2026');
		});

		test('the history lists every entry', async ({ app, page }) => {
			await app.goToManage('med');
			await page.locator('.manage-item-actions button').nth(0).click();
			await expect(page.locator('.occurrence-history .occurrence-item')).toHaveCount(2);
		});

		test('a renamed medication is renamed in the timeline too', async ({ app, page }) => {
			await app.goToManage('med');
			await page.locator('.manage-item-actions button').nth(1).click();
			const sheet = page.locator('.edit-med');
			await sheet.locator('input').first().fill('Paracétamol');
			await sheet.locator('.confirm-button').click();
			await expect(page.locator('.manage-item-title')).toHaveText('Paracétamol');
			await app.goToTimeline();
			await expect(app.eventRows(TODAY, 'med').locator('.event-card-title')).toHaveText('Paracétamol');
		});

		test('a deleted medication disappears from the timeline too', async ({ app, page }) => {
			await app.goToManage('med');
			await page.locator('.manage-item-actions button').nth(2).click();
			await page.locator('.delete-overview .delete-button').click();
			await expect(page.locator('.manage-list-empty')).toBeVisible();
			await app.goToTimeline();
			await expect(app.eventRows(TODAY, 'med')).toHaveCount(0);
			await expect(app.eventRows(YESTERDAY, 'med')).toHaveCount(0);
			await expect(app.eventRows(TODAY, 'log')).toHaveCount(1);
		});

		test('notes and sports have their own list', async ({ app, page }) => {
			await app.goToManage('log');
			await expect(page.locator('.manage-item-title')).toHaveText(['Mauvaise nuit']);
			await app.goToManage('sport');
			await expect(page.locator('.manage-item-title')).toHaveText(['Course à pied']);
		});

		test('the back arrow of a list returns to the manage menu', async ({ app, page }) => {
			await app.goToManage('sport');
			await page.locator('.manage-list-header button').click();
			await expect(page).toHaveURL(/#\/manage$/);
		});
	});
});
