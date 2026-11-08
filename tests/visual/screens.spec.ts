import { test, expect, Page, BrowserContext } from '@playwright/test';
import { App, CURRENT_VERSION, NOW, TODAY, YESTERDAY, shiftDate } from '../support/app';

// Main screens compared to their approved screenshots (__screenshots__). After a wanted UI change, approve
// the new screenshots with: npm run test:visual:update
test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let page: Page;
let app: App;

async function screen(name: string, options: { fullPage?: boolean } = {}): Promise<void> {
	await app.fontsReady();
	await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: options.fullPage });
}

async function setDarkMode(dark: boolean): Promise<void> {
	await app.goToSettings('Apparence');
	await app.setToggle('Mode sombre', dark);
	// Leaves the settings: the next screen must not depend on this panel being open
	await app.goToTimeline();
}

test.beforeAll(async ({ browser }) => {
	context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris',
		baseURL: test.info().project.use.baseURL
	});
	page = await context.newPage();
	await page.clock.setFixedTime(NOW);
	app = new App(page);

	// Same data for every screen
	await app.start();
	await app.addSymptom('Tête');
	await app.addSymptom('Ventre');
	await app.targetSymptom('Tête');
	await app.goToTimeline();
	await app.addEvent('symptomLog', { detail: 'Côté gauche' });
	await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
	await app.addEvent('log', { key: 'Mauvaise nuit', detail: 'Réveillé deux fois' });
	await app.addEvent('sport', { key: 'Course à pied', detail: '5 km' });
	await app.createCustomType('Hydratation', { icon: 'water_drop', quantity: true, unit: 'L' });
	await app.goToTimeline();
	await app.addCustomEvent('Hydratation', { key: 'Eau', quantity: '1,5' });
	await app.setDayIntensity(6);
	await app.addEvent('log', { key: 'Rendez-vous médecin' }, YESTERDAY);
	await app.setDayIntensity(2, YESTERDAY);
});

test.afterAll(async () => {
	await context.close();
});

for (const theme of ['light', 'dark']) {
	test.describe(theme, () => {

		test.beforeAll(async () => {
			await setDarkMode(theme === 'dark');
		});

		test('timeline', async () => {
			await app.goToTimeline();
			await page.evaluate(() => window.scrollTo(0, 0));
			await screen(`${theme}-timeline`);
		});

		test('day view', async () => {
			await app.goToTimeline();
			await app.dayCard().locator('.go-to-day').click();
			await expect(page.locator('.day-page')).toBeVisible();
			await screen(`${theme}-day`);
		});

		test('calendar', async () => {
			await app.goToCalendar();
			await screen(`${theme}-calendar`, { fullPage: true });
			// The symptoms without entry too: one ring each, one legend
			await page.locator('.show-all-symptoms').click();
			await expect(page.locator('app-intensity-ring')).toHaveCount(2);
			await page.locator('.intensities-card').scrollIntoViewIfNeeded();
			await screen(`${theme}-calendar-all-symptoms`);
		});

		test('year in pixels', async () => {
			await app.goToCalendar();
			await page.locator('.year-in-pixels-button').click();
			await expect(page.locator(`#pixel-${TODAY}`)).toBeVisible();
			await screen(`${theme}-year-in-pixels`, { fullPage: true });
		});

		test('manage menu and medications', async () => {
			await app.goToManage();
			await screen(`${theme}-manage`);
			await page.locator('.manage-tile.add-tile').click();
			await expect(page.locator('.edit-custom-type')).toBeVisible();
			await page.waitForTimeout(500);
			await screen(`${theme}-custom-type-editor`);
			await page.locator('.edit-custom-type .sheet-close-button').click();
			await expect(page.locator('.edit-custom-type')).toBeHidden();
			await app.goToManage('med');
			await expect(page.locator('.manage-item')).toHaveCount(1);
			await screen(`${theme}-medications`);
			await app.goToManage('symptomLog');
			await expect(page.locator('.symptom-card:not(.add-card)')).toHaveCount(2);
			await screen(`${theme}-symptoms`);
		});

		test('statistics of an event', async () => {
			await app.goToManage('med');
			await page.locator('.manage-item-actions button').nth(0).click();
			const sheet = page.locator('.occurrence-history');
			await expect(sheet.locator('app-occurrence-stats .hours canvas')).toBeVisible();
			await page.waitForTimeout(500);
			await screen(`${theme}-event-statistics`);
			await sheet.locator('.close-button').click();
			await expect(sheet).toBeHidden();
		});

		test('symptom editor', async () => {
			await app.goToManage('symptomLog');
			await page.locator('.symptom-card', { hasText: 'Tête' }).locator('.edit-btn').click();
			const sheet = page.locator('.add-symptom');
			// Inverted scale, not saved
			await sheet.locator('.inverted-scale-toggle label').click();
			await page.waitForTimeout(500);
			await screen(`${theme}-symptom-editor`);
			await sheet.locator('.sheet-close-button').click();
			await expect(sheet).toBeHidden();
		});

		test('settings', async () => {
			// From another page, so that the settings are displayed with every section closed
			await app.goToTimeline();
			await app.goToSettings();
			await screen(`${theme}-settings`);
			await app.goToSettings('Apparence');
			await page.waitForTimeout(500);
			await screen(`${theme}-settings-appearance`, { fullPage: true });
		});

		test('event sheets', async () => {
			await app.goToTimeline();
			await app.eventRows(undefined, 'symptomLog').click();
			await expect(page.locator('.edit-button')).toBeVisible();
			await page.waitForTimeout(500);
			await screen(`${theme}-show-event`);
			// The details sheet (read only) closes with a tap outside
			await page.locator('.cdk-overlay-backdrop').last().click({ position: { x: 10, y: 10 } });
			await expect(page.locator('.edit-button')).toBeHidden();

			await app.dayCard().locator('.add-event').click();
			await app.addMenuEntry('Médicament').click();
			await expect(page.locator('.bottom-sheet-container.med')).toBeVisible();
			await page.waitForTimeout(500);
			await screen(`${theme}-add-medication`);
			await page.locator('.bottom-sheet-container.med .sheet-close-button').click();
			await expect(page.locator('.bottom-sheet-container.med')).toBeHidden();

			// Intensity of the day: the value of the slider, white on the color of the symptoms
			await app.dayCard().locator('.day-card-overview').click();
			const intensity = page.locator('.edit-symptom-overview');
			await expect(intensity.locator('.pain-badge')).toHaveText('6');
			await page.waitForTimeout(500);
			await screen(`${theme}-symptom-intensity`);
			await intensity.locator('.sheet-close-button').click();
			await expect(intensity).toBeHidden();
		});

		test('tutorial', async () => {
			await page.goto('/#/tutorial');
			for (const [index, name] of [[1, 'create-symptom'], [10, 'backup-save']] as const) {
				await page.locator('ion-slides').evaluate((slides: any, i) => slides.slideTo(i, 0), index);
				await page.waitForTimeout(500);
				await screen(`${theme}-tutorial-${name}`);
			}
		});
	});
}

test('V1 timeline', async () => {
	await setDarkMode(false);
	await app.setUiVersion('V1');
	await app.goToTimeline();
	await page.evaluate(() => window.scrollTo(0, 0));
	await screen('light-timeline-classic');
	// The tutorial follows the version of the interface
	await page.goto('/#/tutorial');
	await page.locator('ion-slides').evaluate((slides: any) => slides.slideTo(3, 0));
	await page.waitForTimeout(500);
	await screen('light-tutorial-day-overview-classic');
	await app.setUiVersion('V2');
});

test('V1 calendar', async () => {
	await app.setUiVersion('V1');
	// The dark theme came after the V1
	for (const theme of ['light', 'dark']) {
		await setDarkMode(theme === 'dark');
		await app.goToCalendar();
		await screen(`${theme}-calendar-classic`, { fullPage: true });
	}
	await setDarkMode(false);
	await app.setUiVersion('V2');
});

test('new design popup', async ({ browser }) => {
	// Shown to the users of the former versions only: a database of its own
	const formerContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris',
		baseURL: test.info().project.use.baseURL
	});
	const formerPage = await formerContext.newPage();
	await formerPage.clock.setFixedTime(NOW);
	const formerApp = new App(formerPage);
	await formerApp.startAsFormerUser({ lastInstall: CURRENT_VERSION });
	await expect(formerPage.locator('app-dialog-new-ui .scene-new-ui')).toBeVisible();
	await formerPage.waitForTimeout(500);
	await formerApp.fontsReady();
	await expect(formerPage).toHaveScreenshot('light-new-ui-popup.png');
	await formerContext.close();
});

test('sleep of the month', async ({ browser }) => {
	// Nights of a month: a database of its own, so that the other screens keep their data
	const sleepContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris',
		baseURL: test.info().project.use.baseURL
	});
	const sleepPage = await sleepContext.newPage();
	await sleepPage.clock.setFixedTime(NOW);
	const sleepApp = new App(sleepPage);
	await sleepApp.start();
	await sleepApp.goToTimeline();
	const nights = [['22:45', '06:50'], ['23:30', '07:40'], ['00:40', '07:10'], ['23:10', '08:20'], ['22:30', '06:30']];
	for (let i = 0; i < nights.length; i++) {
		await sleepApp.setSleepTime('goToBed', nights[i][0], shiftDate(TODAY, i - nights.length));
		await sleepApp.setSleepTime('wakeUp', nights[i][1], shiftDate(TODAY, i - nights.length + 1));
	}
	const card = sleepPage.locator('app-sleep-stats .sleep-stats');
	for (const theme of ['light', 'dark']) {
		if (theme === 'dark') {
			await sleepApp.goToSettings('Apparence');
			await sleepApp.setToggle('Mode sombre', true);
		}
		await sleepApp.goToCalendar();
		await expect(card).toBeVisible();
		await sleepApp.fontsReady();
		await expect(card).toHaveScreenshot(`${theme}-sleep.png`);
		await card.locator('.mode-button.curves').click();
		await expect(card).toHaveScreenshot(`${theme}-sleep-curves.png`);
	}
	await sleepContext.close();
});
