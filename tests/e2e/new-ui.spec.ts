import { Page } from '@playwright/test';
import { test, expect, CURRENT_VERSION, TODAY, UI_VERSION } from '../support/app';

// Two versions of the interface: the V2 for the new users, the V1 (the original one) for the users of the former
// versions so as not to confuse them, and a popup tells them once about the V2
test.describe('Versions of the interface', () => {

	test('a new user gets the V2, without the popup', async ({ app, page }) => {
		// Records the popup even if it is closed right away (app.start closes the welcome dialogs)
		await page.addInitScript(() => {
			new MutationObserver(() => {
				if (document.querySelector('app-dialog-new-ui')) {
					localStorage.setItem('newUiPopupShown', 'yes');
				}
			}).observe(document, { childList: true, subtree: true });
		});
		await app.start();
		await app.goToTimeline();
		await expect(app.dayCard()).toBeVisible();
		await expect(page.locator('.timeline-tile')).toHaveCount(0);
		await app.reload();
		await expect(app.dayCard()).toBeVisible();
		expect(await page.evaluate(() => localStorage.getItem('newUiPopupShown'))).toBeNull();
		await app.goToCalendar();
		await expect(page.locator('.modern-calendar')).toBeVisible();
		await app.goToSettings('Apparence');
		await expect(app.radio('V2', UI_VERSION)).toHaveClass(/mat-radio-checked/);
	});

	test('a user of a former version keeps the V1 and is told once about the V2', async ({ app, page }) => {
		await app.startAsFormerUser();
		// A single dialog for the update: the V2, to try with a tap, and how to come back
		const popup = page.locator('app-dialog-new-ui');
		await expect(popup).toContainText('Life-Notes mis à jour');
		await expect(popup).toContainText('Life-Notes a été mis à jour et propose une nouvelle interface');
		await expect(popup).toContainText('la timeline et le calendrier font peau neuve');
		await expect(popup).toContainText('Essayez la nouvelle interface d\'un simple appui');
		await expect(popup).toContainText('revenir à l\'interface d\'origine à tout moment dans Paramètres > Apparence > '
			+ 'Version de l\'interface');
		await expect(popup.locator('.update-notes')).toHaveText('Voir les notes de mise à jour');
		await expect(page.locator('app-dialog-info')).toHaveCount(0);
		// The preview shows a day in the V2, whatever the version in use
		const preview = popup.locator('.scene-new-ui');
		await expect(preview).not.toHaveClass(/classic/);
		await expect(preview.locator('.m-day-card .m-row')).toHaveCount(6);
		await expect(preview).toContainText('Doliprane');
		// It fits in the dialog
		const previewBox = await preview.boundingBox();
		const dialogBox = await page.locator('.new-ui-dialog mat-dialog-container').boundingBox();
		expect(previewBox.x).toBeGreaterThanOrEqual(dialogBox.x);
		expect(previewBox.x + previewBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width);
		await expect(popup.locator('.try-new-ui')).toBeInViewport();

		await popup.locator('button', { hasText: 'Plus tard' }).click();
		await expect(popup).toHaveCount(0);
		await expect(page.locator('.timeline-tile').first()).toBeVisible();
		await expect(page.locator('.day-card')).toHaveCount(0);

		// Only once
		await page.reload();
		await expect(page.locator('.timeline-tile').first()).toBeVisible();
		await page.waitForTimeout(1500);
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);

		// The calendar too
		await app.goToCalendar();
		await expect(page.locator('.classic-calendar')).toBeVisible();
		await expect(page.locator('.modern-calendar')).toHaveCount(0);

		// The V2 stays available in the settings, for the whole interface at once
		await app.goToSettings('Apparence');
		await expect(app.radio('V1', UI_VERSION)).toHaveClass(/mat-radio-checked/);
		await app.chooseRadio('V2', UI_VERSION);
		await app.goToTimeline();
		await expect(app.dayCard()).toBeVisible();
		await app.goToCalendar();
		await expect(page.locator('.modern-calendar')).toBeVisible();
	});

	test('at the update, the V2 can be tried from the dialog of the update', async ({ app, page }) => {
		await app.startAsFormerUser();
		const popup = page.locator('app-dialog-new-ui');
		await expect(popup).toContainText('Life-Notes mis à jour');
		await expect(page.locator('.timeline-tile').first()).toBeVisible();

		await popup.locator('.try-new-ui').click();
		await expect(popup).toHaveCount(0);
		await expect(app.dayCard()).toBeVisible();
		await expect(page.locator('.timeline-tile')).toHaveCount(0);

		// The update is known: no dialog after a restart, the V2 kept
		await page.reload();
		await expect(app.dayCard()).toBeVisible();
		await page.waitForTimeout(1500);
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);
		await app.goToSettings('Apparence');
		await expect(app.radio('V2', UI_VERSION)).toHaveClass(/mat-radio-checked/);
	});

	test('the V2 can be tried from the popup', async ({ app, page }) => {
		// Up to date version: no update dialog, the popup comes alone
		await app.startAsFormerUser({ lastInstall: CURRENT_VERSION });
		const popup = page.locator('app-dialog-new-ui');
		await expect(popup).toBeVisible();
		await expect(page.locator('app-dialog-info')).toHaveCount(0);
		await expect(page.locator('.timeline-tile').first()).toBeVisible();

		await popup.locator('.try-new-ui').click();
		await expect(popup).toHaveCount(0);
		await expect(app.dayCard()).toBeVisible();
		await expect(page.locator('.timeline-tile')).toHaveCount(0);

		// Kept after a restart
		await page.reload();
		await expect(app.dayCard()).toBeVisible();
		await page.waitForTimeout(1500);
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);
		await app.goToCalendar();
		await expect(page.locator('.modern-calendar')).toBeVisible();
		await app.goToSettings('Apparence');
		await expect(app.radio('V2', UI_VERSION)).toHaveClass(/mat-radio-checked/);
	});

	test('the popup is in English for English users', async ({ app, page }) => {
		await app.startAsFormerUser({ language: 'en', lastInstall: CURRENT_VERSION });
		const popup = page.locator('app-dialog-new-ui');
		await expect(popup).toContainText('A new look is available');
		await expect(popup).toContainText('The timeline and the calendar have a new look');
		await expect(popup).toContainText('Try the new interface with a single tap');
		await expect(popup).toContainText('Settings > Appearance > Interface version');
		// Without the update: no link to its notes
		await expect(popup.locator('.update-notes')).toHaveCount(0);
		await expect(popup.locator('.scene-new-ui')).toContainText('Walk');
		await expect(popup.locator('button', { hasText: 'Later' })).toBeVisible();
	});

	test('a version chosen before is kept, without the popup', async ({ app, page }) => {
		await app.startAsFormerUser({ lastInstall: CURRENT_VERSION, uiVersion: 'v1' });
		await expect(page.locator('.timeline-tile').first()).toBeVisible();
		await page.waitForTimeout(1500);
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);
		await app.goToCalendar();
		await expect(page.locator('.classic-calendar')).toBeVisible();
	});

	test('the first builds of the V2 had a style per screen: the one of the timeline gives the version',
		async ({ app, page }) => {
		await app.startAsFormerUser({ lastInstall: CURRENT_VERSION, timelineStyle: 'modern', calendarStyle: 'classic',
			newUiPopupSeen: true });
		await expect(app.dayCard()).toBeVisible();
		await app.goToCalendar();
		await expect(page.locator('.modern-calendar')).toBeVisible();
		await app.goToSettings('Apparence');
		await expect(app.radio('V2', UI_VERSION)).toHaveClass(/mat-radio-checked/);
	});

	test('the V1 keeps the other original elements', async ({ app, page }) => {
		await app.start();
		await app.goToTimeline();
		await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
		await app.setUiVersion('V1');

		// The menu of the event types: the original list, without the cross nor the title nor the grid of the V2
		await app.goToTimeline();
		await page.locator(`#day-${TODAY} .add-event`).click();
		const menu = page.locator('.add-event-menu');
		await expect(menu.locator('mat-nav-list a').first()).toBeVisible();
		// The note before the sport
		await expect(menu.locator('mat-nav-list a')).toHaveText([/symptôme/, /repas/, /médicament/, /note/, /sport/]);
		await expect(menu.locator('.add-option')).toHaveCount(0);
		await expect(menu.locator('.title')).toBeHidden();
		await expect(menu.locator('.sheet-close-button')).toBeHidden();
		await page.locator('.cdk-overlay-backdrop').click({ position: { x: 10, y: 10 } });
		await expect(menu).toHaveCount(0);

		// The suggested names: the text alone, in the original list
		await page.locator(`#day-${TODAY} .add-event`).click();
		await menu.locator('mat-nav-list a', { hasText: 'Ajouter un médicament' }).click();
		await page.locator('.bottom-sheet-container.med .form-fields-group input').first().fill('d');
		const option = page.locator('.mat-autocomplete-panel mat-option');
		await expect(option).toHaveText(['Doliprane 1000 mg']);
		await expect(option.locator('.suggestion')).toHaveCount(0);
		await page.keyboard.press('Escape');
		await page.locator('.bottom-sheet-container.med .sheet-close-button').click();
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);

		// Manage lists: floating refresh button confirmed in a dialog, history of an event opened on its list
		await app.goToManage('med');
		await expect(page.locator('.manage-list-refresh-fab')).toBeVisible();
		await expect(page.locator('.manage-list-header .manage-list-refresh')).toBeHidden();
		await page.locator('.manage-list-refresh-fab').click();
		await expect(page.locator('mat-dialog-container h1')).toHaveText('Actualiser vos médicaments');
		await expect(page.locator('mat-bottom-sheet-container')).toHaveCount(0);
		await page.locator('mat-dialog-container button', { hasText: 'Non' }).click();
		await expect(page.locator('mat-dialog-container')).toHaveCount(0);
		const historyButton = page.locator('.manage-item-actions button').nth(0);
		await expect(historyButton.locator('mat-icon:visible')).toHaveText('calendar_month');
		await historyButton.click();
		const history = page.locator('.occurrence-history');
		await expect(history.locator('.list-tab')).toHaveClass(/active/);
		await expect(history.locator('.occurrence-item')).toHaveCount(1);
		await expect(history.locator('.sheet-close-button')).toBeHidden();
		await history.locator('.close-button').click();
		await expect(history).toHaveCount(0);

		// And everything back with the V2
		await app.setUiVersion('V2');
		await app.goToManage('med');
		await expect(page.locator('.manage-list-refresh-fab')).toBeHidden();
		await expect(page.locator('.manage-list-header .manage-list-refresh')).toBeVisible();
		await expect(historyButton.locator('mat-icon:visible')).toHaveText('insights');
		await historyButton.click();
		await expect(history.locator('.stats-tab')).toHaveClass(/active/);
		await expect(history.locator('.sheet-close-button')).toBeVisible();
		await history.locator('.sheet-close-button').click();
		await expect(history).toHaveCount(0);

		// The grid of the event types, in their colors
		await app.goToTimeline();
		await page.locator(`#day-${TODAY} .add-event`).click();
		await expect(menu.locator('mat-nav-list')).toHaveCount(0);
		await expect(menu.locator('.add-option-label')).toHaveText(['Symptôme', 'Repas', 'Médicament', 'Sport', 'Note']);
		await expect(menu.locator('.add-option.med .add-option-bubble')).not.toHaveCSS('background-color',
			'rgba(0, 0, 0, 0)');
	});
});

// Records the designs drawn in the page, at each change of the DOM, from the start of the app
async function recordDesigns(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const designs = {
			// The V2 day view has a day card too
			'V1 timeline': 'app-timeline .timeline-tile', 'V2 timeline': 'app-timeline .day-card',
			'V1 calendar': '.classic-calendar', 'V2 calendar': '.modern-calendar',
			'V1 day': '.day-container', 'V2 day': '.day-page'
		};
		const drawn = new Set<string>();
		(window as any).designsDrawn = drawn;
		new MutationObserver(() => {
			Object.entries(designs).filter(([, selector]) => document.querySelector(selector))
				.forEach(([design]) => drawn.add(design));
		}).observe(document, { childList: true, subtree: true });
	});
}

// The pages wait for the settings: the other version never flashes while the app starts
test.describe('Versions at startup', () => {
	for (const version of ['V1', 'V2'] as const) {
		test(`only the ${version} is drawn when the app starts`, async ({ app, page }) => {
			await app.start();
			await app.setUiVersion(version);
			await recordDesigns(page);
			for (const [url, pageName] of [['/#/', 'timeline'], ['/#/calendar', 'calendar'], [`/#/${TODAY}`, 'day']]) {
				await page.goto(url);
				await page.reload();
				await expect(page.locator(`.mat-toolbar`)).toBeVisible();
				// Time for the settings to be read and the page to be drawn
				await page.waitForTimeout(1500);
				expect(await page.evaluate(() => [...(window as any).designsDrawn]), url).toEqual([`${version} ${pageName}`]);
			}
		});
	}
});
