import { test, expect, TODAY, YESTERDAY, shiftDate } from '../support/app';

test.describe('Manage menu', () => {

	test('opens the five lists', async ({ app, page }) => {
		await app.start();
		await app.goToManage();
		// Then the creation of a new event type
		await expect(page.locator('.manage-tile'))
			.toHaveText([/Symptômes/, /Repas/, /Médicaments/, /Sport/, /Notes/, /Nouveau type/]);
		for (const [tile, route] of [['symptomLog', 'symptoms'], ['meal', 'meals'], ['med', 'meds'], ['log', 'logs'],
			['sport', 'sports']]) {
			await app.goToManage(tile as any);
			await expect(page).toHaveURL(new RegExp(`#/${route}$`));
		}
	});

	// V1: the former tiles keep their place, the meals come after them
	test('the V1 keeps the former order of the tiles', async ({ app, page }) => {
		await app.start();
		await app.setUiVersion('V1');
		await app.goToManage();
		await expect(page.locator('.manage-tile'))
			.toHaveText([/Symptômes/, /Médicaments/, /Notes/, /Sport/, /Repas/, /Nouveau type/]);
	});

	test('empty lists explain how to fill them', async ({ app, page }) => {
		await app.start();
		await app.goToManage('med');
		await expect(page.locator('.manage-list-empty')).toContainText("Il n'y a pas de médicament enregistré ici");
	});

	test.describe('with entries', () => {

		test.beforeEach(async ({ app }) => {
			await app.start();
			await app.addSymptom('Tête');
			await app.targetSymptom('Tête');
			await app.goToTimeline();
			await app.addEvent('med', { key: 'Doliprane', quantity: '1000' }, YESTERDAY);
			await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
			await app.addEvent('log', { key: 'Mauvaise nuit' });
			await app.addEvent('sport', { key: 'Course à pied' });
			await app.addEvent('meal', { key: 'Pâtes' }, YESTERDAY);
			await app.addEvent('meal', { key: 'Pâtes' });
		});

		test('medications are listed with their dose, count and last date', async ({ app, page }) => {
			await app.goToManage('med');
			const item = page.locator('.manage-item');
			await expect(item).toHaveCount(1);
			await expect(item.locator('.manage-item-title')).toHaveText('Doliprane');
			await expect(item.locator('.manage-item-meta').first()).toContainText('1000 mg');
			await expect(item.locator('.manage-item-meta').first()).toContainText('2 fois');
			await expect(item.locator('.manage-item-meta').nth(1)).toHaveText('Dernière fois le 18 mars 2026');
		});

		test('the history lists every entry', async ({ app, page }) => {
			await app.goToManage('med');
			await page.locator('.manage-item-actions button').nth(0).click();
			await page.locator('.occurrence-history .list-tab').click();
			await expect(page.locator('.occurrence-history .occurrence-item')).toHaveCount(2);
		});

		test('a renamed medication is renamed in the timeline too', async ({ app, page }) => {
			await app.goToManage('med');
			await page.locator('.manage-item-actions button').nth(1).click();
			const sheet = page.locator('.edit-med');
			await sheet.locator('input').first().fill('Paracétamol');
			await sheet.locator('.confirm-button').click();
			await expect(page.locator('.manage-item-title')).toHaveText('Paracétamol');
			await app.goToTimeline();
			await expect(app.eventRows(TODAY, 'med').locator('.event-card-title')).toHaveText('Paracétamol');
		});

		test('a deleted medication disappears from the timeline too', async ({ app, page }) => {
			await app.goToManage('med');
			await page.locator('.manage-item-actions button').nth(2).click();
			await page.locator('.delete-overview .delete-button').click();
			await expect(page.locator('.manage-list-empty')).toBeVisible();
			await app.goToTimeline();
			await expect(app.eventRows(TODAY, 'med')).toHaveCount(0);
			await expect(app.eventRows(YESTERDAY, 'med')).toHaveCount(0);
			await expect(app.eventRows(TODAY, 'log')).toHaveCount(1);
		});

		test('notes and sports have their own list', async ({ app, page }) => {
			await app.goToManage('log');
			await expect(page.locator('.manage-item-title')).toHaveText(['Mauvaise nuit']);
			await app.goToManage('sport');
			await expect(page.locator('.manage-item-title')).toHaveText(['Course à pied']);
		});

		test('meals are listed, with their history, and can be renamed or deleted', async ({ app, page }) => {
			await app.goToManage('meal');
			const item = page.locator('.manage-list-page.meal .manage-item');
			await expect(item.locator('.manage-item-title')).toHaveText(['Pâtes']);
			await expect(item.locator('.manage-item-meta').first()).toHaveText('2 fois');
			await expect(item.locator('.manage-item-meta').nth(1)).toHaveText('Dernière fois le 18 mars 2026');

			// History, with the icon of the meals
			await item.locator('.manage-item-actions button').nth(0).click();
			const history = page.locator('.occurrence-history');
			await expect(history.locator('.main-title')).toHaveText('Pâtes');
			await expect(history.locator('.icon-bubble .svg-icon.meal')).toBeVisible();
			await expect(history.locator('app-occurrence-stats .stats-figure .stats-value').first()).toHaveText('2');
			await history.locator('.list-tab').click();
			await expect(history.locator('.occurrence-item')).toHaveCount(2);
			await history.locator('.close-button').click();
			await expect(history).toBeHidden();

			// Renamed in the timeline too
			await item.locator('.manage-item-actions button').nth(1).click();
			const sheet = page.locator('.edit-log');
			await expect(sheet.locator('.title')).toHaveText('Éditer un repas');
			await sheet.locator('input').fill('Riz');
			await sheet.locator('.confirm-button').click();
			await expect(item.locator('.manage-item-title')).toHaveText(['Riz']);
			await app.goToTimeline();
			await expect(app.eventRows(TODAY, 'meal').locator('.event-card-title')).toHaveText('Riz');

			// Deleted from the timeline too
			await app.goToManage('meal');
			await item.locator('.manage-item-actions button').nth(2).click();
			await expect(page.locator('.delete-overview .title')).toHaveText('Supprimer un repas');
			await page.locator('.delete-overview .delete-button').click();
			await expect(page.locator('.manage-list-empty')).toContainText("Il n'y a pas de repas enregistré ici");
			await app.goToTimeline();
			await expect(app.eventRows(TODAY, 'meal')).toHaveCount(0);
			await expect(app.eventRows(YESTERDAY, 'meal')).toHaveCount(0);
			await expect(app.eventRows(TODAY, 'log')).toHaveCount(1);
		});

		test('a meal already entered is suggested', async ({ app, page }) => {
			await app.dayCard().locator('.add-event').click();
			await app.addMenuEntry('Repas').click();
			const input = page.locator('.bottom-sheet-container.meal .form-fields-group input').first();
			await input.fill('pâ');
			const option = page.locator('.mat-autocomplete-panel.suggestions-panel.meal mat-option');
			await expect(option).toHaveText(['Pâtes']);
			await expect(option.locator('.match')).toHaveText('Pâ');
			await option.click();
			await expect(input).toHaveValue('Pâtes');
		});

		test('a meal deleted from the timeline is counted once less', async ({ app, page }) => {
			await app.eventRows(TODAY, 'meal').click();
			await page.locator('.delete-button').click();
			await page.locator('.delete-timeline-event .confirm-button').click();
			await expect(app.eventRows(TODAY, 'meal')).toHaveCount(0);
			await app.goToManage('meal');
			await expect(page.locator('.manage-item .manage-item-meta').first()).toHaveText('1 fois');
		});

		test('the back arrow of a list returns to the manage menu', async ({ app, page }) => {
			await app.goToManage('sport');
			await page.locator('.manage-list-header button[routerlink="/manage"]').click();
			await expect(page).toHaveURL(/#\/manage$/);
		});
	});
});

// The sheet of an event opens on its statistics, its history is the other tab
test.describe('Statistics of an event', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.goToTimeline();
	});

	test('a medication: key figures, evolution by week or month, hours of the day', async ({ app, page }) => {
		const med = { key: 'Doliprane', quantity: '1000' };
		await page.clock.setFixedTime(new Date(`${TODAY}T08:00:00`));
		await app.addEvent('med', med);
		await app.addEvent('med', med, YESTERDAY);
		await page.clock.setFixedTime(new Date(`${TODAY}T20:00:00`));
		await app.addEvent('med', med);
		await app.addEvent('med', med, shiftDate(TODAY, -40));

		await app.goToManage('med');
		await page.locator('.manage-item-actions button').nth(0).click();
		const sheet = page.locator('.occurrence-history');
		await expect(sheet.locator('.stats-tab')).toHaveClass(/active/);
		const stats = sheet.locator('app-occurrence-stats');
		// Total, last 30 days, per week since the first one (7 weeks, starting on sunday)
		await expect(stats.locator('.stats-figure .stats-value')).toHaveText(['4', '3', '0,6']);
		// From the week of the first one
		const evolution = stats.locator('.evolution canvas');
		await expect(evolution).toHaveAttribute('aria-label', 'Occurrences: 1 fév. 1, 15 mars 3');
		await stats.locator('.period-button.month').click();
		await expect(stats.locator('.period-button.month')).toHaveClass(/active/);
		await expect(evolution).toHaveAttribute('aria-label', 'Occurrences: fév. 1, mars 3');
		await expect(stats.locator('.hours canvas')).toHaveAttribute('aria-label', 'Occurrences: 8h 2, 20h 2');

		// History, and back to the statistics after a deletion
		await sheet.locator('.list-tab').click();
		await expect(stats).toHaveCount(0);
		await expect(sheet.locator('.occurrence-item')).toHaveCount(4);
		await sheet.locator('.occurrence-item').last().locator('.occurrence-delete').click();
		await page.locator('app-bottom-sheet-delete-event .confirm-button').click();
		// Reopened on the history
		await expect(sheet.locator('.occurrence-item')).toHaveCount(3);
		await sheet.locator('.stats-tab').click();
		await expect(stats.locator('.stats-figure .stats-value')).toHaveText(['3', '3', '3']);
		await expect(stats.locator('.evolution canvas')).toHaveAttribute('aria-label', 'Occurrences: 15 mars 3');
	});

	test('a type with a quantity: evolution of the quantities', async ({ app, page }) => {
		await app.createCustomType('Eau', { quantity: true, unit: 'L' });
		await app.goToTimeline();
		await app.addCustomEvent('Eau', { quantity: '0,5' });
		await app.addCustomEvent('Eau', { quantity: '1,5' }, YESTERDAY);
		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Eau' }).click();
		await page.locator('.manage-item').first().locator('.manage-item-actions button').nth(0).click();
		const stats = page.locator('.occurrence-history app-occurrence-stats');
		await expect(stats.locator('.stats-figure .stats-value')).toHaveText(['2', '2', '2', '2 L']);
		await expect(stats.locator('.stats-chart-subtitle')).toHaveText('Quantité (L)');
		await expect(stats.locator('.evolution canvas')).toHaveAttribute('aria-label', 'Quantité: 15 mars 2');
	});

	test('a symptom: its entries and the intensities of the days', async ({ app, page }) => {
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('symptomLog');
		await app.addEvent('symptomLog', {}, YESTERDAY);
		await app.setDayIntensity(6);
		await app.setDayIntensity(2, YESTERDAY);
		await app.goToManage('symptomLog');
		await page.locator('.symptom-card', { hasText: 'Tête' }).locator('.stats-btn').click();
		const sheet = page.locator('.occurrence-history');
		await expect(sheet.locator('.main-title')).toHaveText('Tête');
		const stats = sheet.locator('app-occurrence-stats');
		await expect(stats.locator('.stats-figure .stats-value')).toHaveText(['2', '2', '2', '4/10']);
		await expect(stats.locator('.evolution canvas'))
			.toHaveAttribute('aria-label', 'Occurrences: 15 mars 2; Intensité moyenne: 15 mars 4');

		// Its entries can be deleted from the history
		await sheet.locator('.list-tab').click();
		await expect(sheet.locator('.occurrence-item')).toHaveCount(2);
		await sheet.locator('.occurrence-item').first().locator('.occurrence-delete').click();
		await page.locator('app-bottom-sheet-delete-event .confirm-button').click();
		await expect(sheet.locator('.occurrence-item')).toHaveCount(1);
		await sheet.locator('.close-button').click();
		await expect(page.locator('.symptom-card', { hasText: 'Tête' }).locator('.manage-item-meta').first())
			.toHaveText('1 fois');
	});
});

test('the statistics in English, with the 12 hour format', async ({ app, page }) => {
	await app.start();
	await app.goToTimeline();
	// The helpers add the events in French
	await app.addEvent('log', { key: 'Note' });
	await app.goToSettings('Heure');
	await app.settingsPanel('Heure').locator('mat-select').click();
	await page.locator('mat-option', { hasText: '12' }).click();
	await app.goToSettings('Langue');
	await app.settingsPanel('Langue').locator('mat-select').click();
	await page.locator('mat-option', { hasText: 'Anglais' }).click();
	await expect(page.locator('#settings-container .title')).toHaveText('Settings');
	await app.goToManage('log');
	await page.locator('.manage-item-actions button').nth(0).click();
	const sheet = page.locator('.occurrence-history');
	await expect(sheet.locator('.stats-tab')).toHaveText(/Statistics/);
	await expect(sheet.locator('.stats-figure .stats-label')).toHaveText(['In total', 'Last 30 days', 'Per week']);
	await expect(sheet.locator('.hours canvas')).toHaveAttribute('aria-label', 'Occurrences: 10am 1');
});

// The meals entered before their list existed (or imported): the list is built from the days when it is empty
test('the list of the meals is built from the days the first time', async ({ app, page }) => {
	await app.start();
	await app.goToTimeline();
	await app.addEvent('log', { key: 'Note' });
	const { content } = await app.exportBackup();
	const day = (date: string, meals: { time: string, key: string }[]) => ({
		...content.days[0], _id: date, date, logs: [],
		meals: meals.map(meal => ({ type: 'meal', detail: '', ...meal }))
	});
	const days = [
		day(YESTERDAY, [{ time: '12:30', key: 'Salade' }, { time: '19:45', key: 'Soupe' }]),
		day(TODAY, [{ time: '12:15', key: 'Salade' }])
	];
	await app.importBackup({ name: 'backup.json', mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify({ ...content, days })) });
	await page.locator('.import-confirm .confirm-button').click();
	await app.afterImport(async () => {
		await expect(app.eventRows(YESTERDAY, 'meal')).toHaveCount(2);
	});
	await app.goToManage('meal');
	await expect(page.locator('.manage-item-title')).toHaveText(['Salade', 'Soupe']);
	await expect(page.locator('.manage-item', { hasText: 'Salade' }).locator('.manage-item-meta').first())
		.toHaveText('2 fois');
});

// The lists of medications, notes and sports are kept apart from the days: they are rebuilt from the header
test('a list is refreshed from its header, e.g. after an import', async ({ app, page }) => {
	await app.start();
	await app.goToTimeline();
	await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
	const { content } = await app.exportBackup();
	const yesterday = { ...content.days[0], _id: YESTERDAY, date: YESTERDAY,
		detailedDate: { ...content.days[0].detailedDate, day: Number(YESTERDAY.slice(8)) } };
	await app.importBackup({ name: 'backup.json', mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify({ ...content, days: [...content.days, yesterday] })) });
	await page.locator('.import-confirm .confirm-button').click();
	await app.afterImport(async () => {
		await expect(app.eventRows(YESTERDAY, 'med')).toHaveCount(1);
	});

	await app.goToManage('med');
	const meta = page.locator('.manage-item .manage-item-meta').first();
	await expect(meta).toContainText('1 fois');
	// The confirmation is a sheet: its cross closes it without refreshing
	const confirm = page.locator('.confirm-sheet');
	await page.locator('.manage-list-header .manage-list-refresh').click();
	await expect(confirm.locator('.title')).toHaveText('Actualiser vos médicaments');
	await expect(page.locator('mat-dialog-container')).toHaveCount(0);
	await confirm.locator('.sheet-close-button').click();
	await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
	await expect(meta).toContainText('1 fois');
	await page.locator('.manage-list-header .manage-list-refresh').click();
	await confirm.locator('.confirm-button', { hasText: 'Oui' }).click();
	await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
	await expect(meta).toContainText('2 fois');
});
