import { test, expect, Page, BrowserContext } from '@playwright/test';
import { App, NOW, YESTERDAY } from '../support/app';

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
		baseURL: 'http://localhost:4300'
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
		});

		test('manage menu and medications', async () => {
			await app.goToManage();
			await screen(`${theme}-manage`);
			await app.goToManage('med');
			await expect(page.locator('.manage-item')).toHaveCount(1);
			await screen(`${theme}-medications`);
			await app.goToManage('symptomLog');
			await expect(page.locator('.symptom-card:not(.add-card)')).toHaveCount(2);
			await expect(page.locator('.manage-item-tag')).toBeVisible();
			await screen(`${theme}-symptoms`);
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
			await page.locator('mat-nav-list a', { hasText: 'Ajouter un médicament' }).click();
			await expect(page.locator('.bottom-sheet-container.med')).toBeVisible();
			await page.waitForTimeout(500);
			await screen(`${theme}-add-medication`);
			await page.locator('.bottom-sheet-container.med .sheet-close-button').click();
			await expect(page.locator('.bottom-sheet-container.med')).toBeHidden();
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

test('classic timeline', async () => {
	await setDarkMode(false);
	await app.goToSettings('Apparence');
	await app.chooseRadio('Classique');
	await app.goToTimeline();
	await page.evaluate(() => window.scrollTo(0, 0));
	await screen('light-timeline-classic');
	// The tutorial follows the timeline style
	await page.goto('/#/tutorial');
	await page.locator('ion-slides').evaluate((slides: any) => slides.slideTo(3, 0));
	await page.waitForTimeout(500);
	await screen('light-tutorial-day-overview-classic');
	await app.goToSettings('Apparence');
	await app.chooseRadio('Moderne');
});
