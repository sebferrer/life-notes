import { test, expect, TODAY } from '../support/app';

test.describe('Day view and calendar', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
	});

	test('the day view shows the events of the day and goes back to the timeline', async ({ app, page }) => {
		await app.addEvent('log', { key: 'Mauvaise nuit', detail: 'Un long détail qui doit être affiché en entier' });
		await app.dayCard().locator('.go-to-day').click();

		const day = page.locator('.day-page');
		await expect(day.locator('.day-page-date')).toHaveText('18 mars 2026');
		await expect(day.locator('.event-row.log .event-card-detail')).toHaveText('Un long détail qui doit être affiché en entier');

		await day.locator('.day-page-back').click();
		await expect(app.dayCard()).toBeVisible();
	});

	test('the calendar shows the month, today and the colors of the intensities', async ({ app, page }) => {
		await app.setDayIntensity(6);
		await app.goToCalendar();
		await expect(page.locator('.calendar-header-label')).toHaveText('mars 2026');
		const today = page.locator('.day-cell.today');
		await expect(today).toHaveText('18');
		await expect(today).toHaveClass(/color-pain-[1-5]/);
		// Days to come have no data yet
		await expect(page.locator('.day-cell.future')).toHaveCount(13);
	});

	test('months can be browsed', async ({ app, page }) => {
		await app.goToCalendar();
		const label = page.locator('.calendar-header-label');
		await page.locator('.month-nav').last().click();
		await expect(label).toHaveText('avril 2026');
		await page.locator('.month-nav').first().click();
		await page.locator('.month-nav').first().click();
		await expect(label).toHaveText('février 2026');
	});

	test('a day of the calendar opens its details, and back returns to the calendar', async ({ app, page }) => {
		await app.addEvent('sport', { key: 'Course à pied' });
		await app.goToCalendar();
		await page.locator('.day-cell.today').click();
		await expect(page.locator('.day-page .event-row.sport')).toContainText('Course à pied');
		await page.locator('.day-page-back').click();
		await expect(page.locator('.calendar-card')).toBeVisible();
	});

	test('the week starts on sunday or monday, as set in the settings', async ({ app, page }) => {
		await app.goToCalendar();
		await expect(page.locator('.weekday').first()).toHaveText('D');
		await app.goToSettings('Apparence');
		await app.setToggle('Commencer la semaine par dimanche', false);
		await app.goToCalendar();
		await expect(page.locator('.weekday').first()).toHaveText('L');
	});

	test('the statistics of the month are shown under the calendar', async ({ app, page }) => {
		await app.setDayIntensity(4);
		await app.goToCalendar();
		await expect(page.locator('app-pie-chart')).toHaveCount(1);
		await expect(page.locator('app-pie-chart .chart-label')).toHaveText('Tête');
	});
});

test('the day view of a date without data is empty but usable', async ({ app, page }) => {
	await app.start();
	await page.goto(`/#/${TODAY}`);
	await expect(page.locator('.day-page .sleep-row')).toHaveCount(2);
	await expect(page.locator('.day-page .event-row')).toHaveCount(0);
});
