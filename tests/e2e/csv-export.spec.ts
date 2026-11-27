import { test, expect, App, TODAY, YESTERDAY } from '../support/app';
import { Page } from '@playwright/test';

// Settings > Import / Export > Export as CSV: the file downloaded by the browser, as a spreadsheet reads it
async function download(page: Page, button: string): Promise<{ fileName: string, text: string }> {
	const [file] = await Promise.all([
		page.waitForEvent('download'),
		page.locator('.export-csv .actions button', { hasText: button }).click()
	]);
	const chunks: Buffer[] = [];
	for await (const chunk of await file.createReadStream()) {
		chunks.push(chunk as Buffer);
	}
	return { fileName: file.suggestedFilename(), text: Buffer.concat(chunks).toString('utf-8') };
}

async function openCsvSheet(app: App, page: Page): Promise<void> {
	await app.goToSettings('Importer / Exporter');
	await page.locator('mat-list-option, .data-action', { hasText: 'Exporter en CSV' }).click();
	await expect(page.locator('.export-csv')).toBeVisible();
}

test.describe('Export as CSV', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
	});

	test('one line per day or per entry, in the format of a French spreadsheet', async ({ app, page }) => {
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
		await app.addEvent('log', { key: 'Mauvaise nuit', detail: 'Réveillé deux fois' });
		await app.setDayIntensity(6);
		await app.setSleepTime('goToBed', '23:30', YESTERDAY);
		await app.setSleepTime('wakeUp', '07:00');
		await openCsvSheet(app, page);

		// One line per day, chosen by default
		const sheet = page.locator('.export-csv');
		await expect(sheet.locator('.csv-layout.selected')).toHaveClass(/days/);
		const days = await download(page, 'Enregistrer');
		expect(days.fileName).toMatch(/^life-notes-days-\d{12}\.csv$/);
		expect(days.text.startsWith('﻿')).toBe(true);
		const dayLines = days.text.slice(1).trim().split('\r\n');
		expect(dayLines[0]).toBe('Date;Réveil;Coucher;Sommeil (h);Tête (0-10);Doliprane (mg);Repas (nombre);Sport (nombre);'
			+ 'Notes (nombre)');
		expect(dayLines).toEqual([dayLines[0], `${YESTERDAY};;23:30;;;;;;`, `${TODAY};07:00;;7,5;6;1000;;;1`]);
		// Done: the button says it
		await expect(sheet.locator('.save-button')).toContainText('Enregistré');

		// One line per entry
		await sheet.locator('.csv-layout.events').click();
		await expect(sheet.locator('.save-button')).toContainText('Enregistrer');
		const events = await download(page, 'Enregistrer');
		expect(events.fileName).toMatch(/^life-notes-events-\d{12}\.csv$/);
		const eventLines = events.text.slice(1).trim().split('\r\n');
		expect(eventLines[0]).toBe('Date;Heure;Type;Nom;Intensité (0-10);Quantité;Unité;Détail');
		expect(eventLines).toContain(`${TODAY};;Intensité du jour;Tête;6;;;`);
		expect(eventLines).toContain(`${TODAY};07:00;Réveil;;;;;`);
		expect(eventLines).toContain(`${TODAY};10:30;Médicament;Doliprane;;1000;mg;`);
		expect(eventLines).toContain(`${TODAY};10:30;Note;Mauvaise nuit;;;;Réveillé deux fois`);
		expect(eventLines).toContain(`${YESTERDAY};23:30;Coucher;;;;;`);
	});

	test('with nothing logged yet, the sheet says so and exports nothing', async ({ app, page }) => {
		await openCsvSheet(app, page);
		await expect(page.locator('.export-csv .csv-message')).toHaveText(/Rien à exporter/);
		await expect(page.locator('.export-csv .save-button')).toBeDisabled();
		await expect(page.locator('.export-csv .share-button')).toBeDisabled();
	});

	test('in the V1 interface, it is the last entry of the list', async ({ app, page }) => {
		await app.goToTimeline();
		await app.addEvent('log', { key: 'Note' });
		await app.setUiVersion('V1');
		await app.goToSettings('Importer / Exporter');
		const entries = app.settingsPanel('Importer / Exporter').locator('mat-list-option');
		await expect(entries).toHaveText([/Importer/, /Sauvegarder/, /Partager la sauvegarde/, /Exporter en PDF/,
			/Exporter en CSV/]);
		await entries.last().click();
		const events = page.locator('.export-csv');
		await events.locator('.csv-layout.events').click();
		const file = await download(page, 'Enregistrer');
		expect(file.text).toContain(`${TODAY};10:30;Note;Note;;;;`);
	});
});
