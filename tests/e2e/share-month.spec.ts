import { Page } from '@playwright/test';
import { test, expect, App, TODAY, YESTERDAY, shiftDate } from '../support/app';

const SHARED_TEXT = 'Mon suivi « Tête » en mars 2026, avec Life Notes : https://life-notes.fr';
// Green of the logo, darker (--brand-green): month and address on the image, name of the app on the PDF report
const BRAND_GREEN = 'rgb(26, 127, 55)';

// Width and height of a PNG, from its header
function pngSize(bytes: Buffer): { width: number, height: number } {
	expect(bytes.subarray(1, 4).toString()).toBe('PNG');
	return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

// Share sheet of the browser, recorded: the files shared (their name, type and header) and the text
async function recordWebShare(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const w = window as any;
		w.webShares = [];
		Object.defineProperty(navigator, 'canShare', {
			configurable: true, value: (data: any) => Array.isArray(data && data.files)
		});
		Object.defineProperty(navigator, 'share', {
			configurable: true, value: async (data: any) => {
				const files = await Promise.all(data.files.map(async (file: File) => ({
					name: file.name, type: file.type, header: Array.from(new Uint8Array(await file.slice(0, 24).arrayBuffer()))
				})));
				w.webShares.push({ title: data.title, text: data.text, files });
			}
		});
	});
}

// Android: the native side of the Filesystem and Share plugins of Capacitor and of the FileSaver plugin of the app,
// recorded. Known as native plugins when the app starts (their headers), then called once the app believes it runs
// on Android (see pretendNative). cancel: the share sheet or the "Save as" of the system left without choosing.
async function recordNativeCalls(page: Page, options: { cancel?: boolean } = {}): Promise<void> {
	await page.addInitScript(cancel => {
		const w = window as any;
		w.nativeCalls = [];
		w.Capacitor = {
			PluginHeaders: [
				{ name: 'Filesystem', methods: [{ name: 'writeFile', rtype: 'promise' }] },
				{ name: 'Share', methods: [{ name: 'share', rtype: 'promise' }] },
				{ name: 'FileSaver', methods: [{ name: 'saveFile', rtype: 'promise' }] }
			],
			nativePromise: (plugin: string, method: string, callOptions: any) => {
				w.nativeCalls.push({ plugin, method, options: callOptions });
				if (method === 'writeFile') {
					return Promise.resolve({ uri: 'file:///data/user/0/com.sebferrer.life_notes/cache/' + callOptions.path });
				}
				// What the plugins answer when the user leaves without choosing
				if (cancel) {
					return Promise.reject({ message: method === 'share' ? 'Share canceled' : 'User cancelled' });
				}
				return Promise.resolve(method === 'share' ? { activityType: 'com.whatsapp' }
					: { uri: 'content://com.android.externalstorage.documents/document/primary%3APictures%2Flife-notes-2026-03.png' });
			}
		};
	}, !!options.cancel);
}

async function pretendNative(page: Page): Promise<void> {
	await page.evaluate(() => { (window as any).Capacitor.isNativePlatform = () => true; });
}

// Today 6/10 for Tête, the symptom shown by the calendar
async function setUp(app: App): Promise<void> {
	await app.start();
	await app.addSymptom('Tête');
	await app.addSymptom('Ventre');
	await app.targetSymptom('Tête');
	await app.goToTimeline();
	await app.setDayIntensity(6);
	await app.goToCalendar();
}

// Share button of the calendar: the sheet, once its image is drawn
async function openShareSheet(page: Page): Promise<void> {
	await page.locator('.share-month-button').click();
	await expect(page.locator('.share-month .share-preview img')).toBeVisible({ timeout: 15_000 });
}

// Pixels of the color of the sleep (#5C6BC0) in the preview image: the bars or the curve really drawn
function sleepPixels(page: Page): Promise<number> {
	return page.locator('.share-month .share-preview img').evaluate((img: HTMLImageElement) => {
		const canvas = document.createElement('canvas');
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const context = canvas.getContext('2d');
		context.drawImage(img, 0, 0);
		const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
		let count = 0;
		for (let i = 0; i < data.length; i += 4) {
			if (Math.abs(data[i] - 92) < 12 && Math.abs(data[i + 1] - 107) < 12 && Math.abs(data[i + 2] - 192) < 12) {
				count++;
			}
		}
		return count;
	});
}

function previewSize(page: Page): Promise<number[]> {
	return page.locator('.share-month .share-preview img')
		.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
}

// Image of the month of a symptom, shared from the calendar of the V2 (next to Year in Pixels)
test.describe('Share of the month as an image', () => {

	test('the image of the month and its message go to the share sheet of the browser', async ({ app, page }) => {
		await recordWebShare(page);
		await setUp(app);
		await expect(page.locator('.share-month-button')).toHaveText(/Partager/);
		await openShareSheet(page);

		const sheet = page.locator('.share-month');
		await expect(sheet.locator('.title')).toHaveText('Partager le mois');
		// 1080 x 1350, the 4:5 of the messaging apps
		expect(await previewSize(page)).toEqual([1080, 1350]);
		// Only Tête has an intensity, and no night: nothing to choose
		await expect(sheet.locator('.share-choice')).toHaveCount(0);
		// What the image shows
		const card = sheet.locator('.share-card-stage .month-share-card');
		await expect(card.locator('.card-month')).toHaveText('Mars 2026');
		await expect(card.locator('.card-month')).toHaveCSS('color', BRAND_GREEN);
		await expect(card.locator('.card-site')).toHaveCSS('color', BRAND_GREEN);
		await expect(card.locator('.card-title')).toHaveText('Tête');
		await expect(card.locator('.card-day')).toHaveCount(31 + 0);
		await expect(card.locator('.card-day', { hasText: /^18$/ })).toHaveClass(/color-pain-3/);
		await expect(card.locator('.card-stat')).toHaveText(['1javec symptôme', '6/10moyenne', '6/10maximum']);
		await expect(card.locator('.card-footer')).toContainText('life-notes.fr');
		await expect(sheet.locator('.actions')).toBeInViewport({ ratio: 1 });

		await sheet.locator('.confirm-button').click();
		await expect(sheet).toHaveCount(0);
		const [shared] = await page.evaluate(() => (window as any).webShares);
		expect(shared.text).toBe(SHARED_TEXT);
		expect(shared.title).toBe('Tête – Mars 2026');
		expect(shared.files.map(file => [file.name, file.type])).toEqual([['life-notes-2026-03.png', 'image/png']]);
		expect(pngSize(Buffer.from(shared.files[0].header))).toEqual({ width: 1080, height: 1350 });
	});

	test('without the share sheet of the browser, the image is downloaded', async ({ app, page }) => {
		await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }));
		await setUp(app);
		await openShareSheet(page);
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.locator('.share-month .confirm-button').click()
		]);
		expect(download.suggestedFilename()).toBe('life-notes-2026-03.png');
		const chunks: Buffer[] = [];
		for await (const chunk of await download.createReadStream()) {
			chunks.push(chunk as Buffer);
		}
		expect(pngSize(Buffer.concat(chunks))).toEqual({ width: 1080, height: 1350 });
	});

	test('on Android, the image is written in the cache then given to the share sheet with its message',
		async ({ app, page }) => {
			await recordNativeCalls(page);
			await setUp(app);
			await pretendNative(page);
			await openShareSheet(page);
			await page.locator('.share-month .confirm-button').click();
			await expect(page.locator('.share-month')).toHaveCount(0);

			const calls = await page.evaluate(() => (window as any).nativeCalls);
			expect(calls.map(call => `${call.plugin}.${call.method}`)).toEqual(['Filesystem.writeFile', 'Share.share']);
			const [write, share] = calls.map(call => call.options);
			// Cache of the app: shared through its FileProvider (cache-path of file_paths.xml)
			expect(write.path).toBe('life-notes-2026-03.png');
			expect(write.directory).toBe('CACHE');
			expect(write.encoding).toBeUndefined();
			expect(pngSize(Buffer.from(write.data, 'base64'))).toEqual({ width: 1080, height: 1350 });
			expect(share).toEqual({
				title: 'Tête – Mars 2026',
				text: SHARED_TEXT,
				files: ['file:///data/user/0/com.sebferrer.life_notes/cache/life-notes-2026-03.png'],
				dialogTitle: 'Tête – Mars 2026'
			});
		});

	test('on Android, leaving the share sheet without choosing an app keeps the sheet, without error',
		async ({ app, page }) => {
			await recordNativeCalls(page, { cancel: true });
			await setUp(app);
			await pretendNative(page);
			await openShareSheet(page);
			await page.locator('.share-month .confirm-button').click();
			await expect.poll(() => page.evaluate(() => (window as any).nativeCalls.length)).toBe(2);
			const sheet = page.locator('.share-month');
			await expect(sheet.locator('.confirm-button')).toBeEnabled();
			await expect(sheet.locator('.share-error')).toHaveCount(0);
		});

	test('the image can be saved, the sheet stays open to share it', async ({ app, page }) => {
		await recordWebShare(page);
		await setUp(app);
		await openShareSheet(page);
		const sheet = page.locator('.share-month');
		const saveButton = sheet.locator('.save-button');
		await expect(saveButton).toHaveText(/Enregistrer/);
		const [download] = await Promise.all([page.waitForEvent('download'), saveButton.click()]);
		expect(download.suggestedFilename()).toBe('life-notes-2026-03.png');
		const chunks: Buffer[] = [];
		for await (const chunk of await download.createReadStream()) {
			chunks.push(chunk as Buffer);
		}
		expect(pngSize(Buffer.concat(chunks))).toEqual({ width: 1080, height: 1350 });

		// Saved once: said on the button; the share still possible
		await expect(saveButton).toHaveText(/Enregistrée/);
		await expect(saveButton).toBeDisabled();
		await sheet.locator('.confirm-button').click();
		await expect(sheet).toHaveCount(0);
		expect(await page.evaluate(() => (window as any).webShares.length)).toBe(1);
	});

	test('on Android, the image is saved through the "Save as" of the system, as the PDF report',
		async ({ app, page }) => {
			await recordNativeCalls(page);
			await setUp(app);
			await pretendNative(page);
			await openShareSheet(page);
			const sheet = page.locator('.share-month');
			await sheet.locator('.save-button').click();
			await expect(sheet.locator('.save-button')).toHaveText(/Enregistrée/);

			const calls = await page.evaluate(() => (window as any).nativeCalls);
			expect(calls.map(call => `${call.plugin}.${call.method}`)).toEqual(['Filesystem.writeFile', 'FileSaver.saveFile']);
			expect(calls[0].options.directory).toBe('CACHE');
			expect(pngSize(Buffer.from(calls[0].options.data, 'base64'))).toEqual({ width: 1080, height: 1350 });
			expect(calls[1].options).toEqual({
				path: 'file:///data/user/0/com.sebferrer.life_notes/cache/life-notes-2026-03.png',
				filename: 'life-notes-2026-03.png',
				contentType: 'image/png'
			});
		});

	test('on Android, leaving the "Save as" without saving is no error', async ({ app, page }) => {
		await recordNativeCalls(page, { cancel: true });
		await setUp(app);
		await pretendNative(page);
		await openShareSheet(page);
		const sheet = page.locator('.share-month');
		await sheet.locator('.save-button').click();
		await expect.poll(() => page.evaluate(() => (window as any).nativeCalls.length)).toBe(2);
		await expect(sheet.locator('.save-button')).toHaveText(/Enregistrer$/);
		await expect(sheet.locator('.save-button')).toBeEnabled();
		await expect(sheet.locator('.share-error')).toHaveCount(0);
	});

	test('the symptom of the image can be chosen among the ones with intensities', async ({ app, page }) => {
		await recordWebShare(page);
		await setUp(app);
		await app.targetSymptom('Ventre');
		await app.goToTimeline();
		await app.setDayIntensity(2, YESTERDAY);
		await app.goToCalendar();
		await openShareSheet(page);

		// The symptom shown by the calendar first, chosen
		const sheet = page.locator('.share-month');
		const choices = sheet.locator('.share-choice');
		await expect(choices).toHaveText(['Ventre', 'Tête']);
		await expect(choices.nth(0)).toHaveAttribute('aria-checked', 'true');
		const card = sheet.locator('.share-card-stage .month-share-card');
		await expect(card.locator('.card-title')).toHaveText('Ventre');
		const ventreImage = await sheet.locator('.share-preview img').getAttribute('src');

		await choices.nth(1).click();
		await expect(choices.nth(1)).toHaveAttribute('aria-checked', 'true');
		await expect(card.locator('.card-title')).toHaveText('Tête');
		await expect(sheet.locator('.share-preview img')).toBeVisible({ timeout: 15_000 });
		expect(await sheet.locator('.share-preview img').getAttribute('src')).not.toBe(ventreImage);

		await sheet.locator('.confirm-button').click();
		await expect(sheet).toHaveCount(0);
		const [shared] = await page.evaluate(() => (window as any).webShares);
		expect(shared.text).toBe(SHARED_TEXT);
	});

	test('a past month is compared to the one before, when it is better', async ({ app, page }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		// February: 2 days with Tête, January: 3 (intensities saved from 0 to 5)
		await page.addScriptTag({ path: 'node_modules/pouchdb/dist/pouchdb.min.js' });
		await page.evaluate(async () => {
			const PouchDB = (window as any).PouchDB;
			const symptoms = await new PouchDB('symptoms').allDocs({ include_docs: true });
			const key = symptoms.rows.map(row => row.doc).find(doc => doc.label === 'Tête').key;
			const pains: { [date: string]: number } = {
				'2026-01-05': 2, '2026-01-06': 3, '2026-01-07': 1, '2026-02-10': 2, '2026-02-11': 4, '2026-02-12': 0
			};
			await new PouchDB('days').bulkDocs(Object.entries(pains).map(([date, pain]) => {
				const [year, month, day] = date.split('-').map(Number);
				return {
					_id: date, date, symptomOverviews: [{ key, pain }], logs: [], symptoms: [], meds: [], meals: [],
					sports: [], customs: [], wakeUp: '', goToBed: '',
					detailedDate: { day, month, year, formattedDate: date }
				};
			}));
		});
		await app.reload();
		await app.goToCalendar();
		await page.locator('.month-nav').first().click();
		await expect(page.locator('.calendar-header-label')).toHaveText('février 2026');
		await openShareSheet(page);

		const card = page.locator('.share-month .share-card-stage .month-share-card');
		await expect(card.locator('.card-month')).toHaveText('Février 2026');
		// The days of February, not those of the month shown before
		await expect(card.locator('.card-day:not(.empty)')).toHaveCount(28);
		await expect(card.locator('.card-stat.improvement')).toHaveText('−1jvs janvier');
	});

	test('the symptom shown by the calendar comes first, even when the target symptom changed on the calendar',
		async ({ app, page }) => {
			await setUp(app);
			await app.targetSymptom('Ventre');
			await app.goToTimeline();
			await app.setDayIntensity(2, YESTERDAY);
			await app.goToCalendar();
			// Back to Tête from the toolbar, without leaving the calendar: its grid follows, the share too
			await app.targetSymptom('Tête');
			await expect(page.locator('.day-cell.today')).toHaveClass(/color-pain-3/);
			await openShareSheet(page);
			const choices = page.locator('.share-month .share-choice');
			await expect(choices).toHaveText(['Tête', 'Ventre']);
			await expect(choices.nth(0)).toHaveAttribute('aria-checked', 'true');
			await expect(page.locator('.share-month .share-card-stage .card-title')).toHaveText('Tête');
		});

	// The arrows change the month of the header at once, its days come from the database later: the share waits for
	// them, else the image would have the name of a month with the days of the other one. The days are never slow
	// enough here: the month of the header is changed alone, as during that time (ng: development build of the tests).
	test('while the days of another month load, the share waits for them', async ({ app, page }) => {
		await setUp(app);
		await page.evaluate(() => {
			const ng = (window as any).ng;
			const calendar = ng.getComponent(document.querySelector('app-calendar'));
			calendar.month = 4;
			ng.applyChanges(calendar);
		});
		await expect(page.locator('.share-month-button')).toBeDisabled();
		await page.evaluate(() => (window as any).ng.getComponent(document.querySelector('app-calendar')).openShareSheet());
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
	});

	test('the PDF report of the same month is one tap away', async ({ app, page }) => {
		await setUp(app);
		await openShareSheet(page);
		await page.locator('.share-month .pdf-button').click();
		// With the mode of the sleep card of the calendar
		await expect(page).toHaveURL(/#\/monthlyreport\/2026-3\?sleep=bars$/);
		await expect(page.locator('.modern-report .report-title')).toHaveText('Mars 2026');
		await expect(page.locator('.share-month')).toHaveCount(0);
		// The name of the app and the line under the title in the green of the logo
		await expect(page.locator('.modern-report .report-brand')).toHaveCSS('color', BRAND_GREEN);
		await expect(page.locator('.modern-report .report-header')).toHaveCSS('border-bottom-color', BRAND_GREEN);
	});

	test('the sleep of the month can be shared too, after the symptoms', async ({ app, page }) => {
		await recordWebShare(page);
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.setDayIntensity(6);
		// 23:00 to 07:15: a night of 8 h 15
		await app.setSleepTime('goToBed', '23:00', YESTERDAY);
		await app.setSleepTime('wakeUp', '07:15', TODAY);
		await app.goToCalendar();
		await openShareSheet(page);

		const sheet = page.locator('.share-month');
		const choices = sheet.locator('.share-choice');
		await expect(choices).toHaveText(['Tête', 'bedtimeSommeil']);
		await choices.nth(1).click();
		await expect(choices.nth(1)).toHaveAttribute('aria-checked', 'true');
		await expect(sheet.locator('.share-preview img')).toBeVisible({ timeout: 15_000 });

		// The sleep card of the calendar: its figures, the durations and the schedule of the nights, as bars (the setting)
		const card = sheet.locator('.share-card-stage .month-share-card');
		await expect(card.locator('.card-title')).toHaveText('Sommeil');
		await expect(card.locator('.card-days')).toHaveCount(0);
		await expect(card.locator('.sleep-figure .sleep-value')).toHaveText(['8 h 15', '23:00', '07:15']);
		await expect(card.locator('.sleep-chart-title')).toHaveText(['Durée des nuits', 'Horaires des nuits']);
		await expect(card.locator('.durations .legend-item').first()).toHaveText('7 à 9 h');
		// Taller than the image of a symptom, the charts really drawn on it
		const [width, height] = await previewSize(page);
		expect(width).toBe(1080);
		expect(height).toBeGreaterThan(1350);
		expect(await sleepPixels(page)).toBeGreaterThan(5000);

		await sheet.locator('.confirm-button').click();
		await expect(sheet).toHaveCount(0);
		const [shared] = await page.evaluate(() => (window as any).webShares);
		expect(shared.text).toBe('Mon sommeil en mars 2026, avec Life Notes : https://life-notes.fr');
		expect(shared.title).toBe('Sommeil – Mars 2026');
	});

	// Two nights: 17th (23:00 to 07:00) and 18th (23:30 to 07:15)
	async function addTwoNights(app: App): Promise<void> {
		await app.setSleepTime('goToBed', '23:00', shiftDate(TODAY, -2));
		await app.setSleepTime('wakeUp', '07:00', YESTERDAY);
		await app.setSleepTime('goToBed', '23:30', YESTERDAY);
		await app.setSleepTime('wakeUp', '07:15', TODAY);
	}

	test('the sleep is drawn in the mode of the sleep card, the PDF report opened from the share too',
		async ({ app, page }) => {
			await app.start();
			await app.addSymptom('Tête');
			await app.goToTimeline();
			await addTwoNights(app);
			await app.goToCalendar();
			// Curves, with the buttons of the card (the setting stays on bars)
			await page.locator('app-sleep-stats .mode-button.curves').click();
			await openShareSheet(page);

			const card = page.locator('.share-month .share-card-stage .month-share-card');
			await expect(card.locator('.card-title')).toHaveText('Sommeil');
			// Both charts as curves
			await expect(card.locator('.durations .legend-item')).toHaveText(['Durée', 'Zone conseillée']);
			await expect(card.locator('.schedule .legend-item')).toHaveText(['Coucher', 'Réveil', 'Nuit']);
			await expect(card.locator('.sleep-figure.duration .sleep-value')).toHaveText('7 h 53');
			// Drawn on the image, not only in the page: the duration curve between the two nights
			expect(await sleepPixels(page)).toBeGreaterThan(80);

			await page.locator('.share-month .pdf-button').click();
			await expect(page).toHaveURL(/#\/monthlyreport\/2026-3\?sleep=curves$/);
			const sleep = page.locator('.modern-report app-sleep-stats');
			await expect(sleep.locator('.durations .legend-item')).toHaveText(['Durée', 'Zone conseillée']);
		});

	test('the sleep follows the mode of the setting, and goes back to it on the next visit', async ({ app, page }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.goToTimeline();
		await addTwoNights(app);
		await app.goToSettings('Apparence');
		await app.chooseRadio('Courbes', 'Graphiques du sommeil');
		await app.goToCalendar();
		await openShareSheet(page);
		// First item of the legend of the durations: 'Durée' as curves, '7 à 9 h' as bars
		const mode = page.locator('.share-month .share-card-stage .durations .legend-item').first();
		await expect(mode).toHaveText('Durée');
		await page.locator('.share-month .sheet-close-button').click();
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);

		// Bars with the buttons of the card, for this visit only
		await page.locator('app-sleep-stats .mode-button.bars').click();
		await openShareSheet(page);
		await expect(mode).toHaveText('7 à 9 h');
		await page.locator('.share-month .sheet-close-button').click();
		await app.goToTimeline();
		await app.goToCalendar();
		await openShareSheet(page);
		await expect(mode).toHaveText('Durée');
	});

	test('a month with nights but no intensity shares its sleep', async ({ app, page }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.goToTimeline();
		// 00:30 to 06:00: a short night of 5 h 30, out of the advised zone
		await app.setSleepTime('goToBed', '00:30', YESTERDAY);
		await app.setSleepTime('wakeUp', '06:00', TODAY);
		await app.goToCalendar();
		await openShareSheet(page);
		const sheet = page.locator('.share-month');
		await expect(sheet.locator('.share-choice')).toHaveCount(0);
		await expect(sheet.locator('.share-card-stage .card-title')).toHaveText('Sommeil');
		await expect(sheet.locator('.share-card-stage .sleep-figure.duration .sleep-value')).toHaveText('5 h 30');
	});

	test('the cross closes the sheet', async ({ app, page }) => {
		await setUp(app);
		await openShareSheet(page);
		await page.locator('.share-month .sheet-close-button').click();
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
	});

	test('no share for a month without intensity, nor in the calendar of the V1', async ({ app, page }) => {
		await setUp(app);
		// April: nothing entered
		await page.locator('.month-nav').last().click();
		await expect(page.locator('.calendar-header-label')).toHaveText('avril 2026');
		await expect(page.locator('.share-month-button')).toHaveCount(0);
		await expect(page.locator('.year-in-pixels-button')).toBeVisible();

		await app.setUiVersion('V1');
		await app.goToCalendar();
		await expect(page.locator('.classic-calendar')).toBeVisible();
		await expect(page.locator('.share-month-button')).toHaveCount(0);
	});
});

// Year in Pixels of the calendar: the button of its header once the year is drawn, then the sheet and its image
async function openShareYearSheet(page: Page): Promise<void> {
	await page.locator('.year-in-pixels-button').click();
	await expect(page.locator(`#pixel-${TODAY}`)).toBeVisible();
	await page.locator('.share-year-button').click();
	await expect(page.locator('.share-year .share-preview img')).toBeVisible({ timeout: 15_000 });
}

// Pixels of the preview image close to a color ("rgb(r, g, b)")
function colorPixels(page: Page, color: string): Promise<number> {
	const [r, g, b] = color.match(/\d+/g).map(Number);
	return page.locator('.share-year .share-preview img').evaluate((img: HTMLImageElement, rgb) => {
		const canvas = document.createElement('canvas');
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const context = canvas.getContext('2d');
		context.drawImage(img, 0, 0);
		const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
		let count = 0;
		for (let i = 0; i < data.length; i += 4) {
			if (Math.abs(data[i] - rgb[0]) < 6 && Math.abs(data[i + 1] - rgb[1]) < 6 && Math.abs(data[i + 2] - rgb[2]) < 6) {
				count++;
			}
		}
		return count;
	}, [r, g, b]);
}

// Image of Year in Pixels of a symptom (V2), as the one of a month
test.describe('Share of the year as an image', () => {

	test('the image of the year and its message go to the share sheet of the browser', async ({ app, page }) => {
		await recordWebShare(page);
		await setUp(app);
		await openShareYearSheet(page);

		const sheet = page.locator('.share-year');
		await expect(sheet.locator('.title')).toHaveText('Partager l\'année');
		expect(await page.locator('.share-year .share-preview img')
			.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([1080, 1350]);
		// Only Tête has an intensity: nothing to choose
		await expect(sheet.locator('.share-choice')).toHaveCount(0);

		// What the image shows: a column per month, a pixel per day
		const card = sheet.locator('.share-card-stage .year-share-card');
		await expect(card.locator('.card-month')).toHaveText('2026');
		await expect(card.locator('.card-month')).toHaveCSS('color', BRAND_GREEN);
		await expect(card.locator('.card-title')).toHaveText('Tête');
		await expect(card.locator('.card-month-initial')).toHaveText(['j', 'f', 'm', 'a', 'm', 'j', 'j', 'a', 's', 'o', 'n', 'd']);
		await expect(card.locator('.card-pixel')).toHaveCount(12 * 31);
		const march = card.locator('.card-pixel-month').nth(2).locator('.card-pixel');
		// Today 6/10; the days before without intensity, those to come neutral
		await expect(march.nth(17)).toHaveClass(/color-pain-3/);
		await expect(march.nth(16)).toHaveClass(/color-default/);
		await expect(march.nth(18)).toHaveClass(/color-none/);
		// 30th of February
		await expect(card.locator('.card-pixel-month').nth(1).locator('.card-pixel').nth(29)).toHaveClass(/color-missing/);
		await expect(card.locator('.card-stat')).toHaveText(['1javec symptôme', '6/10moyenne', '6/10maximum']);
		await expect(card.locator('.card-footer')).toContainText('life-notes.fr');
		await expect(sheet.locator('.actions')).toBeInViewport({ ratio: 1 });

		// The day really drawn in the image, in its color
		const dayColor = await march.nth(17).evaluate(pixel => getComputedStyle(pixel).backgroundColor);
		expect(await colorPixels(page, dayColor)).toBeGreaterThan(500);

		await sheet.locator('.confirm-button').click();
		await expect(sheet).toHaveCount(0);
		const [shared] = await page.evaluate(() => (window as any).webShares);
		expect(shared.text).toBe('Mon suivi « Tête » en 2026, avec Life Notes : https://life-notes.fr');
		expect(shared.title).toBe('Tête – 2026');
		expect(shared.files.map(file => [file.name, file.type])).toEqual([['life-notes-2026.png', 'image/png']]);
		expect(pngSize(Buffer.from(shared.files[0].header))).toEqual({ width: 1080, height: 1350 });
	});

	test('the symptom shown by the page first, the others to choose; the image saved', async ({ app, page }) => {
		await setUp(app);
		await app.targetSymptom('Ventre');
		await app.goToTimeline();
		await app.setDayIntensity(4, YESTERDAY);
		await app.targetSymptom('Tête');
		await app.goToCalendar();
		await openShareYearSheet(page);

		const sheet = page.locator('.share-year');
		const card = sheet.locator('.share-card-stage .year-share-card');
		await expect(sheet.locator('.share-choice')).toHaveText(['Tête', 'Ventre']);
		await expect(sheet.locator('.share-choice.selected')).toHaveText('Tête');
		await sheet.locator('.share-choice', { hasText: 'Ventre' }).click();
		await expect(card.locator('.card-title')).toHaveText('Ventre');
		await expect(card.locator('.card-pixel-month').nth(2).locator('.card-pixel').nth(16)).toHaveClass(/color-pain-2/);
		await expect(sheet.locator('.share-preview img')).toBeVisible({ timeout: 15_000 });

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			sheet.locator('.save-button').click()
		]);
		expect(download.suggestedFilename()).toBe('life-notes-2026.png');
		const chunks: Buffer[] = [];
		for await (const chunk of await download.createReadStream()) {
			chunks.push(chunk as Buffer);
		}
		expect(pngSize(Buffer.concat(chunks))).toEqual({ width: 1080, height: 1350 });
		await expect(sheet.locator('.save-button')).toContainText('Enregistrée');
		await sheet.locator('.sheet-close-button').click();
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
	});

	test('no share for a year without intensity, nor in the V1', async ({ app, page }) => {
		await setUp(app);
		await page.locator('.year-in-pixels-button').click();
		await expect(page.locator('.share-year-button')).toBeVisible();
		// 2025: nothing entered
		await page.locator('.year-nav').first().click();
		await expect(page.locator('.year-header .year')).toHaveText('2025');
		await expect(page.locator('.share-year-button')).toHaveCount(0);

		await app.setUiVersion('V1');
		await page.goto('/#/yearinpixels/2026');
		await expect(page.locator(`#pixel-${TODAY}`)).toBeVisible();
		await expect(page.locator('.share-year-button')).toHaveCount(0);
	});
});
