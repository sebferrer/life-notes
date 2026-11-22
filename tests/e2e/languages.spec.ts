import { test, expect, App, YESTERDAY } from '../support/app';
import { Page } from '@playwright/test';

// The texts that the code builds itself (dates, counts, initials, capitals) must follow each language, as the
// translation files do. The events are added in French, as the helpers do, then the language is changed.

// Settings > Language, from French
async function switchLanguage(app: App, page: Page, name: string, code: string): Promise<void> {
	await app.goToSettings('Langue');
	await app.settingsPanel('Langue').locator('mat-select').click();
	await page.locator('mat-option', { hasText: name }).click();
	// Language of the page: Japanese shapes of the characters, pronunciation of the screen readers
	await expect(page.locator('html')).toHaveAttribute('lang', code);
}

// Manage > Notes > history of the first note
async function openHistory(app: App, page: Page): Promise<void> {
	await app.goToManage('log');
	await page.locator('.manage-item-actions button').nth(0).click();
	await expect(page.locator('.occurrence-history')).toBeVisible();
}

test.describe('Texts built by the code, in the new languages', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.goToTimeline();
		// Two days of the same week (it starts on Sunday the 15th)
		await app.addEvent('log', { key: 'Note' }, YESTERDAY);
		await app.addEvent('log', { key: 'Note' });
	});

	test('in Japanese, the months are numbers and the dates start with the year', async ({ app, page }) => {
		await switchLanguage(app, page, '日本語', 'ja');
		// The select of the time format doesn't keep the "24h" it showed before
		await expect(app.settingsPanel('時刻').locator('.mat-select-value-text')).toHaveText('24時間制');
		await openHistory(app, page);
		const sheet = page.locator('.occurrence-history');
		await expect(sheet.locator('.header-section .date-time-row')).toHaveText('2回');
		// Weeks of the evolution: the month before the day, not "15 3月"
		await expect(sheet.locator('.evolution canvas')).toHaveAttribute('aria-label', /3月15日 2/);
		await sheet.locator('.list-tab').click();
		await expect(sheet.locator('.occurrence-date').first()).toHaveText('2026/03/18');
		await sheet.locator('.close-button').click();

		// Year in pixels: the number of each month, their first character would be "1" four times
		await app.goToCalendar();
		await page.locator('.year-in-pixels-button').click();
		await expect(page.locator('.year-in-pixels .month-label'))
			.toHaveText(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
	});

	test('in German, the dates have dots and the nouns keep their capital', async ({ app, page }) => {
		await switchLanguage(app, page, 'Deutsch', 'de');
		await expect(app.settingsPanel('Uhrzeit').locator('.mat-select-value-text')).toHaveText('24 h');
		await openHistory(app, page);
		const sheet = page.locator('.occurrence-history');
		// Not "2 anzahl" nor "2 einträge"
		await expect(sheet.locator('.header-section .date-time-row')).toHaveText('2 Einträge');
		await expect(sheet.locator('.evolution canvas')).toHaveAttribute('aria-label', /15\. März 2/);
		await sheet.locator('.list-tab').click();
		await expect(sheet.locator('.occurrence-date').first()).toHaveText('18.03.2026');
		await sheet.locator('.close-button').click();

		// Example of a symptom name
		await app.goToManage('symptomLog');
		await page.locator('.add-card').click();
		await expect(page.locator('.add-symptom input[matinput]')).toHaveAttribute('placeholder', 'z. B. Migräne');
	});

	test('in Spanish, a title starts with a capital, without one on each word', async ({ app, page }) => {
		await switchLanguage(app, page, 'Español', 'es');
		await app.goToTimeline();
		await expect(app.dayCard().locator('.day-card-date')).toHaveText('Mié, 18 mar. 2026');
		await openHistory(app, page);
		await expect(page.locator('.occurrence-history .header-section .date-time-row')).toHaveText('2 veces');
		await page.locator('.occurrence-history .close-button').click();

		// PDF report: "Marzo de 2026", not "Marzo De 2026"
		await page.goto('/#/monthlyreport/2026-3');
		await expect(page.locator('.modern-report .report-title')).toHaveText('Marzo de 2026');
		// As in the year in pixels: the first letter of each month
		await app.goToCalendar();
		await page.locator('.year-in-pixels-button').click();
		await expect(page.locator('.year-in-pixels .month-label'))
			.toHaveText(['e', 'f', 'm', 'a', 'm', 'j', 'j', 'a', 's', 'o', 'n', 'd']);
	});

	test('the history of a single entry is written in the singular', async ({ app, page }) => {
		await openHistory(app, page);
		const sheet = page.locator('.occurrence-history');
		await expect(sheet.locator('.header-section .date-time-row')).toHaveText('2 occurrences');
		await sheet.locator('.list-tab').click();
		// As the user entered it, wherever they live: a Date object would show the day before in America
		await expect(sheet.locator('.occurrence-date').first()).toHaveText('18/03/2026');
		await sheet.locator('.occurrence-item').first().locator('.occurrence-delete').click();
		await page.locator('app-bottom-sheet-delete-event .confirm-button').click();
		await expect(sheet.locator('.occurrence-item')).toHaveCount(1);
		await expect(sheet.locator('.header-section .date-time-row')).toHaveText('1 occurrence');
	});
});

// West of UTC, the day of an entry must stay the one the user entered
test.describe('In a time zone behind UTC', () => {
	test.use({ timezoneId: 'America/Sao_Paulo' });

	test('the history shows the day of the entry, not the day before', async ({ app, page }) => {
		await app.start();
		await app.goToTimeline();
		await app.addEvent('log', { key: 'Note' });
		await openHistory(app, page);
		await page.locator('.occurrence-history .list-tab').click();
		await expect(page.locator('.occurrence-history .occurrence-date').first()).toHaveText('18/03/2026');
	});
});
