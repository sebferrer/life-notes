import { test, expect, App } from '../support/app';
import { importCorrelationDays, openCorrelations } from '../support/correlation-data';

// The symptoms of the generated days, and a day: nothing is saved without any
async function importDays(app: App, count: number): Promise<void> {
	await app.addSymptom('Tête');
	await app.addSymptom('Ventre');
	await app.goToTimeline();
	await app.addEvent('meal', { key: 'Pâtes' });
	await importCorrelationDays(app, count);
}

test.describe('Correlations', () => {

	test('a button of the list of symptoms opens them, in beta, with their help', async ({ app, page }) => {
		await app.start();
		// Not in the manage menu: its tiles are the lists of entries
		await app.goToManage();
		await expect(page.locator('.manage-tile'))
			.toHaveText([/Symptômes/, /Repas/, /Médicaments/, /Sport/, /Notes/, /Nouveau type/]);
		await expect(page.locator('.correlations-button')).toHaveCount(0);

		// The short title of the V2, and on its line a small tonal button with its icon and its name (no gradient, no
		// "beta": their page says it), at the end of the header, apart from the list
		await app.goToManage('symptomLog');
		await expect(page.locator('.manage-list-title')).toHaveText('Symptômes');
		const button = page.locator('.manage-list-header .correlations-button');
		await expect(button.locator('mat-icon')).toHaveText('join_inner');
		await expect(button.locator('.correlations-button-label')).toHaveText('Corrélations');
		await expect(button.locator('.beta-badge')).toHaveCount(0);
		expect(await button.evaluate(element => getComputedStyle(element).backgroundImage)).toBe('none');
		expect(await button.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
		const buttonBox = await button.boundingBox();
		const titleBox = await page.locator('.manage-list-title').boundingBox();
		const addBox = await page.locator('.symptom-card.add-card').boundingBox();
		// On the line of the title, which keeps a single line, on the right as the right edge of the list
		expect(Math.abs((buttonBox.y + buttonBox.height / 2) - (titleBox.y + titleBox.height / 2))).toBeLessThan(4);
		expect(titleBox.height).toBeLessThan(40);
		expect(buttonBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
		expect(Math.abs(buttonBox.x + buttonBox.width - (addBox.x + addBox.width))).toBeLessThan(2);
		await expect(page.locator('.manage-list .correlations-button')).toHaveCount(0);

		await button.click();
		await expect(page).toHaveURL(/#\/correlations$/);
		await expect(page.locator('#menu-icon-manage')).toHaveClass(/active/);
		await expect(page.locator('.correlations-page .beta-badge')).toHaveText('Bêta');
		// Two sentences, one per line
		const intro = page.locator('.correlations-page .intro span');
		await expect(intro).toHaveText(['Des liens repérés dans vos propres saisies.', "Ce n'est pas un diagnostic."]);
		const [first, second] = [await intro.nth(0).boundingBox(), await intro.nth(1).boundingBox()];
		expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1);

		// The information point: what they are, and are not
		await page.locator('.correlations-page .info-button').click();
		const sheet = page.locator('.correlations-help');
		await expect(sheet.locator('.title')).toHaveText('À propos des corrélations');
		await expect(sheet).toContainText('Cette fonctionnalité est en bêta');
		await expect(sheet.locator('.help-part-title')).toHaveText(['Ce qui est comparé',
			"Une corrélation n'est pas une cause", 'Pas un diagnostic', 'Force du signal', 'Vos données restent chez vous']);
		await expect(sheet).toContainText('dans les 6 heures qui suivent la saisie');
		await expect(sheet).toContainText('une nuit trop courte ou trop longue pour vous');
		await expect(sheet).toContainText('pas un avis médical');
		await expect(sheet.locator('.help-level')).toHaveText(['Signal fort', 'Signal modéré', 'Piste faible']);
		await sheet.locator('.confirm-button').click();
		await expect(sheet).toHaveCount(0);

		await page.locator('.correlations-page .back-button').click();
		await expect(page).toHaveURL(/#\/symptoms$/);
	});

	test('a setting hides their buttons', async ({ app, page }) => {
		await app.start();
		await app.addSymptom('Tête');
		await expect(page.locator('.correlations-button')).toBeVisible();
		await app.goToSettings('Symptômes');
		const setting = page.locator('.toggle-container.correlations-toggle');
		await expect(setting.locator('.toggle-label')).toContainText('Afficher les corrélations (bêta)');
		await expect(setting.locator('.toggle-hint'))
			.toHaveText('Le bouton de la liste des symptômes et le lien des statistiques de chaque symptôme.');
		await app.setToggle('Afficher les corrélations', false);

		// Neither the button of the list nor the link of the statistics, even after a restart
		await app.reload();
		await app.goToManage('symptomLog');
		await expect(page.locator('.symptom-card', { hasText: 'Tête' })).toBeVisible();
		await expect(page.locator('.correlations-button')).toHaveCount(0);
		await page.locator('.symptom-card', { hasText: 'Tête' }).locator('.stats-btn').click();
		await expect(page.locator('.occurrence-history')).toBeVisible();
		await expect(page.locator('.occurrence-history .correlations-link')).toHaveCount(0);
		await page.locator('.occurrence-history .close-button').click();

		await app.goToSettings('Symptômes');
		await app.setToggle('Afficher les corrélations', true);
		await app.goToManage('symptomLog');
		await expect(page.locator('.correlations-button')).toBeVisible();
	});

	test('their icons are glyphs of the Material Icons font', async ({ app, page }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.fontsReady();
		const fontLoaded = await page.evaluate(() => Array.from((document as any).fonts as Iterable<FontFace>)
			.some(font => font.family.includes('Material Icons') && font.status === 'loaded'));
		test.skip(!fontLoaded, 'Google Fonts unreachable: the icon names can\'t be checked');
		// Every icon of the page, those of the sleep included: a name unknown to the font stays a word, wider than its box
		const icons = ['join_inner', 'bedtime', 'nights_stay', 'wb_sunny', 'hotel', 'update', 'trending_up', 'trending_down',
			'manage_search', 'hourglass_top', 'compare_arrows', 'call_split', 'medical_services', 'signal_cellular_alt'];
		const unknown = await page.evaluate(names => names.filter(name => {
			const icon = document.createElement('mat-icon');
			icon.className = 'mat-icon material-icons';
			icon.style.cssText = 'font-size: 24px; width: 24px; height: 24px; overflow: hidden; display: inline-block';
			icon.textContent = name;
			document.body.appendChild(icon);
			const wider = icon.scrollWidth > icon.clientWidth + 1;
			icon.remove();
			return wider;
		}), icons);
		expect(unknown).toEqual([]);
	});

	test('without symptom, then without enough days, they say what is missing', async ({ app, page }) => {
		await app.start();
		// The page itself, without symptom
		await page.goto('/#/correlations');
		await expect(page.locator('.state-card.no-symptom')).toContainText('Ajoutez un symptôme');
		await page.locator('.state-card.no-symptom .state-button').click();
		await expect(page).toHaveURL(/#\/symptoms$/);

		await app.addSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('meal', { key: 'Pâtes' });
		await openCorrelations(app);
		const state = page.locator('.state-card.not-enough');
		await expect(state).toContainText('Encore un peu de données');
		await expect(state).toContainText('à partir de 14 jours avec des saisies. Vous en avez 1');
		await expect(state.locator('.progress-label')).toHaveText('1 / 14');
		await expect(page.locator('.correlation-card')).toHaveCount(0);
	});

	test('the links of the data, in sentences, with their figures and their days', async ({ app, page }) => {
		await app.start();
		await importDays(app, 60);
		await openCorrelations(app);

		await expect(page.locator('.summary-title')).toHaveText('60 jours analysés');
		await expect(page.locator('.summary-period')).toHaveText(`Du ${'17/01/2026'} au ${'17/03/2026'}`);

		// The curry, then a stomach ache within the hours after it
		const curry = page.locator('.correlation-card[data-factor="meal:curry"]');
		await expect(curry).toHaveCount(1);
		await expect(curry.locator('.symptom-name')).toHaveText('Ventre');
		await expect(curry.locator('.sentence')).toHaveText('Plus souvent dans les 6 h après « Curry »');
		await expect(curry.locator('.sentence strong')).toHaveText('Curry');
		await expect(curry.locator('.row-label')).toHaveText(['Après « Curry »', 'Mêmes heures, autres jours']);
		await expect(curry.locator('.row-detail').first()).toHaveText('8 fois sur 12');
		await expect(curry.locator('.row-value').first()).toHaveText('67 %');
		await expect(curry.locator('.confidence')).toContainText('Signal fort');
		await expect(curry.locator('.confidence .dot.filled')).toHaveCount(3);
		await expect(curry.locator('.factor-icon .svg-icon.meal')).toBeVisible();
		await expect(page.locator('.correlation-section.worse')).toContainText('Liés à des jours plus difficiles');
		// The other dinners, eaten the days without curry, are not "protective": explained by the curry
		await expect(page.locator('.correlation-section.better')).toHaveCount(0);

		// The short nights, then a headache: a single card for the short nights and the late bedtimes
		const sleep = page.locator('.correlation-card[data-factor^="sleep:"]', { hasText: 'Tête' });
		await expect(sleep).toHaveCount(1);
		await expect(sleep.locator('.sentence')).toContainText(/Plus souvent après (une nuit de moins de|un coucher à)/);

		// The latest days behind the link, each one opening its day
		await expect(curry.locator('.card-days')).toHaveCount(0);
		await curry.locator('.days-toggle').click();
		await expect(curry.locator('.days-toggle')).toContainText('Masquer les jours');
		await expect(curry.locator('.days-title')).toHaveText('Les 8 derniers jours derrière ce lien');
		const days = curry.locator('.day-chip');
		await expect(days).toHaveCount(8);
		// The latest curry: 5 days ago
		await expect(days.first()).toHaveText('13 mars');
		await days.first().click();
		await expect(page).toHaveURL(/#\/2026-03-13$/);
	});

	test('a filter by symptom, and the weak leads on demand', async ({ app, page }) => {
		await app.start();
		await importDays(app, 60);
		await openCorrelations(app);
		const chips = page.locator('.symptom-filter .filter-chip');
		await expect(chips.first()).toHaveText('Tous');
		await chips.filter({ hasText: 'Ventre' }).click();
		await expect(chips.filter({ hasText: 'Ventre' })).toHaveClass(/active/);
		await expect(page.locator('.correlation-card .symptom-name', { hasText: 'Tête' })).toHaveCount(0);
		await expect(page.locator('.correlation-card .symptom-name', { hasText: 'Ventre' })).not.toHaveCount(0);
		await chips.first().click();
		await expect(page.locator('.correlation-card .symptom-pill', { hasText: 'Tête' }).first()).toBeVisible();

		// Weak leads: hidden, then shown with a dashed border
		const toggle = page.locator('.weak-toggle');
		if (await toggle.count() > 0) {
			await expect(page.locator('.correlation-card.weak')).toHaveCount(0);
			await toggle.click();
			await expect(page.locator('.correlation-card.weak').first()).toBeVisible();
			await expect(toggle).toContainText('Masquer les pistes faibles');
		}
	});

	test('the statistics of a symptom open its correlations, filtered on it', async ({ app, page }) => {
		await app.start();
		await importDays(app, 60);
		await app.goToManage('symptomLog');
		await page.locator('.symptom-card', { hasText: 'Ventre' }).locator('.stats-btn').click();
		const link = page.locator('.occurrence-history .correlations-link');
		await expect(link).toContainText("Ce qui pourrait l'influencer");
		await expect(link.locator('.beta-badge')).toHaveCount(0);
		await link.click();
		await expect(page.locator('.occurrence-history')).toHaveCount(0);
		await expect(page).toHaveURL(/#\/correlations\?symptom=/);
		await expect(page.locator('.loading')).toHaveCount(0, { timeout: 20_000 });
		await expect(page.locator('.symptom-filter .filter-chip.active')).toContainText('Ventre');
		await expect(page.locator('.correlation-card .symptom-name', { hasText: 'Tête' })).toHaveCount(0);
		await expect(page.locator('.correlation-card[data-factor="meal:curry"]')).toBeVisible();

		// Not in the statistics of the other entries
		await app.goToManage('meal');
		await page.locator('.manage-item').first().locator('.manage-item-actions button').first().click();
		await expect(page.locator('.occurrence-history')).toBeVisible();
		await expect(page.locator('.occurrence-history .correlations-link')).toHaveCount(0);
	});

	test('the V1 has no button to them, nor their setting', async ({ app, page }) => {
		await app.start();
		await app.setUiVersion('V1');
		await app.addSymptom('Tête');
		// The former title too
		await expect(page.locator('.manage-list-title')).toHaveText('Votre liste de symptômes');
		await expect(page.locator('.symptom-card', { hasText: 'Tête' })).toBeVisible();
		await expect(page.locator('.correlations-button')).toHaveCount(0);
		await page.locator('.symptom-card', { hasText: 'Tête' }).locator('.stats-btn').click();
		await expect(page.locator('.occurrence-history')).toBeVisible();
		await expect(page.locator('.occurrence-history .correlations-link')).toHaveCount(0);
		await page.locator('.occurrence-history .close-button').click();
		await app.goToSettings('Symptômes');
		await expect(app.settingsPanel('Symptômes').locator('.toggle-container').first()).toBeVisible();
		await expect(page.locator('.correlations-toggle')).toHaveCount(0);
	});
});
