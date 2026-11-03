import { test, expect, TODAY, YESTERDAY } from '../support/app';

test.describe('Timeline', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
	});

	test('shows today first, then the previous days', async ({ app, page }) => {
		const cards = page.locator('.day-card');
		await expect(cards.first()).toHaveAttribute('id', `day-${TODAY}`);
		await expect(cards.nth(1)).toHaveAttribute('id', `day-${YESTERDAY}`);
		await expect(app.dayCard().locator('.day-card-date')).toHaveText('Mer 18 mars 2026');
		await expect(app.dayCard().locator('.day-card-date')).toHaveClass(/today/);
	});

	test('every type of event can be added and is shown in the day card', async ({ app }) => {
		await app.addEvent('symptomLog', { detail: 'Côté gauche' });
		await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
		await app.addEvent('log', { key: 'Mauvaise nuit', detail: 'Réveillé deux fois' });
		await app.addEvent('sport', { key: 'Course à pied', detail: '5 km' });
		await app.addEvent('meal', { key: 'Pâtes' });

		const symptom = app.eventRows(TODAY, 'symptomLog');
		await expect(symptom.locator('.event-card-title')).toHaveText('Tête');
		await expect(symptom.locator('.event-card-detail')).toHaveText('Côté gauche');
		await expect(symptom.locator('.event-card-badge')).toHaveText(/\d+\/10/);
		await expect(symptom.locator('.rail-time')).toHaveText('10:30');

		const med = app.eventRows(TODAY, 'med');
		await expect(med.locator('.event-card-title')).toHaveText('Doliprane');
		await expect(med.locator('.event-card-badge')).toHaveText('1000 mg');

		await expect(app.eventRows(TODAY, 'log').locator('.event-card-detail')).toHaveText('Réveillé deux fois');
		await expect(app.eventRows(TODAY, 'sport').locator('.event-card-title')).toHaveText('Course à pied');
		await expect(app.eventRows(TODAY, 'meal').locator('.event-card-title')).toHaveText('Pâtes');
	});

	test('events can be added to a previous day', async ({ app }) => {
		await app.addEvent('log', { key: 'Hier' }, YESTERDAY);
		await expect(app.eventRows(YESTERDAY, 'log').locator('.event-card-title')).toHaveText('Hier');
		await expect(app.eventRows(TODAY)).toHaveCount(0);
	});

	test('an event can be edited from its details', async ({ app, page }) => {
		await app.addEvent('log', { key: 'Note A' });
		await app.eventRows(TODAY, 'log').click();
		await page.locator('.edit-button').click();
		const sheet = page.locator('.bottom-sheet-container.log');
		await sheet.locator('.form-fields-group input').first().fill('Note B');
		await sheet.locator('.confirm-button').click();
		await expect(app.eventRows(TODAY, 'log').locator('.event-card-title')).toHaveText('Note B');
	});

	test('an event is only deleted after confirmation', async ({ app, page }) => {
		await app.addEvent('sport', { key: 'Vélo' });

		await app.eventRows(TODAY, 'sport').click();
		await page.locator('.delete-button').click();
		await page.locator('.delete-timeline-event .cancel-button').click();
		await expect(app.eventRows(TODAY, 'sport')).toHaveCount(1);

		await app.eventRows(TODAY, 'sport').click();
		await page.locator('.delete-button').click();
		await page.locator('.delete-timeline-event .confirm-button').click();
		await expect(app.eventRows(TODAY, 'sport')).toHaveCount(0);
	});

	test('wake-up and bedtime are set by tapping their line', async ({ app, page }) => {
		const wakeUp = app.dayCard().locator('.sleep-row.wakeUp');
		await expect(wakeUp).toHaveClass(/empty/);
		await expect(wakeUp.locator('.rail-time')).toHaveText('--:--');
		await wakeUp.click();
		await page.locator('.bottom-sheet-container.wakeUp .confirm-button').click();
		await expect(wakeUp).not.toHaveClass(/empty/);
		await expect(wakeUp.locator('.rail-time')).toHaveText('10:30');
	});

	test('the intensity of the day colors its dot', async ({ app }) => {
		const dot = app.dayCard().locator('.day-card-overview mat-icon');
		await expect(dot).toHaveClass(/color-default/);
		await app.setDayIntensity(6);
		await expect(dot).toHaveClass(/color-pain-[1-5]/);
	});

	test('the classic design can be chosen again in the settings', async ({ app, page }) => {
		await app.addEvent('log', { key: 'Note' });
		await app.goToSettings('Apparence');
		await app.chooseRadio('Classique');
		await app.goToTimeline();
		await expect(page.locator('.timeline-tile').first()).toBeVisible();
		await expect(page.locator('.day-card')).toHaveCount(0);
		await expect(page.locator('#day-' + TODAY + ' .timeline-day-item-log')).toContainText('Note');

		await app.goToSettings('Apparence');
		await app.chooseRadio('Moderne');
		await app.goToTimeline();
		await expect(app.dayCard()).toBeVisible();
		await expect(page.locator('.timeline-tile')).toHaveCount(0);
	});
});
