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

	test('the intensities of the month are shown under the calendar, one ring per symptom', async ({ app, page }) => {
		// 4, 10 and 3 out of 10
		await app.setDayIntensity(4);
		await app.setDayIntensity(10, YESTERDAY);
		await app.setDayIntensity(3, shiftDate(TODAY, -2));
		await app.goToCalendar();
		const card = page.locator('.intensities-card');
		await expect(card.locator('.intensities-title')).toHaveText('Intensités du mois');
		await expect(page.locator('app-pie-chart')).toHaveCount(0);
		const ring = card.locator('app-intensity-ring');
		await expect(ring).toHaveCount(1);
		await expect(ring.locator('.ring-name')).toHaveText('Tête');
		// The days with the symptom in the middle, their average and the highest value under the ring
		await expect(ring.locator('.ring-value')).toHaveText('3j');
		await expect(ring.locator('.ring-label')).toHaveText('avec symptôme');
		await expect(ring.locator('.ring-peak')).toHaveText('moy. 5,7 · max 10');
		await expect(ring.locator('.ring')).toHaveAttribute('aria-label',
			'Tête : Intensité 0 : 28 jours, Intensité 3-4 : 2 jours, Intensité 9-10 : 1 jour');
		// Legend of the 0-10 scale
		await expect(card.locator('.pie-legend .legend-item')).toHaveText(['0', '1-2', '3-4', '5-6', '7-8', '9-10']);

		// A tap on a part tells its days. From the top, clockwise: 28 days at 0 (most of the ring), then 2 days at
		// 3-4 and 1 day at 9-10, just before the top.
		const canvas = ring.locator('canvas');
		const tooltip = ring.locator('.ring-tooltip');
		await canvas.click({ position: { x: 110, y: 59 } });
		await expect(tooltip).toHaveText('Intensité 0 : 28 jours');
		await canvas.click({ position: { x: 39, y: 12 } });
		await expect(tooltip).toHaveText('Intensité 3-4 : 2 jours');
		// For a few seconds
		await expect(tooltip).toHaveCount(0, { timeout: 6000 });
		// The help, in the header, in a sheet
		await card.locator('.intensities-header .help-button').click();
		const help = page.locator('.bottom-sheet-container.info');
		await expect(help.locator('.title')).toHaveText('Graphiques des symptômes');
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);
		await help.locator('.confirm-button').click();
		await expect(help).toBeHidden();
	});

	test('only the symptoms entered in the month have a ring, the others on demand', async ({ app, page }) => {
		await app.addSymptom('Ventre');
		await app.goToTimeline();
		await app.setDayIntensity(4);
		await app.goToCalendar();
		const names = page.locator('.ring-name');
		const showAll = page.locator('.show-all-symptoms');
		await expect(names).toHaveText(['Tête']);
		await expect(showAll).toHaveText(/Afficher tous les symptômes\s*\+1/);
		await expect(page.locator('app-intensity-ring')).toHaveCount(1);
		await expect(page.locator('.pie-legend')).toHaveCount(1);

		await showAll.click();
		await expect(names).toHaveText(['Tête', 'Ventre']);
		await expect(showAll).toContainText('Masquer les symptômes sans saisie');
		// One legend for both
		await expect(page.locator('.pie-legend .legend-item')).toHaveText(['0', '1-2', '3-4', '5-6', '7-8', '9-10']);
		const stomach = page.locator('app-intensity-ring', { hasText: 'Ventre' });
		await expect(stomach.locator('.ring-value')).toHaveText('0j');
		await expect(stomach.locator('.ring-peak')).toHaveText('');
		await showAll.click();
		await expect(names).toHaveText(['Tête']);

		// A month without any entry
		await page.locator('.month-nav').first().click();
		await expect(page.locator('.calendar-header-label')).toHaveText('février 2026');
		await expect(names).toHaveCount(0);
		await expect(page.locator('.no-symptom-entry')).toHaveText('Aucun symptôme saisi ce mois-ci');
		await expect(showAll).toContainText('+2');
		await showAll.click();
		await expect(names).toHaveText(['Tête', 'Ventre']);

		// The V1 shows them all, as pie charts
		await app.setUiVersion('V1');
		await app.goToCalendar();
		await expect(page.locator('.classic-calendar app-pie-chart .chart-label')).toHaveText(['Tête', 'Ventre']);
		await expect(showAll).toHaveCount(0);
		await expect(page.locator('app-intensity-ring, .pie-legend')).toHaveCount(0);
	});

	test('the symptoms of an inverted scale have their own rings and legend', async ({ app, page }) => {
		await app.addSymptom('Ventre');
		await app.addSymptom('Dos');
		await app.addSymptom('Humeur', { invertedScale: true });
		await app.goToCalendar();
		await page.locator('.show-all-symptoms').click();

		const groups = page.locator('.pie-group');
		await expect(groups).toHaveCount(2);
		// The target symptom and the other ones of its scale first, two by two: the third one alone on its row
		await expect(groups.nth(0)).not.toHaveClass(/inverted/);
		await expect(groups.nth(0).locator('.ring-name')).toHaveText(['Tête', 'Dos', 'Ventre']);
		await expect(groups.nth(0).locator('.pie-legend .swatch').first()).toHaveCSS('background-color', 'rgb(138, 245, 156)');
		const rings = groups.nth(0).locator('app-intensity-ring');
		const [first, third] = [await rings.nth(0).boundingBox(), await rings.nth(2).boundingBox()];
		expect(third.y).toBeGreaterThan(first.y + first.height);
		expect(Math.abs(third.width - first.width)).toBeLessThan(2);

		// Then the inverted scale apart: its legend reversed, only the days with a value counted
		await expect(groups.nth(1)).toHaveClass(/inverted/);
		await expect(groups.nth(1).locator('.pie-group-title')).toHaveText('Échelle inversée');
		await expect(groups.nth(1).locator('.ring-name')).toHaveText('Humeur');
		await expect(groups.nth(1).locator('.pie-legend .swatch').first()).toHaveCSS('background-color', 'rgb(178, 34, 34)');
		await expect(groups.nth(1).locator('.ring')).toHaveClass(/empty/);
		await expect(groups.nth(1).locator('.ring-value')).toHaveText('0j');
		await expect(groups.nth(1).locator('.ring-label')).toHaveText('renseigné');
		await expect(groups.nth(1).locator('.ring')).toHaveAttribute('aria-label', 'Humeur : aucun jour renseigné');
	});

	test('the rings of the V2 and the pie charts of the V1 follow the interface version', async ({ app, page }) => {
		await app.setDayIntensity(4);
		await app.goToCalendar();
		await expect(page.locator('.intensities-card app-intensity-ring')).toHaveCount(1);
		await expect(page.locator('app-pie-chart')).toHaveCount(0);

		await app.setUiVersion('V1');
		await app.goToCalendar();
		await expect(page.locator('.classic-calendar app-pie-chart')).toHaveCount(1);
		await expect(page.locator('.intensities-card, app-intensity-ring')).toHaveCount(0);
		// The help in its dialog, as before
		await page.locator('.classic-calendar .help-container button').click();
		await expect(page.locator('mat-dialog-container')).toContainText('Graphiques des symptômes');
		await expect(page.locator('.bottom-sheet-container.info')).toHaveCount(0);
		await page.locator('mat-dialog-container button', { hasText: 'Fermer' }).click();
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);

		await app.setUiVersion('V2');
		await app.goToCalendar();
		await expect(page.locator('.intensities-card app-intensity-ring')).toHaveCount(1);
		await expect(page.locator('app-pie-chart')).toHaveCount(0);
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
		// A day without data is a day without pain, as in the calendar
		await expect(page.locator(`#pixel-${shiftDate(TODAY, -2)}`)).toHaveClass(/color-default/);
		await expect(page.locator('.pixel.color-default')).toHaveCount(31 + 28 + 18 - 2);
		await expect(page.locator('.pixel.no-data')).toHaveCount(0);
		await expect(page.locator('.pixel.future')).toHaveCount(365 - (31 + 28 + 18));
		// Legend of the 0-10 scale
		await expect(page.locator('.legend-item')).toHaveText(['0', '1-2', '3-4', '5-6', '7-8', '9-10']);

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
		await expect(today).toHaveClass(/color-default/);
		await app.targetSymptom('Tête');
		await expect(today).toHaveClass(/color-pain-3/);

		const year = page.locator('.year-label .year');
		await page.locator('.year-nav').first().click();
		await expect(year).toHaveText('2025');
		await expect(page.locator('.pixel.today')).toHaveCount(0);
		await expect(page.locator('.pixel.color-default')).toHaveCount(365);
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

// Wake-up times and bedtimes of the month: one card in V2, the former charts in V1
test.describe('Sleep of the month', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.goToTimeline();
		const twoDaysAgo = shiftDate(TODAY, -2);
		// Night of the 17th: 23:00 to 07:00. Night of the 18th: 00:30 to 07:30.
		await app.setSleepTime('goToBed', '23:00', twoDaysAgo);
		await app.setSleepTime('wakeUp', '07:00', YESTERDAY);
		await app.setSleepTime('goToBed', '00:30', YESTERDAY);
		await app.setSleepTime('wakeUp', '07:30');
	});

	test('the calendar of the V2 sums it up in one card', async ({ app, page }) => {
		await app.goToCalendar();
		const card = page.locator('app-sleep-stats');
		await expect(card.locator('.sleep-value')).toHaveText(['7 h 30', '23:45', '07:15']);
		await expect(card.locator('.sleep-range')).toHaveText(['7 h 00 – 8 h 00', '23:00 – 00:30', '07:00 – 07:30']);
		await expect(card.locator('.durations canvas'))
			.toHaveAttribute('aria-label', 'Durée: 17 mars 8 h 00, 18 mars 7 h 00');
		await expect(card.locator('.schedule canvas'))
			.toHaveAttribute('aria-label', 'Nuit: 17 mars 23:00 → 07:00, 18 mars 00:30 → 07:30');
		await expect(page.locator('app-line-chart')).toHaveCount(0);
		// The legends say what the colors are
		await expect(card.locator('.durations .legend-item'))
			.toHaveText(['7 à 9 h', 'Plus courte ou longue', 'Zone conseillée']);
		await expect(card.locator('.schedule .legend-item')).toHaveText(['Nuit, du coucher au réveil']);

		// Nothing in a month without data
		await page.locator('.month-nav').last().click();
		await expect(page.locator('.calendar-header-label')).toHaveText('avril 2026');
		await expect(card.locator('.sleep-stats')).toHaveCount(0);
	});

	test('the charts can be shown as curves, the mode shown first is a setting of the V2', async ({ app, page }) => {
		await app.goToCalendar();
		const card = page.locator('app-sleep-stats');
		await expect(card.locator('.mode-button.bars')).toHaveClass(/active/);
		await card.locator('.mode-button.curves').click();
		await expect(card.locator('.mode-button.curves')).toHaveClass(/active/);
		await expect(card.locator('.durations .legend-item')).toHaveText(['Durée', 'Zone conseillée']);
		await expect(card.locator('.schedule .legend-item')).toHaveText(['Coucher', 'Réveil', 'Nuit']);
		// Same values
		await expect(card.locator('.durations canvas'))
			.toHaveAttribute('aria-label', 'Durée: 17 mars 8 h 00, 18 mars 7 h 00');
		// The setting is unchanged: bars again on the next visit
		await app.goToTimeline();
		await app.goToCalendar();
		await expect(card.locator('.mode-button.bars')).toHaveClass(/active/);

		const setting = () => app.radio('Courbes', 'Graphiques du sommeil');
		await app.goToSettings('Apparence');
		await app.chooseRadio('Courbes', 'Graphiques du sommeil');
		await expect(setting()).toHaveClass(/mat-radio-checked/);
		await app.reload();
		await app.goToCalendar();
		await expect(card.locator('.mode-button.curves')).toHaveClass(/active/);

		// The PDF report shows the mode of the setting, without the buttons
		await app.goToSettings('Importer / Exporter');
		await page.locator('mat-list-option', { hasText: 'Exporter en PDF' }).click();
		await page.locator('.export-pdf .confirm-button').click();
		const report = page.locator('.modern-report app-sleep-stats');
		await expect(report.locator('.durations .legend-item')).toHaveText(['Durée', 'Zone conseillée']);
		await expect(report.locator('.mode-toggle')).toHaveCount(0);

		// Only for the V2, which has these charts
		await app.setUiVersion('V1');
		await expect(setting()).toHaveCount(0);
	});

	test('the legend of the durations holds on one line on a phone, in French and English', async ({ app, page }) => {
		const oneLine = async (width: number) => {
			await page.setViewportSize({ width, height: 700 });
			const legend = page.locator('app-sleep-stats .durations .sleep-legend');
			await expect(legend.locator('.legend-item')).toHaveCount(3);
			const tops = await legend.locator('.legend-item').evaluateAll(items =>
				items.map(item => Math.round(item.getBoundingClientRect().top)));
			expect(new Set(tops).size).toBe(1);
			// Nothing out of the card either
			expect(await legend.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
		};
		await app.goToCalendar();
		// 360: the screenshots of the listing; 320: a small phone
		await oneLine(360);
		await oneLine(320);

		await app.goToSettings('Langue');
		await app.settingsPanel('Langue').locator('mat-select').click();
		await page.locator('mat-option', { hasText: 'Anglais' }).click();
		await expect(page.locator('#settings-container .title')).toHaveText('Settings');
		await app.goToCalendar();
		await expect(page.locator('app-sleep-stats .durations .legend-item'))
			.toHaveText(['7 to 9 h', 'Shorter or longer', 'Advised zone']);
		await oneLine(360);
		await oneLine(320);
	});

	test('the times follow the 12 hour format', async ({ app, page }) => {
		await app.goToSettings('Heure');
		await app.settingsPanel('Heure').locator('mat-select').click();
		await page.locator('mat-option', { hasText: '12' }).click();
		await app.goToCalendar();
		await expect(page.locator('app-sleep-stats .sleep-value')).toHaveText(['7 h 30', '11:45 PM', '07:15 AM']);
	});

	test('the PDF report of the V2 has the same card', async ({ app, page }) => {
		await app.goToSettings('Importer / Exporter');
		await page.locator('mat-list-option', { hasText: 'Exporter en PDF' }).click();
		await page.locator('.export-pdf .confirm-button').click();
		await expect(page).toHaveURL(/#\/monthlyreport\/2026-0?3$/);
		await expect(page.locator('.modern-report app-sleep-stats .sleep-value')).toHaveText(['7 h 30', '23:45', '07:15']);
	});

	test('the V1 keeps the former charts', async ({ app, page }) => {
		await app.setUiVersion('V1');
		await app.goToCalendar();
		await expect(page.locator('app-line-chart .chart-title')).toHaveText([
			'Vos heures de réveil ce mois-ci', 'Vos heures de coucher ce mois-ci', 'Votre temps de sommeil ce mois-ci'
		]);
		await expect(page.locator('app-sleep-stats')).toHaveCount(0);
	});
});
