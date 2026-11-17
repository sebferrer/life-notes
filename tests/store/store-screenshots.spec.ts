import { test, expect, Page, Browser, Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { App } from '../support/app';
import { storeBackup, Lang, STORE_NOW, STORE_TODAY } from './store-data';

// Screenshots of the Google Play listing, see tests/store/README.md
const OUT = process.env.STORE_OUT || 'play-store';
const LANGS: Lang[] = (process.env.STORE_LANGS || 'fr,en').split(',') as Lang[];
// Only the preview of the PDF report, the other screenshots are kept
const PDF_ONLY = !!process.env.STORE_PDF_ONLY;

// Screenshots of the listing (8 at most on Google Play), in their order, picked among the extras
const SELECTION: [string, string][] = [
	['01-timeline', 'light-timeline'],
	['02-add-symptom', 'light-add-symptom'],
	['03-calendar', 'light-calendar'],
	['04-year-in-pixels', 'dark-year-in-pixels'],
	['05-statistics', 'light-stats-med'],
	['06-custom-types', 'light-custom-type-editor'],
	['07-symptom-charts', 'light-calendar-charts'],
	['08-pdf-report', 'pdf-report']
];

// Month of the PDF report: a whole one
const REPORT_MONTH = 9;

const TEXTS = {
	fr: {
		symptomDetail: 'Derrière l\'œil droit', customType: 'Température', running: 'Course à pied', size: 'Ko',
		tracker: 'Hydratation'
	},
	en: {
		symptomDetail: 'Behind the right eye', customType: 'Temperature', running: 'Running', size: 'KB',
		tracker: 'Hydration'
	}
};

function translations(lang: Lang): (key: string) => string {
	const json = JSON.parse(readFileSync(`src/assets/i18n/${lang}.json`, 'utf-8'));
	return key => json[key];
}

// The PDF of the app is one JPEG (the report drawn by html2canvas) cut into A4 pages
function pdfContent(pdf: Buffer): { jpeg: Buffer, pages: number } {
	const text = pdf.toString('latin1');
	const image = text.indexOf('/Subtype /Image');
	const stream = text.indexOf('stream', image) + 'stream'.length;
	const start = stream + (text[stream] === '\r' ? 2 : 1);
	return {
		jpeg: pdf.subarray(start, text.indexOf('endstream', start)),
		pages: (text.match(/\/Type \/Page(?!s)/g) || []).length
	};
}

// Preview of the PDF report: its first two pages, a PDF icon and the file as a phone would show it.
// Transparent background: it is laid on the background of the listing afterwards.
function pdfPreview(pdf: Buffer, fileName: string, lang: Lang): string {
	const { jpeg, pages } = pdfContent(pdf);
	const image = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
	const width = 236;
	const height = width * 297 / 210;
	const size = `${Math.round(pdf.length / 1024)} ${TEXTS[lang].size}`;
	const pdfIcon = (w: number) => `
		<svg width="${w}" height="${w * 1.25}" viewBox="0 0 96 120">
			<path d="M10 0h54l32 32v78a10 10 0 0 1-10 10H10A10 10 0 0 1 0 110V10A10 10 0 0 1 10 0z" fill="#E53935"/>
			<path d="M64 0l32 32H74a10 10 0 0 1-10-10z" fill="#FFCDD2"/>
			<text x="48" y="92" text-anchor="middle" font-family="Roboto, Arial, sans-serif" font-weight="700"
				font-size="31" letter-spacing="1" fill="#fff">PDF</text>
		</svg>`;
	return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700&display=swap" rel="stylesheet">
<style>
	html, body { margin: 0; width: 360px; height: 640px; overflow: hidden; background: transparent; }
	body { position: relative; font-family: Roboto, Arial, sans-serif; }
	.page {
		position: absolute; width: ${width}px; height: ${height}px; border-radius: 3px;
		background: #fff url(${image}) no-repeat; background-size: 100% auto;
		box-shadow: 0 22px 44px rgba(0, 0, 0, 0.38), 0 3px 8px rgba(0, 0, 0, 0.22);
	}
	.back { left: 84px; top: 58px; transform: rotate(6deg); background-position: 0 -${height}px; }
	.front { left: 40px; top: 84px; transform: rotate(-4deg); }
	.badge { position: absolute; left: 226px; top: 352px; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.4)); }
	.file {
		position: absolute; left: 24px; right: 24px; top: 528px; display: flex; align-items: center; gap: 14px;
		padding: 14px 18px; background: #fff; border-radius: 18px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
	}
	.name { font-size: 15px; font-weight: 500; color: #212121; }
	.meta { margin-top: 3px; font-size: 13px; color: #757575; }
</style></head>
<body>
	<div class="page back"></div>
	<div class="page front"></div>
	<div class="badge">${pdfIcon(104)}</div>
	<div class="file">
		${pdfIcon(32)}
		<div><div class="name">${fileName}</div><div class="meta">PDF · ${pages} pages · ${size}</div></div>
	</div>
</body></html>`;
}

// The app with the data of the screenshots, imported as a user would restore a backup.
// 1080 x 1920 (9:16), the format asked by Google Play. 360 dp: the width of many Android phones.
async function storeApp(browser: Browser, lang: Lang, backup: any, todayRows: number) {
	const t = translations(lang);
	const context = await browser.newContext({
		viewport: { width: 360, height: 640 },
		deviceScaleFactor: 3,
		isMobile: true,
		hasTouch: true,
		locale: lang === 'fr' ? 'fr-FR' : 'en-US',
		timezoneId: 'Europe/Paris',
		baseURL: test.info().project.use.baseURL,
		acceptDownloads: true
	});
	const page = await context.newPage();
	// Time flows from STORE_NOW: a frozen clock would stop the animations of the charts on their first frame
	await page.clock.install({ time: STORE_NOW });
	const app = new App(page);

	await app.start(lang);
	await app.goToSettings(t('SETTINGS_IMPORT_EXPORT_TITLE'));
	await page.locator('#file-import').setInputFiles({
		name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup))
	});
	await page.locator('.import-confirm .confirm-button').click();
	await expect(page.locator('simple-snack-bar')).toBeVisible();
	await expect(async () => {
		await app.reload();
		await app.goToTimeline();
		await expect(app.eventRows(STORE_TODAY)).toHaveCount(todayRows, { timeout: 1000 });
	}).toPass({ timeout: 20_000 });
	return { context, page, app };
}

for (const lang of LANGS) {
	test(`store screenshots (${lang})`, async ({ browser }) => {
		const t = translations(lang);
		const texts = TEXTS[lang];
		const dir = join(OUT, lang);
		const extras = join(dir, 'extras');
		mkdirSync(extras, { recursive: true });

		// One entry of each type today (8 rows)
		const { context, page, app } = await storeApp(browser, lang, storeBackup(lang), 8);

		const shot = async (name: string, target: Page = page, transparent = false) => {
			await target.evaluate(() => (document as any).fonts.ready);
			// End of the animations (charts, sheets)
			await target.waitForTimeout(1500);
			await target.screenshot({
				path: join(extras, `${name}.png`), animations: 'disabled', caret: 'hide', omitBackground: transparent
			});
		};
		const closeSheet = async (selector: string) => {
			await page.locator(`${selector} .sheet-close-button`).click();
			await expect(page.locator(selector)).toBeHidden();
		};
		const setDarkMode = async (dark: boolean) => {
			await app.goToSettings(t('SETTINGS_APPEARANCE_TITLE'));
			await app.setToggle(t('SETTINGS_DARK_MODE_LABEL'), dark);
			await app.goToTimeline();
		};
		const openStatistics = async (tile: 'med' | 'sport', item: string) => {
			await app.goToManage(tile);
			await page.locator('.manage-item', { hasText: item }).locator('.manage-item-actions button').first().click();
			await expect(page.locator('.occurrence-history app-occurrence-stats .hours canvas')).toBeVisible();
		};
		const closeStatistics = async () => {
			await page.locator('.occurrence-history .close-button').click();
			await expect(page.locator('.occurrence-history')).toBeHidden();
		};

		// Not restored by a backup: French calendars start on Monday
		await app.goToSettings(t('SETTINGS_APPEARANCE_TITLE'));
		await app.setToggle(t('SETTINGS_CALENDAR_START_SUNDAY_LABEL'), lang === 'en');
		// The lists of medications, notes and sports are rebuilt from the imported days
		for (const tile of ['med', 'log', 'sport'] as const) {
			await app.goToManage(tile);
			await page.locator('.manage-list-header .manage-list-refresh').click();
			await page.locator('.confirm-sheet .confirm-button').click();
			await expect(page.locator('.manage-item').first()).toBeVisible();
		}

		for (const theme of PDF_ONLY ? [] : ['light', 'dark']) {
			await setDarkMode(theme === 'dark');
			const name = (screen: string) => `${theme}-${screen}`;

			// Timeline
			await app.goToTimeline();
			await page.evaluate(() => window.scrollTo(0, 0));
			await shot(name('timeline'));

			// Bedtime of today, not filled in yet
			await app.dayCard(STORE_TODAY).locator('.sleep-row.goToBed').click();
			await expect(page.locator('.bottom-sheet-container.goToBed')).toBeVisible();
			await shot(name('bedtime'));
			await closeSheet('.bottom-sheet-container.goToBed');
			await page.evaluate(() => window.scrollTo(0, 0));

			// Add menu, then a symptom being added
			await app.dayCard(STORE_TODAY).locator('.add-event').click();
			await expect(page.locator('.add-event-menu')).toBeVisible();
			await shot(name('add-menu'));
			await page.locator('.add-event-menu .add-option').first().click();
			const symptomSheet = page.locator('.bottom-sheet-container.symptomLog');
			await expect(symptomSheet).toBeVisible();
			await symptomSheet.locator('ion-range').evaluate((range: any) => {
				range.value = 6;
				range.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 6 } }));
			});
			await expect(symptomSheet.locator('.pain-badge')).toHaveText('6');
			await symptomSheet.locator('ion-textarea textarea').fill(texts.symptomDetail);
			await symptomSheet.locator('ion-textarea textarea').blur();
			// The form scrolls on small screens: from its intensity field
			await symptomSheet.locator('.content-body').evaluate(body => {
				const field = body.querySelector('.pain-input-container').closest('.form-field');
				body.scrollTop += field.getBoundingClientRect().top - body.getBoundingClientRect().top;
			});
			await shot(name('add-symptom'));
			await closeSheet('.bottom-sheet-container.symptomLog');

			// Day view
			await app.dayCard(STORE_TODAY).locator('.go-to-day').click();
			await expect(page.locator('.day-page')).toBeVisible();
			await shot(name('day'));

			// Calendar, charts of the month, Year in Pixels
			await app.goToCalendar();
			await shot(name('calendar'));
			// Intensities of the month: one bar per symptom
			await page.evaluate(() => {
				const card = document.querySelector('.intensities-card');
				window.scrollBy(0, card.getBoundingClientRect().top - 66);
			});
			await shot(name('calendar-charts'));
			// Sleep of the month: durations, bedtimes and wake-up times
			await page.evaluate(() => {
				const card = document.querySelector('app-sleep-stats .sleep-stats');
				window.scrollBy(0, card.getBoundingClientRect().top - 66);
			});
			await shot(name('sleep-charts'));
			await page.evaluate(() => window.scrollTo(0, 0));
			await page.locator('.year-in-pixels-button').click();
			await expect(page.locator(`#pixel-${STORE_TODAY}`)).toBeVisible();
			await shot(name('year-in-pixels'));

			// Manage: event types (built-in and created by the user), symptoms
			await app.goToManage();
			await shot(name('manage'));
			await page.locator('.manage-tile.add-tile').click();
			const editor = page.locator('.edit-custom-type');
			await expect(editor).toBeVisible();
			await editor.locator('.custom-type-label-input').fill(texts.customType);
			await editor.locator('.icon-choice[data-icon="thermostat"]').click();
			await editor.locator('.custom-type-label-input').blur();
			await shot(name('custom-type-editor'));
			await closeSheet('.edit-custom-type');
			await app.goToManage('symptomLog');
			await shot(name('symptoms'));

			// Statistics of an event: the attacks become rarer month after month
			await openStatistics('med', 'Sumatriptan');
			await page.locator('.occurrence-history .period-button.month').click();
			await shot(name('stats-med'));
			await closeStatistics();
			await openStatistics('sport', texts.running);
			await shot(name('stats-sport'));
			await closeStatistics();
		}
		await setDarkMode(false);

		// Screens of the presentation video (play-store/video-generator), in the light theme: whole pages, scrolled
		// in the video under the toolbar, and the slider of the intensity at each value
		if (!PDF_ONLY) {
			const video = join(dir, 'video');
			mkdirSync(video, { recursive: true });
			// fullPage: the whole page, or its top only (in CSS pixels) for a long one
			const still = async (name: string, fullPage: boolean | number = false, wait = 1500) => {
				await page.evaluate(() => (document as any).fonts.ready);
				await page.waitForTimeout(wait);
				const clip = typeof fullPage === 'number' ? { x: 0, y: 0, width: 360, height: fullPage } : undefined;
				await page.screenshot({
					path: join(video, `${name}.png`), fullPage: !!fullPage, clip, animations: 'disabled', caret: 'hide'
				});
			};
			// In CSS pixels of the page (the images are at 3x)
			const pageTop = (selector: string) => page.evaluate(s =>
				Math.round(document.querySelector(s).getBoundingClientRect().top + window.scrollY), selector);
			const meta: any = { scale: 3, viewport: { width: 360, height: 640 } };

			await app.goToTimeline();
			await page.evaluate(() => window.scrollTo(0, 0));
			// The toolbar stays on top of the page
			meta.header = await page.evaluate(() =>
				Math.round(document.querySelector('.fixed-header').getBoundingClientRect().bottom));
			// Its days load as it scrolls: two and a half screens
			await still('timeline', 1600);

			await app.dayCard(STORE_TODAY).locator('.add-event').click();
			await page.locator('.add-event-menu .add-option').first().click();
			const sheet = page.locator('.bottom-sheet-container.symptomLog');
			await expect(sheet).toBeVisible();
			await sheet.locator('ion-textarea textarea').fill(texts.symptomDetail);
			await sheet.locator('ion-textarea textarea').blur();
			await sheet.locator('.content-body').evaluate(body => {
				const field = body.querySelector('.pain-input-container').closest('.form-field');
				body.scrollTop += field.getBoundingClientRect().top - body.getBoundingClientRect().top;
			});
			meta.knobs = [];
			for (let value = 0; value <= 6; value++) {
				await sheet.locator('ion-range').evaluate((range: any, v) => {
					range.value = v;
					range.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
				}, value);
				await expect(sheet.locator('.pain-badge')).toHaveText(String(value));
				await still(`symptom-${value}`, false, value === 0 ? 1500 : 600);
				const knob = await sheet.locator('ion-range .range-knob-handle').boundingBox();
				meta.knobs.push({ x: Math.round(knob.x + knob.width / 2), y: Math.round(knob.y + knob.height / 2) });
			}
			await closeSheet('.bottom-sheet-container.symptomLog');

			await app.goToCalendar();
			await page.evaluate(() => window.scrollTo(0, 0));
			meta.calendar = {
				intensities: await pageTop('.intensities-card'),
				sleep: await pageTop('app-sleep-stats .sleep-stats')
			};
			await still('calendar', true);
			await page.locator('.year-in-pixels-button').click();
			await expect(page.locator(`#pixel-${STORE_TODAY}`)).toBeVisible();
			await still('year-in-pixels');

			// A type of event being created, in an app with the built-in types only: their menu, the sheet of the new
			// type (its name typed; its icon and its color: the first ones), then the menu with it. Where the finger
			// taps, for the video.
			const trackers = await storeApp(browser, lang, storeBackup(lang, { customTypes: false }), 6);
			const trackerStill = async (name: string, wait = 1200) => {
				await trackers.page.evaluate(() => (document as any).fonts.ready);
				await trackers.page.waitForTimeout(wait);
				await trackers.page.screenshot({ path: join(video, `${name}.png`), animations: 'disabled', caret: 'hide' });
			};
			const center = async (locator: Locator) => {
				const box = await locator.boundingBox();
				return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
			};
			const taps: any = {};
			await trackers.app.goToManage();
			await expect(trackers.page.locator('.manage-tile.custom')).toHaveCount(0);
			await trackerStill('trackers-0');
			const addTile = trackers.page.locator('.manage-tile.add-tile');
			taps.add = await center(addTile);
			await addTile.click();
			const editor = trackers.page.locator('.edit-custom-type');
			await expect(editor).toBeVisible();
			const name = editor.locator('.custom-type-label-input');
			await trackerStill('trackers-1');
			// Once the sheet is up
			taps.name = await center(name);
			// Typed in three steps
			const typed = [3, 7, texts.tracker.length];
			for (const [index, length] of typed.entries()) {
				await name.fill(texts.tracker.slice(0, length));
				await trackerStill(`trackers-${2 + index}`, 400);
			}
			await expect(editor.locator('.icon-choice[data-icon="water_drop"]')).toHaveClass(/selected/);
			const create = editor.locator('.confirm-button');
			taps.create = await center(create);
			await create.click();
			await expect(editor).toBeHidden();
			await expect(trackers.page.locator('.manage-tile.custom', { hasText: texts.tracker })).toBeVisible();
			await trackerStill('trackers-5');
			await trackers.context.close();
			meta.trackers = { frames: 6, taps };

			writeFileSync(join(video, 'meta.json'), JSON.stringify(meta, null, '	'));
		}

		// PDF report of a month, as the app saves it
		await app.goToSettings(t('SETTINGS_IMPORT_EXPORT_TITLE'));
		await page.locator('mat-list-option', { hasText: t('EXPORT_PDF') }).click();
		await page.locator('.export-pdf mat-select').first().click();
		await page.locator('mat-option', { hasText: t(`MONTH-${REPORT_MONTH}`) }).click();
		await page.locator('.export-pdf .confirm-button').click();
		await expect(page).toHaveURL(new RegExp(`#/monthlyreport/2026-0?${REPORT_MONTH}$`));
		await expect(page.locator('.stats-container')).toBeVisible();
		await shot('light-monthly-report');
		const [download] = await Promise.all([
			page.waitForEvent('download', { timeout: 120_000 }),
			page.locator('.fab-container button').nth(1).click()
		]);
		const pdf = readFileSync(await download.path());
		// The PDF itself, to check it: tests/results
		writeFileSync(test.info().outputPath(download.suggestedFilename()), pdf);
		const preview = await context.newPage();
		await preview.setContent(pdfPreview(pdf, download.suggestedFilename(), lang), { waitUntil: 'networkidle' });
		await shot('pdf-report', preview, true);

		// The same selection in the light theme only
		const light = join(dir, 'selection-light');
		mkdirSync(light, { recursive: true });
		for (const [file, screen] of SELECTION.filter(([, screen]) => !PDF_ONLY || screen === 'pdf-report')) {
			copyFileSync(join(extras, `${screen}.png`), join(dir, `${file}.png`));
			copyFileSync(join(extras, `${screen.replace(/^dark-/, 'light-')}.png`), join(light, `${file}.png`));
		}
		await context.close();
	});
}
