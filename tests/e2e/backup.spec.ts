import { test, expect, App, NOW, TODAY } from '../support/app';

function jsonFile(name: string, content: any) {
	return { name, mimeType: 'application/json', buffer: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)) };
}

test.describe('Backups', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
		await app.setDayIntensity(4);
	});

	test('a backup contains the days, the symptoms and the settings', async ({ app }) => {
		const { fileName, content } = await app.exportBackup();
		expect(fileName).toBe('life-notes-save-202603181030.json');
		expect(content.symptoms.map(s => s.label)).toEqual(['Tête']);
		const today = content.days.find(d => d.date === TODAY);
		// The dose is saved as typed
		expect(today.meds[0]).toMatchObject({ key: 'Doliprane', quantity: '1000' });
		expect(today.symptomOverviews[0].pain).toBeGreaterThan(0);
		expect(content.settings).toMatchObject({ language: 'fr', eventColors: expect.any(Object) });
	});

	test('importing a backup replaces the current data, after confirmation', async ({ app, page }) => {
		const { content } = await app.exportBackup();
		await app.goToTimeline();
		await app.addEvent('log', { key: 'Ajoutée après la sauvegarde' });

		// Declined: nothing changes
		await app.importBackup(jsonFile('backup.json', content));
		await page.locator('.import-confirm .cancel-button').click();
		await expect(page.locator('.import-confirm')).toHaveCount(0);
		await app.goToTimeline();
		await expect(app.eventRows(TODAY, 'log')).toHaveCount(1);

		await app.importBackup(jsonFile('backup.json', content));
		await page.locator('.import-confirm .confirm-button').click();
		await expect(page.locator('simple-snack-bar')).toContainText('Les données ont été importées avec succès');
		await app.afterImport(async () => {
			await expect(app.eventRows(TODAY, 'med').locator('.event-card-title')).toHaveText('Doliprane', { timeout: 1000 });
			await expect(app.eventRows(TODAY, 'log')).toHaveCount(0, { timeout: 1000 });
		});
	});

	test('a backup moves the data and the settings to another phone', async ({ app, browser }) => {
		await app.goToSettings('Apparence');
		await app.setToggle('Mode sombre', true);
		const { content } = await app.exportBackup();

		const otherPhone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
		const page = await otherPhone.newPage();
		await page.clock.setFixedTime(NOW);
		const other = new App(page);
		await other.start();
		await other.importBackup(jsonFile('backup.json', content));
		await page.locator('.import-confirm .confirm-button').click();
		await other.afterImport(async () => {
			await expect(other.eventRows(TODAY, 'med').locator('.event-card-title')).toHaveText('Doliprane', { timeout: 1000 });
		});
		await expect(page.locator('#menu-icon-target-symptom .targetSymptomKey')).toHaveText('Tête');
		await expect(page.locator('body')).toHaveClass(/dark-theme/);
		await otherPhone.close();
	});

	test('files that are not Life Notes backups are refused with an explanation', async ({ app, page }) => {
		const error = page.locator('.import-error');
		const cases: [any, string][] = [
			[{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }, 'Le fichier doit être un fichier .json.'],
			[jsonFile('broken.json', '{ "days": '), 'Les données ne sont pas au format attendu.'],
			[jsonFile('other.json', { foo: 'bar' }), 'Les données ne correspondent pas à un fichier de sauvegarde Life Notes.']
		];
		for (const [file, message] of cases) {
			await app.importBackup(file);
			await expect(error).toContainText(message);
			await error.locator('.confirm-button').click();
			await expect(error).toBeHidden();
		}
	});

	test('the PDF report of a month only shows the symptoms filled in that month', async ({ app, page }) => {
		await app.addSymptom('Ventre');
		await app.goToSettings('Importer / Exporter');
		await page.locator('mat-list-option', { hasText: 'Exporter en PDF' }).click();
		await page.locator('.export-pdf .confirm-button').click();
		await expect(page).toHaveURL(/#\/monthlyreport\/2026-0?3$/);
		// Hidden placeholders complete the layout of the report
		await expect(page.locator('.sympmtom-container label').filter({ hasText: /\S/ })).toHaveText(['Tête']);
		await expect(page.locator('.stats-container')).toContainText('Doliprane');
	});
});
