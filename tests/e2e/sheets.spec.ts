import { test, expect, TODAY } from '../support/app';

// Every bottom sheet has a cross at the top right: it closes the sheet without doing anything
test.describe('Bottom sheets', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
	});

	test('the sheets of the timeline', async ({ app, page }) => {
		const sheets = page.locator('mat-bottom-sheet-container');
		const closeWithCross = async (sheetClass: string) => {
			await page.locator(`${sheetClass} .sheet-close-button`).click();
			await expect(sheets).toHaveCount(0);
		};

		// Menu of the event types
		await app.dayCard().locator('.add-event').click();
		await expect(page.locator('.add-event-menu .title')).toHaveText('Ajouter');
		await closeWithCross('.add-event-menu');

		// Details of an event, and the confirmation of its deletion
		const row = app.eventRows(TODAY, 'med');
		await row.click();
		await closeWithCross('app-dialog-show-event');
		await row.click();
		await page.locator('.delete-button').click();
		await closeWithCross('.delete-timeline-event');
		await expect(row).toHaveCount(1);
	});

	test('the sheets of the manage pages', async ({ app, page }) => {
		const sheets = page.locator('mat-bottom-sheet-container');
		await app.goToManage('med');
		const item = page.locator('.manage-item');

		// Statistics and history: the cross of the deletion confirmation goes back to the history
		await item.locator('.manage-item-actions button').nth(0).click();
		const history = page.locator('.occurrence-history');
		await history.locator('.list-tab').click();
		await history.locator('.occurrence-delete').click();
		await page.locator('.delete-event .sheet-close-button').click();
		await expect(history.locator('.occurrence-item')).toHaveCount(1);
		await history.locator('.sheet-close-button').click();
		await expect(sheets).toHaveCount(0);

		// Deletion of a medication
		await item.locator('.manage-item-actions button').nth(2).click();
		await page.locator('.delete-overview .sheet-close-button').click();
		await expect(sheets).toHaveCount(0);
		await expect(item).toHaveCount(1);

		// Deletion of a symptom
		await app.goToManage('symptomLog');
		await page.locator('.symptom-card', { hasText: 'Tête' }).locator('.delete-btn').click();
		await page.locator('.delete-symptom .sheet-close-button').click();
		await expect(sheets).toHaveCount(0);
		await expect(page.locator('.symptom-card', { hasText: 'Tête' })).toBeVisible();
	});

	test('the sheets of the settings', async ({ app, page }) => {
		const sheets = page.locator('mat-bottom-sheet-container');
		const { content } = await app.exportBackup();

		// PDF report
		await page.locator('mat-list-option', { hasText: 'Exporter en PDF' }).click();
		await page.locator('.export-pdf .sheet-close-button').click();
		await expect(sheets).toHaveCount(0);
		await expect(page).toHaveURL(/#\/settings$/);

		// Import, its confirmation then an invalid file
		await app.importBackup({ name: 'backup.json', mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify(content)) });
		await page.locator('.import-confirm .sheet-close-button').click();
		await expect(sheets).toHaveCount(0);
		await app.importBackup({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
		await page.locator('.import-error .sheet-close-button').click();
		await expect(sheets).toHaveCount(0);

		// Help
		await page.locator('.help-container', { hasText: 'Pourquoi les sauvegardes sont-elles manuelles' }).click();
		await page.locator('.bottom-sheet-container.info .sheet-close-button').click();
		await expect(sheets).toHaveCount(0);

		// Forced load of a backup, in the advanced settings
		await app.goToSettings('Personnalisation');
		await app.setToggle('Afficher les paramètres avancés', true);
		await app.settingsPanel('Avancé').locator('mat-expansion-panel-header').first().click();
		await page.locator('mat-list-option', { hasText: 'Forcer le chargement' }).click();
		await page.locator('.force-load-warning .sheet-close-button').click();
		await expect(sheets).toHaveCount(0);

		// Nothing was imported or changed
		await app.goToTimeline();
		await expect(app.eventRows(TODAY, 'med')).toHaveCount(1);
	});
});
