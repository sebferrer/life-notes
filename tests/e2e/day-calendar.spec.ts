import { test, expect, TODAY, YESTERDAY, shiftDate } from '../support/app';

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

test.describe('Classic calendar and Year in Pixels', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		// 6 out of 10
		await app.setDayIntensity(6);
	});

	test('the calendar of the V1', async ({ app, page }) => {
		await app.setUiVersion('V1');
		await app.goToCalendar();
		const calendar = page.locator('.classic-calendar');
		await expect(page.locator('.calendar-card')).toHaveCount(0);
		await expect(calendar.locator('.calender-header-label')).toHaveText('mars 2026');
		await expect(calendar.locator('.grid-tile-header').first()).toHaveText('D');
		await expect(calendar.locator('.grid-tile:not(.empty-tile)')).toHaveCount(31);
		const today = calendar.locator('.grid-tile', { has: page.locator('.day-label-today') });
		await expect(today).toHaveText('18');
		await expect(today).toHaveClass(/color-pain-3/);
		await expect(calendar.locator('app-pie-chart')).toHaveCount(1);
		await calendar.locator('.next-button button').click();
		await expect(calendar.locator('.calender-header-label')).toHaveText('avril 2026');

		await app.setUiVersion('V2');
		await app.goToCalendar();
		await expect(page.locator('.modern-calendar .day-cell.today')).toHaveText('18');
		await expect(calendar).toHaveCount(0);
	});

	test('the year in pixels shows each day of the year with the color of the target symptom', async ({ app, page }) => {
		await app.setDayIntensity(2, YESTERDAY);
		await app.goToCalendar();
		await page.locator('.year-in-pixels-button').click();
		await expect(page).toHaveURL(/#\/yearinpixels\/2026$/);
		await expect(page.locator('.year-in-pixels .title')).toHaveText('Year in Pixels');
		await expect(page.locator('.year-label .year')).toHaveText('2026');
		await expect(page.locator('.year-label .symptom')).toHaveText('Tête');
		await expect(page.locator('#menu-icon-calendar')).toHaveClass(/active/);

		// One pixel per day, an empty cell for the 30th of February...
		await expect(page.locator('.pixel:not(.missing)')).toHaveCount(365);
		await expect(page.locator('.pixel.missing')).toHaveCount(7);
		const today = page.locator(`#pixel-${TODAY}`);
		await expect(today).toHaveClass(/today/);
		await expect(today).toHaveClass(/color-pain-3/);
		await expect(page.locator(`#pixel-${YESTERDAY}`)).toHaveClass(/color-pain-1/);
		// A day without data isn't shown as a day without pain
		await expect(page.locator(`#pixel-${shiftDate(TODAY, -2)}`)).toHaveClass(/no-data/);
		await expect(page.locator('.pixel.no-data')).toHaveCount(31 + 28 + 18 - 2);
		await expect(page.locator('.pixel.future')).toHaveCount(365 - (31 + 28 + 18));
		// Legend of the 0-10 scale
		await expect(page.locator('.legend-item')).toHaveText(['Pas de donnée', '0', '1-2', '3-4', '5-6', '7-8', '9-10']);

		// A pixel opens its day, back returns to the year
		await today.click();
		await expect(page.locator('.day-page-date')).toHaveText('18 mars 2026');
		await page.locator('.day-page-back').click();
		await expect(today).toHaveClass(/color-pain-3/);
		// Back to the calendar
		await page.locator('.year-in-pixels .back-button').click();
		await expect(page.locator('.modern-calendar')).toBeVisible();
	});

	test('the year in pixels follows the target symptom and browses the years', async ({ app, page }) => {
		await app.addSymptom('Ventre');
		await app.goToCalendar();
		await page.locator('.year-in-pixels-button').click();
		const today = page.locator(`#pixel-${TODAY}`);
		await expect(today).toHaveClass(/color-pain-3/);
		await app.targetSymptom('Ventre');
		await expect(page.locator('.year-label .symptom')).toHaveText('Ventre');
		await expect(today).toHaveClass(/no-data/);
		await app.targetSymptom('Tête');
		await expect(today).toHaveClass(/color-pain-3/);

		const year = page.locator('.year-label .year');
		await page.locator('.year-nav').first().click();
		await expect(year).toHaveText('2025');
		await expect(page.locator('.pixel.today')).toHaveCount(0);
		await expect(page.locator('.pixel.no-data')).toHaveCount(365);
		await page.locator('.year-nav').last().click();
		await page.locator('.year-nav').last().click();
		await expect(year).toHaveText('2027');
		await expect(page.locator('.pixel.future')).toHaveCount(365);
		// Leap year
		await page.locator('.year-nav').last().click();
		await expect(year).toHaveText('2028');
		await expect(page.locator('#pixel-2028-02-29')).toHaveCount(1);
		await expect(page.locator('.pixel.missing')).toHaveCount(6);
	});

	test('the year in pixels opens from the calendar of the V1 too', async ({ app, page }) => {
		await app.setUiVersion('V1');
		await app.goToCalendar();
		await page.locator('.classic-calendar .year-in-pixels-button').click();
		await expect(page.locator(`#pixel-${TODAY}`)).toHaveClass(/color-pain-3/);
		await page.locator('.year-in-pixels .back-button').click();
		await expect(page.locator('.classic-calendar')).toBeVisible();
	});
});
