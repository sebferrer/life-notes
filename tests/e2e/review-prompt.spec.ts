import { Page } from '@playwright/test';
import { test, expect, App, shiftDate, TODAY } from '../support/app';
import { getDayOfYear, getWeek, getWeekOfMonth } from 'date-fns';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.sebferrer.life_notes';

// The pages opened in a new window (the page of the store, on the web)
async function recordOpenedUrls(page: Page): Promise<void> {
	await page.addInitScript(() => {
		(window as any).openedUrls = [];
		window.open = ((url: string) => {
			(window as any).openedUrls.push(url);
			return null;
		}) as any;
	});
}

// Same as getDetailedDate of date.utils.ts (moment can't be imported here)
function detailedDate(formattedDate: string) {
	const date = new Date(`${formattedDate}T00:00:00`);
	return {
		day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear(), week: getWeek(date),
		dayOfWeek: date.getDay() || 7, dayOfYear: getDayOfYear(date), weekOfMonth: getWeekOfMonth(date), date,
		formattedDate
	};
}

function openedUrls(page: Page): Promise<string[]> {
	return page.evaluate(() => (window as any).openedUrls);
}

// Panel of the developer mode about the invitation
async function openDeveloperPanel(app: App, page: Page): Promise<void> {
	await app.goToSettings('Personnalisation');
	await app.setToggle('Afficher le mode développeur', true);
	await app.settingsPanel('Mode développeur').locator('mat-expansion-panel-header').first().click();
	await page.locator('.review-prompt-developer mat-expansion-panel-header').click();
}

// Invitation to rate the app on Google Play: shown once, on Android only, right after an event was added, to the
// users who know the app (its rules: unit/review-prompt.spec.ts). The developer mode previews it.
test.describe('Rating the app', () => {

	test.beforeEach(async ({ page }) => {
		await recordOpenedUrls(page);
	});

	test('the invitation says why, that it is shown once and that a new user can wait', async ({ app, page }) => {
		await app.start();
		await openDeveloperPanel(app, page);
		const developerPanel = page.locator('.review-prompt-developer');
		await expect(developerPanel).toContainText('Pas encore affichée.');
		await developerPanel.locator('.preview-review-prompt').click();

		const sheet = page.locator('app-bottom-sheet-review-prompt');
		await expect(sheet.locator('.title')).toHaveText('Votre avis sur Life Notes');
		await expect(sheet).toContainText('je la développe bénévolement sur mon temps libre');
		await expect(sheet).toContainText('rien ne vous y oblige');
		await expect(sheet.locator('.not-yet')).toHaveText('Si vous utilisez l\'application depuis peu, rien ne presse : '
			+ 'prenez d\'abord le temps de la découvrir. Vous pourrez la noter quand vous le souhaitez depuis '
			+ 'Paramètres > À propos > En savoir plus.');
		await expect(sheet.locator('.contact a')).toHaveAttribute('href', 'mailto:kimida.life.notes@gmail.com');
		await expect(sheet.locator('.once')).toContainText('Ce message ne s\'affichera qu\'une seule fois');
		// No question about the opinion of the user (rules of Google Play)
		await expect(sheet).not.toContainText('?');
		// Everything fits on a phone, buttons included
		await expect(sheet.locator('.actions .confirm-button')).toHaveText('Noter l\'application');
		await expect(sheet.locator('.actions .cancel-button')).toHaveText('Pas maintenant');
		await expect(sheet.locator('.actions')).toBeInViewport({ ratio: 1 });

		// Not now: nothing else
		await sheet.locator('.cancel-button').click();
		await expect(sheet).toHaveCount(0);
		expect(await openedUrls(page)).toEqual([]);

		// Rate: the card of Google Play on Android, the page of the store on the web
		await developerPanel.locator('.preview-review-prompt').click();
		await sheet.locator('.confirm-button').click();
		await expect(sheet).toHaveCount(0);
		await expect.poll(() => openedUrls(page)).toEqual([STORE_URL]);

		// A preview isn't recorded as shown
		await page.reload();
		await openDeveloperPanel(app, page);
		await expect(developerPanel).toContainText('Pas encore affichée.');
		await expect(developerPanel.locator('.reset-review-prompt')).toBeDisabled();
	});

	// The path named by the invitation: Settings > About > Learn more
	test('the app can be rated at any time from the about page', async ({ app, page }) => {
		await app.start();
		await app.goToSettings('À propos');
		await app.settingsPanel('À propos').locator('mat-list-option', { hasText: 'En savoir plus' }).click();
		const rateButton = page.locator('app-about .rate-button');
		await expect(rateButton).toHaveText(/Noter l'application/);
		// Next to the coffee, on the same line
		const coffeeButton = page.locator('app-about .kofi-button:not(.rate-button)');
		const [rateBox, coffeeBox] = [await rateButton.boundingBox(), await coffeeButton.boundingBox()];
		expect(Math.abs(rateBox.y - coffeeBox.y)).toBeLessThan(1);
		expect(rateBox.x).toBeLessThan(coffeeBox.x);

		await rateButton.click();
		await expect.poll(() => openedUrls(page)).toEqual([STORE_URL]);
	});

	test('the web app never shows it by itself, even to a user who knows the app', async ({ app, page }) => {
		await seedTwoMonthsOfData(page);
		await app.start();
		await app.goToTimeline();
		await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
		await page.waitForTimeout(2000);
		await expect(page.locator('app-bottom-sheet-review-prompt')).toHaveCount(0);
	});

	// On Android, never right after a symptom entered in pain: above 2 on the scale of 5, above 4 on the scale of 10
	for (const { scale, limit } of [{ scale: 10, limit: 4 }, { scale: 5, limit: 2 }]) {
		test(`on Android, not after a symptom above ${limit}/${scale}, after one at ${limit}/${scale}`,
			async ({ app, page }) => {
			test.slow();
			await seedTwoMonthsOfData(page);
			await app.start();
			// The first launch opened its dialogs: the invitation waits for another session
			await app.reload();
			if (scale === 5) {
				// New users have the scale of 10
				await app.goToSettings('Symptômes');
				await page.locator('mat-form-field', { hasText: 'Échelle de l\'intensité' }).locator('mat-select').click();
				await page.locator('mat-option', { hasText: '0 - 5' }).click();
			}
			await app.addSymptom('Tête');
			await app.goToTimeline();
			await pretendAndroid(page);

			const sheet = page.locator('app-bottom-sheet-review-prompt');
			for (let pain = scale; pain > limit; pain--) {
				await app.addEvent('symptomLog', { pain });
				// Beyond the delay of the invitation after an addition
				await page.waitForTimeout(1500);
				await expect(sheet, `${pain}/${scale}`).toHaveCount(0);
			}
			// The limit: the invitation comes (it was due all along, only the intensities held it back)
			await app.addEvent('symptomLog', { pain: limit });
			await expect(sheet).toBeVisible();
		});
	}
});

// Two months of data before the first launch of this browser: the invitation is due on Android
async function seedTwoMonthsOfData(page: Page): Promise<void> {
	await page.goto('/assets/i18n/fr.json');
	await page.addScriptTag({ path: 'node_modules/pouchdb/dist/pouchdb.min.js' });
	const days = Array.from({ length: 60 }, (_, i) => {
		const date = shiftDate(TODAY, -1 - i);
		return {
			_id: date, date, detailedDate: detailedDate(date), symptomOverviews: [], logs: [], symptoms: [], meds: [],
			meals: [], sports: [], customs: [], wakeUp: '07:30', goToBed: ''
		};
	});
	await page.evaluate(docs => new (window as any).PouchDB('days').bulkDocs(docs), days);
}

// The app believes it runs on Android, where it shows the invitation by itself (Capacitor.getPlatform, read by
// ReviewService at each addition). Its button would call Google Play: not clicked.
async function pretendAndroid(page: Page): Promise<void> {
	await page.evaluate(() => { (window as any).Capacitor.getPlatform = () => 'android'; });
}
