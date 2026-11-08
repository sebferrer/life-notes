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

		// Menu of the event types, in the order of the manage menu
		await app.dayCard().locator('.add-event').click();
		await expect(page.locator('.add-event-menu .title')).toHaveText('Ajouter');
		await expect(page.locator('.add-event-menu .add-option-label')).toHaveText(['Symptôme', 'Repas', 'Médicament',
			'Sport', 'Note']);
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

	// Next to Add / Edit, a Cancel button closes the sheet without saving
	test('the add and edit sheets have a Cancel button', async ({ app, page }) => {
		const sheets = page.locator('mat-bottom-sheet-container');
		const cancel = async (sheetClass: string) => {
			const actions = page.locator(`${sheetClass} .actions`);
			await expect(actions.locator('button')).toHaveCount(2);
			await expect(actions.locator('button').first()).toHaveText('Annuler');
			await actions.locator('.cancel-button').click();
			await expect(sheets).toHaveCount(0);
		};

		// Adding an event
		await app.dayCard().locator('.add-event').click();
		await app.addMenuEntry('Médicament').click();
		await page.locator('.bottom-sheet-container.med .form-fields-group input').first().fill('Ibuprofène');
		await page.keyboard.press('Escape');
		await cancel('.bottom-sheet-container.med');
		await expect(app.eventRows(TODAY, 'med')).toHaveCount(1);

		// Intensity of the day
		await app.dayCard().locator('.day-card-overview').click();
		await cancel('.edit-symptom-overview');

		// A medication of the manage page
		await app.goToManage('med');
		await page.locator('.manage-item-actions button').nth(1).click();
		await page.locator('.edit-med input').first().fill('Ibuprofène');
		await cancel('.edit-med');
		await expect(page.locator('.manage-item', { hasText: 'Doliprane' })).toHaveCount(1);

		// A new event type
		await app.goToManage();
		await page.locator('.manage-tile.add-tile').click();
		await cancel('.edit-custom-type');
	});

	// The names already entered are suggested under the field: what was typed in bold, the dose of a medication apart
	test('the suggested names', async ({ app, page }) => {
		await app.addEvent('med', { key: 'Dafalgan', quantity: '500' });
		await app.dayCard().locator('.add-event').click();
		await app.addMenuEntry('Médicament').click();
		const sheet = page.locator('.bottom-sheet-container.med');
		const input = sheet.locator('.form-fields-group input').first();
		await input.fill('doli');
		const panel = page.locator('.mat-autocomplete-panel.suggestions-panel.med');
		const option = panel.locator('mat-option');
		await expect(option).toHaveCount(1);
		await expect(option.locator('.suggestion-name')).toHaveText('Doliprane');
		await expect(option.locator('.match')).toHaveText('Doli');
		await expect(option.locator('.suggestion-badge')).toHaveText('1000 mg');
		// As wide as the box of the field, right under it
		const box = await sheet.locator('.form-fields-group .field-input-box').first().boundingBox();
		const card = await panel.boundingBox();
		expect(Math.abs(card.x - box.x)).toBeLessThan(2);
		expect(Math.abs(card.width - box.width)).toBeLessThan(2);
		expect(card.y).toBeGreaterThan(box.y + box.height);
		// Its name and its dose
		await option.click();
		await expect(input).toHaveValue('Doliprane');
		await expect(sheet.locator('.form-fields-group input').nth(1)).toHaveValue('1000');
	});

	// The sheets of an event (details, add) have global styles: they must not change the other sheets
	test('the sheets of an event leave the look of the other sheets alone', async ({ app, page }) => {
		const editorLook = async () => {
			await app.goToManage();
			await page.locator('.manage-tile.add-tile').click();
			const editor = page.locator('.edit-custom-type');
			const look = await editor.evaluate(element => {
				const style = (selector: string) => getComputedStyle(element.querySelector(selector));
				return {
					bubble: style('.icon-bubble').backgroundColor,
					gap: getComputedStyle(element).gap,
					title: style('.main-title').fontSize,
					font: getComputedStyle(element).fontFamily
				};
			});
			await editor.locator('.cancel-button').click();
			await expect(editor).toHaveCount(0);
			return look;
		};
		const before = await editorLook();
		expect(before.bubble).not.toBe('rgba(0, 0, 0, 0)');

		await app.goToTimeline();
		await app.eventRows(TODAY, 'med').click();
		await page.locator('app-dialog-show-event .sheet-close-button').click();
		await app.addEvent('log', { key: 'Note' });
		expect(await editorLook()).toEqual(before);
	});

	test('the title of the sheet adding an event holds on one line on a phone', async ({ app, page }) => {
		await page.setViewportSize({ width: 360, height: 640 });
		// Even after the sheet of the details, whose styles have the same selectors
		await app.eventRows(TODAY, 'med').click();
		await page.locator('app-dialog-show-event .sheet-close-button').click();
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
		await app.dayCard().locator('.add-event').click();
		await app.addMenuEntry('Symptôme').click();
		const title = page.locator('.bottom-sheet-container.symptomLog .main-title');
		await expect(title).toHaveText('Ajouter Symptôme');
		const { height, lineHeight } = await title.evaluate(element => ({
			height: element.getBoundingClientRect().height,
			lineHeight: parseFloat(getComputedStyle(element).lineHeight)
		}));
		expect(height).toBeLessThan(lineHeight * 1.5);
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
