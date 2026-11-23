import { test, expect, Browser } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { App } from '../support/app';
import { storeBackup, Lang, STORE_NOW, STORE_TODAY } from './store-data';

// Screens of the phone that can be played with on the home page of the website (life-notes-website): two weeks of
// the timeline, the calendar of the last months with their statistics, the built-in event types. Whole pages, cut into WebP
// images, and demo.json (the size of each page, where its buttons are). Not a test: it only runs with
// WEBSITE_DEMO_OUT=<folder>, see tests/store/README.md.
const OUT = process.env.WEBSITE_DEMO_OUT;
const LANGS: Lang[] = (process.env.STORE_LANGS || 'fr,en').split(',') as Lang[];

// Days of the timeline, months of the calendar before the current one
const DAYS = 14;
const MONTHS_BACK = 4;
// 720 px wide images, like the other screenshots of the website
const SCALE = 2;
// Height of each image, in CSS pixels: a WebP is 16383 px high at most, and shorter images load one after the other
const TILE = 1600;
const QUALITY = 0.82;

type Box = [number, number, number, number];

function translations(lang: Lang): (key: string) => string {
	const json = JSON.parse(readFileSync(`src/assets/i18n/${lang}.json`, 'utf-8'));
	return key => json[key];
}

function shiftMonth(month: string, delta: number): string {
	const d = new Date(`${month}-15T12:00:00Z`);
	d.setUTCMonth(d.getUTCMonth() + delta);
	return d.toISOString().slice(0, 7);
}

// The app with the data of the store screenshots (as in store-screenshots.spec.ts), on a 360 x 640 phone.
// customTypes false: only the built-in event types.
async function demoApp(browser: Browser, lang: Lang, customTypes = true) {
	const t = translations(lang);
	const context = await browser.newContext({
		viewport: { width: 360, height: 640 },
		deviceScaleFactor: SCALE,
		isMobile: true,
		hasTouch: true,
		locale: lang === 'fr' ? 'fr-FR' : 'en-US',
		timezoneId: 'Europe/Paris',
		baseURL: test.info().project.use.baseURL
	});
	const page = await context.newPage();
	await page.clock.install({ time: STORE_NOW });
	const app = new App(page);

	await app.start(lang);
	await app.goToSettings(t('SETTINGS_IMPORT_EXPORT_TITLE'));
	await page.locator('#file-import').setInputFiles({
		name: 'backup.json', mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(storeBackup(lang, { customTypes })))
	});
	await page.locator('.import-confirm .confirm-button').click();
	await expect(page.locator('simple-snack-bar')).toBeVisible();
	await expect(async () => {
		await app.reload();
		await app.goToTimeline();
		// One entry of each type today
		await expect(app.eventRows(STORE_TODAY)).toHaveCount(customTypes ? 8 : 6, { timeout: 1000 });
	}).toPass({ timeout: 20_000 });
	// Not restored by a backup: French calendars start on Monday
	await app.goToSettings(t('SETTINGS_APPEARANCE_TITLE'));
	await app.setToggle(t('SETTINGS_CALENDAR_START_SUNDAY_LABEL'), lang === 'en');
	return { context, page, app };
}

for (const lang of LANGS) {
	test(`website demo (${lang})`, async ({ browser }) => {
		test.skip(!OUT, 'WEBSITE_DEMO_OUT is not set');
		test.setTimeout(300_000);
		const dir = join(OUT, lang);
		mkdirSync(dir, { recursive: true });
		const { context, page, app } = await demoApp(browser, lang);
		// Turns the PNG screenshots into WebP images, in a page of its own
		const encoder = await context.newPage();

		const box = async (selector: string): Promise<Box> => {
			const b = await page.locator(selector).boundingBox();
			const scrollY = await page.evaluate(() => window.scrollY);
			return [b.x, b.y + scrollY, b.width, b.height].map(n => Math.round(n * 10) / 10) as Box;
		};
		const settle = async (wait = 1500, target = page) => {
			await target.evaluate(() => window.scrollTo(0, 0));
			await target.evaluate(() => (document as any).fonts.ready);
			// End of the animations (charts)
			await target.waitForTimeout(wait);
		};
		// The page from its top down to the given height (in CSS pixels), cut into images
		const capture = async (name: string, height: number, target = page) => {
			const tiles = [];
			for (let y = 0, index = 1; y < height; y += TILE, index++) {
				const tileHeight = Math.min(TILE, height - y);
				const png = await target.screenshot({
					fullPage: true, clip: { x: 0, y, width: 360, height: tileHeight }, animations: 'disabled', caret: 'hide'
				});
				const webp = await encoder.evaluate(async ({ data, quality }) => {
					const image = new Image();
					image.src = `data:image/png;base64,${data}`;
					await image.decode();
					const canvas = document.createElement('canvas');
					canvas.width = image.naturalWidth;
					canvas.height = image.naturalHeight;
					canvas.getContext('2d').drawImage(image, 0, 0);
					return canvas.toDataURL('image/webp', quality).split(',')[1];
				}, { data: png.toString('base64'), quality: QUALITY });
				const src = `${name}-${index}.webp`;
				writeFileSync(join(dir, src), Buffer.from(webp, 'base64'));
				tiles.push({ src, height: tileHeight });
			}
			return { height, tiles };
		};
		const pageHeight = (target = page) => target.evaluate(() => Math.ceil(document.documentElement.scrollHeight));

		// Timeline: its days load as it scrolls. It stops after the given days, with the space between two days.
		await app.goToTimeline();
		const cards = page.locator('.day-card');
		await expect(async () => {
			await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
			// They load by batches
			expect(await cards.count()).toBeGreaterThan(DAYS);
		}).toPass({ timeout: 30_000 });
		await settle();
		const header = await page.evaluate(() =>
			Math.round(document.querySelector('.fixed-header').getBoundingClientRect().bottom));
		const icons = {
			timeline: await box('#menu-icon-timeline'),
			calendar: await box('#menu-icon-calendar'),
			manage: await box('#menu-icon-manage')
		};
		const timelineEnd = await cards.nth(DAYS).evaluate(card => Math.round(card.getBoundingClientRect().top));
		const timeline = await capture('timeline', timelineEnd);

		// Calendar: the current month, then the ones before it, with their charts under it
		await app.goToCalendar();
		const months = [];
		const today = STORE_TODAY.slice(0, 7);
		for (let back = 0; back <= MONTHS_BACK; back++) {
			const month = shiftMonth(today, -back);
			await settle();
			months.unshift({
				month,
				previous: back < MONTHS_BACK ? await box('button.month-nav[aria-label="Previous"]') : null,
				next: back > 0 ? await box('button.month-nav[aria-label="Next"]') : null,
				...await capture(`calendar-${month}`, await pageHeight())
			});
			if (back < MONTHS_BACK) {
				const title = await page.locator('.calendar-card').innerText();
				await page.locator('button.month-nav[aria-label="Previous"]').click();
				await expect(async () => expect(await page.locator('.calendar-card').innerText()).not.toEqual(title))
					.toPass({ timeout: 5000 });
			}
		}

		// Manage: the built-in event types, then the tile that creates one. In an app without the types created by the
		// user: the other screens keep them.
		const builtIn = await demoApp(browser, lang, false);
		await builtIn.app.goToManage();
		await expect(builtIn.page.locator('.manage-tile.add-tile')).toBeVisible();
		await expect(builtIn.page.locator('.manage-tile.custom')).toHaveCount(0);
		await settle(800, builtIn.page);
		const manage = await capture('manage', await pageHeight(builtIn.page), builtIn.page);
		await builtIn.context.close();

		writeFileSync(join(dir, 'demo.json'), JSON.stringify({
			width: 360, height: 640, scale: SCALE, header, today: STORE_TODAY, icons, timeline, calendar: months, manage
		}, null, '\t'));
		await context.close();
	});
}
