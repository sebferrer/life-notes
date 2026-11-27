import { test, expect, App, TODAY, shiftDate } from '../support/app';
import { Locator, Page } from '@playwright/test';

// Back from a day (button of the day page, or back of Android / of the browser): the timeline and the calendar are
// found as they were left (see NavigationMemoryService)

// A day of the second batch of the infinite scroll (60 days each)
const FAR_DAY = shiftDate(TODAY, -75);
// Where its card is put on the screen before it is opened
const CARD_TOP = 260;

// Scrolls the timeline down until the card of the day is loaded, then puts it at CARD_TOP from the top of the screen
async function scrollToDay(page: Page, date: string): Promise<Locator> {
	const card = page.locator(`#day-${date}`);
	await expect(async () => {
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await expect(card).toBeAttached({ timeout: 1000 });
	}).toPass({ timeout: 20_000 });
	await page.evaluate(({ id, top }) => {
		window.scrollBy(0, document.getElementById(id).getBoundingClientRect().top - top);
	}, { id: `day-${date}`, top: CARD_TOP });
	await expect.poll(async () => Math.round((await card.boundingBox()).y)).toBe(CARD_TOP);
	return card;
}

async function expectCardAt(card: Locator, top: number): Promise<void> {
	await expect.poll(async () => {
		const box = await card.boundingBox();
		return box && Math.abs(box.y - top) <= 2;
	}, { timeout: 5000 }).toBe(true);
}

async function setUp(app: App): Promise<void> {
	await app.start();
	await app.addSymptom('Tête');
	await app.targetSymptom('Tête');
	await app.goToTimeline();
}

test.describe('Back to the timeline and the calendar', () => {

	for (const version of ['V2', 'V1'] as const) {
		test(`timeline (${version}): back from a day, the same day is where it was on the screen`, async ({ app, page }) => {
			await setUp(app);
			if (version === 'V1') {
				await app.setUiVersion('V1');
				await app.goToTimeline();
			}
			const card = await scrollToDay(page, FAR_DAY);
			await card.locator('.go-to-day').click();
			await expect(page).toHaveURL(new RegExp(`#/${FAR_DAY}$`));
			await page.locator('.day-page-back, .go-back').first().click();

			await expect(page).toHaveURL(/#\/$/);
			await expectCardAt(page.locator(`#day-${FAR_DAY}`), CARD_TOP);
			// The infinite scroll goes on after the days loaded again
			await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
			await expect(page.locator(`#day-${shiftDate(TODAY, -130)}`)).toBeAttached({ timeout: 10_000 });
		});
	}

	test('timeline: the back of the phone (history) works the same, several times in a row', async ({ app, page }) => {
		await setUp(app);
		let card = await scrollToDay(page, FAR_DAY);
		await card.locator('.go-to-day').click();
		await expect(page).toHaveURL(new RegExp(`#/${FAR_DAY}$`));
		await page.goBack();
		await expectCardAt(page.locator(`#day-${FAR_DAY}`), CARD_TOP);

		// Another day, further up
		const other = shiftDate(TODAY, -20);
		card = await scrollToDay(page, other);
		await card.locator('.go-to-day').click();
		await expect(page).toHaveURL(new RegExp(`#/${other}$`));
		await page.goBack();
		await expectCardAt(page.locator(`#day-${other}`), CARD_TOP);
	});

	test('timeline: opened from the toolbar, it starts again at today', async ({ app, page }) => {
		await setUp(app);
		const card = await scrollToDay(page, FAR_DAY);
		await card.locator('.go-to-day').click();
		await expect(page).toHaveURL(new RegExp(`#/${FAR_DAY}$`));
		await page.locator('#menu-icon-timeline').click();
		await expect(page.locator(`#day-${TODAY}`)).toBeInViewport();
		expect(await page.evaluate(() => window.scrollY)).toBe(0);
	});

	test('calendar: back from a day, the month browsed is shown again', async ({ app, page }) => {
		await setUp(app);
		await app.goToCalendar();
		const label = page.locator('.calendar-header-label');
		await page.locator('.month-nav').first().click();
		await page.locator('.month-nav').first().click();
		await expect(label).toHaveText('janvier 2026');
		await page.locator('.day-cell', { hasText: /^\s*15\s*$/ }).click();
		await expect(page).toHaveURL(/#\/2026-01-15$/);

		await page.locator('.day-page-back').click();
		await expect(label).toHaveText('janvier 2026');
		await expect(page.locator('.day-cell', { hasText: /^\s*15\s*$/ })).toBeVisible();

		// The same with the back of the phone
		await page.locator('.day-cell', { hasText: /^\s*20\s*$/ }).click();
		await expect(page).toHaveURL(/#\/2026-01-20$/);
		await page.goBack();
		await expect(label).toHaveText('janvier 2026');

		// Opened from the toolbar: the current month
		await page.locator('.day-cell', { hasText: /^\s*20\s*$/ }).click();
		await expect(page).toHaveURL(/#\/2026-01-20$/);
		await app.goToCalendar();
		await expect(label).toHaveText('mars 2026');
	});

	test('calendar: the position of the page is found again', async ({ app, page }) => {
		// A small phone: the calendar is taller than the screen
		await page.setViewportSize({ width: 390, height: 480 });
		await setUp(app);
		await app.goToCalendar();
		await page.locator('.month-nav').first().click();
		await expect(page.locator('.calendar-header-label')).toHaveText('février 2026');
		// Down the page, a day still visible
		await page.evaluate(() => window.scrollTo(0, 120));
		const scrolled = await page.evaluate(() => window.scrollY);
		expect(scrolled).toBeGreaterThan(0);
		await page.locator('.day-cell', { hasText: /^\s*27\s*$/ }).click();
		await expect(page).toHaveURL(/#\/2026-02-27$/);
		await page.goBack();
		await expect(page.locator('.calendar-header-label')).toHaveText('février 2026');
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);
	});
});
