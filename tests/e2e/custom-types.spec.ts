import { test, expect, Locator, TODAY, YESTERDAY } from '../support/app';
import { CUSTOM_TYPE_COLORS, CUSTOM_TYPE_ICONS, MAX_CUSTOM_TYPES, MAX_EVENT_TYPES, getCustomTypeColors } from '../../src/app/models/custom-type.model';
import { getEventSoftColor } from '../../src/app/models/event-colors.model';

function jsonFile(name: string, content: any) {
	return { name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(content)) };
}

// CSS value computed on an element, e.g. the --color-event-custom variable given by the class of its type
async function cssValue(locator: Locator, name: string): Promise<string> {
	return (await locator.evaluate((element, n) => getComputedStyle(element).getPropertyValue(n), name)).trim();
}

test.describe('Event types created by the user', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
	});

	test('the icons to choose from are about fifty glyphs of the Material Icons font, as everywhere else in the app',
		async ({ app, page }) => {
			expect(CUSTOM_TYPE_ICONS.length).toBeGreaterThanOrEqual(50);
			expect(new Set(CUSTOM_TYPE_ICONS).size).toBe(CUSTOM_TYPE_ICONS.length);
			await app.goToManage();
			await page.locator('.manage-tile.add-tile').click();
			const grid = page.locator('.edit-custom-type .icon-grid');
			await expect(grid.locator('.icon-choice')).toHaveCount(CUSTOM_TYPE_ICONS.length);
			// No drawn icon: only text turned into glyphs by the icon font
			await expect(grid.locator('img, svg')).toHaveCount(0);

			await app.fontsReady();
			const fontLoaded = await page.evaluate(() => Array.from((document as any).fonts as Iterable<FontFace>)
				.some(font => font.family.includes('Material Icons') && font.status === 'loaded'));
			test.skip(!fontLoaded, 'Google Fonts unreachable: the icon names can\'t be checked');
			// A name unknown to the font stays a word, wider than the icon box
			const unknown = await grid.locator('mat-icon').evaluateAll(icons => icons
				.filter(icon => !getComputedStyle(icon).fontFamily.includes('Material Icons')
					|| icon.scrollWidth > icon.clientWidth + 1)
				.map(icon => icon.textContent.trim()));
			expect(unknown).toEqual([]);
		});

	test('a type is created with its name, icon, color and quantity, then filled in from the timeline',
		async ({ app, page }) => {
			await app.createCustomType('Hydratation', { icon: 'water_drop', color: 0, quantity: true, unit: 'L' });
			const tile = page.locator('.manage-tile.custom', { hasText: 'Hydratation' });
			await expect(tile.locator('mat-icon')).toHaveText('water_drop');
			expect(await cssValue(tile, '--color-event-custom')).toBe(CUSTOM_TYPE_COLORS[0].light);

			await app.goToTimeline();
			await app.addCustomEvent('Hydratation', { key: 'Eau', quantity: '1,5', detail: 'Au réveil' });
			const row = app.eventRows(TODAY, 'custom');
			await expect(row.locator('.event-card-title')).toHaveText('Eau');
			await expect(row.locator('.event-card-badge')).toHaveText('1,5 L');
			await expect(row.locator('.event-card-detail')).toHaveText('Au réveil');
			await expect(row.locator('.rail-marker mat-icon')).toHaveText('water_drop');
			expect(await cssValue(row, '--row-soft')).toBe(getEventSoftColor(CUSTOM_TYPE_COLORS[0].light, false));

			// Details, then edition
			await row.click();
			const details = page.locator('app-dialog-show-event .bottom-sheet-container.custom');
			await expect(details.locator('.main-title')).toHaveText('Eau');
			await expect(details.locator('.custom-type-name')).toHaveText('Hydratation');
			await expect(details.locator('.qty-group')).toHaveText(/1,5\s*L/);
			await details.locator('.edit-button').click();
			const sheet = page.locator('.bottom-sheet-container.custom.closable-sheet');
			await expect(sheet.locator('.quantity-input')).toHaveValue('1,5');
			await sheet.locator('.quantity-input').fill('2');
			await sheet.locator('.confirm-button').click();
			await expect(row.locator('.event-card-badge')).toHaveText('2 L');

			// A known name is suggested, with its last quantity
			await app.dayCard(YESTERDAY).locator('.add-event').click();
			await app.addMenuEntry('Hydratation').click();
			await sheet.locator('.form-fields-group input').first().fill('E');
			await page.locator('mat-option', { hasText: 'Eau' }).click();
			await expect(sheet.locator('.quantity-input')).toHaveValue('2');
			// The quantity must be a number
			await sheet.locator('.quantity-input').fill('beaucoup');
			await expect(sheet.locator('.confirm-button')).toBeDisabled();
			await sheet.locator('.quantity-input').fill('0,25');
			await sheet.locator('.confirm-button').click();
			await expect(app.eventRows(YESTERDAY, 'custom').locator('.event-card-badge')).toHaveText('0,25 L');
		});

	test('an entry without a name shows the name of its type, in the timeline, the day view and the V1',
		async ({ app, page }) => {
			await app.createCustomType('Humeur', { icon: 'mood' });
			await app.goToTimeline();
			await app.addCustomEvent('Humeur', { detail: 'Plutôt bien' });
			const row = app.eventRows(TODAY, 'custom');
			await expect(row.locator('.event-card-title')).toHaveText('Humeur');
			// No quantity for this type
			await expect(row.locator('.event-card-badge')).toHaveCount(0);

			await app.dayCard().locator('.go-to-day').click();
			await expect(page.locator('.day-page .event-row.custom .event-card-title')).toHaveText('Humeur');

			await app.setUiVersion('V1');
			await app.goToTimeline();
			const chip = app.dayCard().locator('.timeline-day-item-custom');
			await expect(chip).toContainText('Humeur');
			// The first ready-made color, as on the Manage tile
			expect(await cssValue(chip, '--color-event-custom')).toBe(CUSTOM_TYPE_COLORS[0].light);
		});

	test('the type is edited from its page: its name, icon and color change everywhere', async ({ app, page }) => {
		await app.createCustomType('Café', { icon: 'local_cafe', quantity: true, unit: 'tasses' });
		await app.goToTimeline();
		await app.addCustomEvent('Café', { quantity: '2' });

		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Café' }).click();
		await expect(page).toHaveURL(/#\/custom\/ct\w+$/);
		await expect(page.locator('.manage-list-title')).toHaveText('Café');
		// The toolbar shows the manage section
		await expect(page.locator('.nav-button.active')).toHaveAttribute('id', 'menu-icon-manage');

		await page.locator('.edit-type-button').click();
		const sheet = page.locator('.edit-custom-type');
		await expect(sheet.locator('.custom-type-label-input')).toHaveValue('Café');
		await sheet.locator('.custom-type-label-input').fill('Thé');
		await sheet.locator('.icon-choice[data-icon="emoji_food_beverage"]').click();
		await sheet.locator('button.color-choice').nth(1).click();
		await sheet.locator('.confirm-button').click();
		await expect(page.locator('.manage-list-title')).toHaveText('Thé');

		await app.goToTimeline();
		const row = app.eventRows(TODAY, 'custom');
		await expect(row.locator('.event-card-title')).toHaveText('Thé');
		await expect(row.locator('.event-card-badge')).toHaveText('2 tasses');
		await expect(row.locator('.rail-marker mat-icon')).toHaveText('emoji_food_beverage');
		expect(await cssValue(row, '--row-color')).toBe(CUSTOM_TYPE_COLORS[1].light);
		await app.dayCard().locator('.add-event').click();
		await expect(page.locator('.add-event-menu .custom-type-entry .add-option-label')).toHaveText(['Thé']);
		await page.keyboard.press('Escape');

		// Without quantity, the quantities typed before are hidden
		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Thé' }).click();
		await page.locator('.edit-type-button').click();
		await sheet.locator('.quantity-toggle label').click();
		await sheet.locator('.confirm-button').click();
		await expect(sheet).toBeHidden();
		await app.goToTimeline();
		await expect(row.locator('.event-card-title')).toHaveText('Thé');
		await expect(row.locator('.event-card-badge')).toHaveCount(0);
	});

	test('a color of the color picker is chosen for the current theme, the other theme gets a matching one',
		async ({ app, page }) => {
			await app.goToManage();
			await page.locator('.manage-tile.add-tile').click();
			const sheet = page.locator('.edit-custom-type');
			const code = sheet.locator('.cp-hex-input');
			await sheet.locator('.custom-type-label-input').fill('Eau');
			// The picker, shown in the sheet, starts from the color selected: the first ready-made one
			await sheet.locator('.custom-color').click();
			await expect(code).toHaveValue(CUSTOM_TYPE_COLORS[0].light.slice(1));
			// It follows the ready-made color tapped, to adjust it
			await sheet.locator('button.color-choice').nth(2).click();
			await expect(code).toHaveValue(CUSTOM_TYPE_COLORS[2].light.slice(1));
			await code.fill('123456');
			await expect(sheet.locator('.custom-color')).toHaveClass(/selected/);
			await expect(sheet.locator('button.color-choice.selected')).toHaveCount(1);
			// The preview takes the color at once
			expect(await cssValue(sheet, '--color-event-custom')).toBe('#123456');
			await sheet.locator('.confirm-button').click();
			const tile = page.locator('.manage-tile.custom', { hasText: 'Eau' });
			expect(await cssValue(tile, '--color-event-custom')).toBe('#123456');

			// Edited later, the picker starts from this color
			await tile.click();
			await page.locator('.edit-type-button').click();
			await sheet.locator('.custom-color').click();
			await expect(code).toHaveValue('123456');
			await sheet.locator('.sheet-close-button').click();
			await expect(sheet).toBeHidden();

			await app.goToSettings('Apparence');
			await app.setToggle('Mode sombre', true);
			// The colors of the custom types are not in the appearance settings
			await expect(page.locator('.palette-hint')).toContainText('Gestion');
			await app.goToManage();
			expect(await cssValue(tile, '--color-event-custom')).toBe(getCustomTypeColors('#123456', false).dark);
		});

	test('two types can\'t have the same name', async ({ app, page }) => {
		await app.createCustomType('Eau');
		await page.locator('.manage-tile.add-tile').click();
		const sheet = page.locator('.edit-custom-type');
		await sheet.locator('.custom-type-label-input').fill(' eau ');
		await expect(sheet.locator('.field-error')).toBeVisible();
		await expect(sheet.locator('.confirm-button')).toBeDisabled();
		await sheet.locator('.custom-type-label-input').fill('Eau gazeuse');
		await expect(sheet.locator('.confirm-button')).toBeEnabled();
	});

	test(`there are ${MAX_EVENT_TYPES} event types at most, the 5 built-in ones included`, async ({ app, page }) => {
		for (let i = 1; i <= MAX_CUSTOM_TYPES; i++) {
			await app.createCustomType(`Type ${i}`);
		}
		await expect(page.locator('.manage-tile')).toHaveCount(MAX_EVENT_TYPES);
		await expect(page.locator('.manage-tile.add-tile')).toHaveCount(0);
		await expect(page.locator('.manage-limit')).toContainText(`${MAX_EVENT_TYPES} types`);
		// Each one has its own icon and color, as long as there are unused ones
		const icons = await page.locator('.manage-tile.custom mat-icon').allTextContents();
		expect(new Set(icons).size).toBe(MAX_CUSTOM_TYPES);
		await app.goToTimeline();
		await app.dayCard().locator('.add-event').click();
		await expect(page.locator('.add-event-menu .custom-type-entry')).toHaveCount(MAX_CUSTOM_TYPES);
	});

	test('a deleted type takes its entries along, after a confirmation telling how many', async ({ app, page }) => {
		await app.createCustomType('Eau', { quantity: true, unit: 'L' });
		await app.goToTimeline();
		await app.addCustomEvent('Eau', { quantity: '1' });
		await app.addCustomEvent('Eau', { quantity: '0,5' }, YESTERDAY);
		await app.addEvent('log', { key: 'Note gardée' });

		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Eau' }).click();
		await page.locator('.delete-type-button').click();
		await expect(page.locator('.delete-overview')).toContainText('ainsi que ses 2 saisies');
		await page.locator('.delete-overview .delete-button').click();
		await expect(page).toHaveURL(/#\/manage$/);
		await expect(page.locator('.manage-tile.custom')).toHaveCount(0);

		await app.goToTimeline();
		await expect(app.eventRows(TODAY, 'custom')).toHaveCount(0);
		await expect(app.eventRows(YESTERDAY, 'custom')).toHaveCount(0);
		await expect(app.eventRows(TODAY, 'log')).toHaveCount(1);
	});

	test('the entries of a name are listed, renamed and deleted from the page of the type', async ({ app, page }) => {
		await app.createCustomType('Boisson');
		await app.goToTimeline();
		await app.addCustomEvent('Boisson', { key: 'Eau' }, YESTERDAY);
		await app.addCustomEvent('Boisson', { key: 'Eau' });
		await app.addCustomEvent('Boisson', { key: 'Jus' });

		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Boisson' }).click();
		const items = page.locator('.manage-item');
		await expect(items.locator('.manage-item-title')).toHaveText(['Eau', 'Jus']);
		await expect(items.first().locator('.manage-item-meta').first()).toContainText('2 fois');
		await expect(items.first().locator('.manage-item-meta').nth(1)).toHaveText('Dernière fois le 18 mars 2026');

		await items.first().locator('.manage-item-actions button').nth(0).click();
		await page.locator('.occurrence-history .list-tab').click();
		await expect(page.locator('.occurrence-history .occurrence-item')).toHaveCount(2);
		await page.locator('.occurrence-history .close-button').click();
		await expect(page.locator('.occurrence-history')).toBeHidden();

		await items.first().locator('.manage-item-actions button').nth(1).click();
		const sheet = page.locator('.edit-log');
		await sheet.locator('input').fill('Eau plate');
		await sheet.locator('.confirm-button').click();
		await expect(items.locator('.manage-item-title')).toHaveText(['Eau plate', 'Jus']);

		await items.nth(1).locator('.manage-item-actions button').nth(2).click();
		await expect(page.locator('.delete-overview')).toContainText('« Jus »');
		await page.locator('.delete-overview .delete-button').click();
		await expect(items.locator('.manage-item-title')).toHaveText(['Eau plate']);

		await app.goToTimeline();
		await expect(app.eventRows(TODAY, 'custom').locator('.event-card-title')).toHaveText(['Eau plate']);
		await expect(app.eventRows(YESTERDAY, 'custom').locator('.event-card-title')).toHaveText(['Eau plate']);
	});

	test('an entry is deleted from the timeline', async ({ app, page }) => {
		await app.createCustomType('Humeur');
		await app.goToTimeline();
		await app.addCustomEvent('Humeur', { key: 'Joyeux' });
		await app.eventRows(TODAY, 'custom').click();
		await page.locator('.delete-button').click();
		const confirmation = page.locator('.delete-timeline-event');
		await expect(confirmation.locator('.title')).toContainText('Humeur');
		await confirmation.locator('.confirm-button').click();
		await expect(app.eventRows(TODAY, 'custom')).toHaveCount(0);
	});

	test('backups keep the types and their entries', async ({ app, page }) => {
		await app.createCustomType('Eau', { icon: 'water_drop', quantity: true, unit: 'L' });
		await app.goToTimeline();
		await app.addCustomEvent('Eau', { quantity: '1,5' });
		const { content } = await app.exportBackup();
		expect(content.customTypes).toEqual([expect.objectContaining({ label: 'Eau', icon: 'water_drop', quantity: true, unit: 'L' })]);
		expect(content.customTypes[0]._rev).toBeUndefined();
		const today = content.days.find(day => day.date === TODAY);
		expect(today.customs).toEqual([
			expect.objectContaining({ type: 'custom', customType: content.customTypes[0].key, quantity: 1.5 })
		]);

		// Deleted, then back with the backup
		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Eau' }).click();
		await page.locator('.delete-type-button').click();
		await page.locator('.delete-overview .delete-button').click();
		await expect(page.locator('.manage-tile.custom')).toHaveCount(0);
		await app.importBackup(jsonFile('backup.json', content));
		await page.locator('.import-confirm .confirm-button').click();
		await app.afterImport(async () => {
			await expect(app.eventRows(TODAY, 'custom').locator('.event-card-badge')).toHaveText('1,5 L', { timeout: 1000 });
		});
		await app.goToManage();
		await expect(page.locator('.manage-tile.custom')).toHaveText([/Eau/]);

		// A backup made before the custom types replaces them with none
		const old = { ...content, days: content.days.map(day => ({ ...day, customs: undefined })) };
		delete old.customTypes;
		await app.importBackup(jsonFile('old.json', old));
		await page.locator('.import-confirm .confirm-button').click();
		await app.afterImport(async () => {
			await expect(app.eventRows(TODAY, 'custom')).toHaveCount(0, { timeout: 1000 });
		});
		await app.goToManage();
		await expect(page.locator('.manage-tile.custom')).toHaveCount(0);
	});

	test('the PDF report shows the most frequent entries of each type, with their total quantity', async ({ app, page }) => {
		await app.createCustomType('Hydratation', { quantity: true, unit: 'L' });
		await app.goToTimeline();
		await app.addCustomEvent('Hydratation', { key: 'Eau', quantity: '1,5' });
		await app.addCustomEvent('Hydratation', { key: 'Eau', quantity: '0,5' }, YESTERDAY);
		await app.goToSettings('Importer / Exporter');
		await page.locator('mat-list-option', { hasText: 'Exporter en PDF' }).click();
		await page.locator('.export-pdf .confirm-button').click();
		await expect(page).toHaveURL(/#\/monthlyreport\/2026-0?3$/);
		const section = page.locator('.top-custom');
		await expect(section.locator('h3')).toHaveText(/Hydratation : saisies les plus fréquentes/i);
		await expect(section).toContainText('Eau');
		await expect(section).toContainText('2 · 2 L');
	});
});

// Less common paths: restart, several types, other languages and formats, unexpected data
test.describe('Event types created by the user: other cases', () => {

	test('the types, their entries and their colors are back after a restart, in the dark theme too',
		async ({ app, page }) => {
			await app.start();
			await app.createCustomType('Eau', { icon: 'water_drop', color: 2, quantity: true, unit: 'L' });
			await app.goToTimeline();
			await app.addCustomEvent('Eau', { quantity: '1,5' });
			await app.goToSettings('Apparence');
			await app.setToggle('Mode sombre', true);

			await app.reload();
			await app.goToTimeline();
			const row = app.eventRows(TODAY, 'custom');
			await expect(row.locator('.event-card-badge')).toHaveText('1,5 L');
			await expect(row.locator('.rail-marker mat-icon')).toHaveText('water_drop');
			// Colors of the dark theme from the start
			expect(await cssValue(row, '--row-color')).toBe(CUSTOM_TYPE_COLORS[2].dark);
			await app.goToManage();
			const tile = page.locator('.manage-tile.custom', { hasText: 'Eau' });
			expect(await cssValue(tile, '--color-event-custom')).toBe(CUSTOM_TYPE_COLORS[2].dark);

			await app.goToSettings('Apparence');
			await app.setToggle('Mode sombre', false);
			await app.goToManage();
			expect(await cssValue(tile, '--color-event-custom')).toBe(CUSTOM_TYPE_COLORS[2].light);
		});

	test('two types sharing entry names keep them apart', async ({ app, page }) => {
		await app.start();
		await app.createCustomType('Matin', { quantity: true, unit: 'L' });
		await app.createCustomType('Soir', { quantity: true, unit: 'L' });
		// Each type gets its own color
		const colors = await page.locator('.manage-tile.custom').evaluateAll(tiles =>
			tiles.map(tile => getComputedStyle(tile).getPropertyValue('--color-event-custom').trim()));
		expect(new Set(colors).size).toBe(2);
		await app.goToTimeline();
		await app.addCustomEvent('Matin', { key: 'Eau', quantity: '1' });
		await app.addCustomEvent('Soir', { key: 'Eau', quantity: '2' });
		await app.addCustomEvent('Soir', { key: 'Tisane', quantity: '0,5' });

		// Renamed in one type only
		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Matin' }).click();
		await expect(page.locator('.manage-item .manage-item-title')).toHaveText(['Eau']);
		await page.locator('.manage-item').first().locator('.manage-item-actions button').nth(1).click();
		await page.locator('.edit-log input').fill('Eau plate');
		await page.locator('.edit-log .confirm-button').click();
		await expect(page.locator('.manage-item .manage-item-title')).toHaveText(['Eau plate']);
		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Soir' }).click();
		await expect(page.locator('.manage-item .manage-item-title')).toHaveText(['Eau', 'Tisane']);

		// Deleted in one type only
		await page.locator('.manage-item').first().locator('.manage-item-actions button').nth(2).click();
		await page.locator('.delete-overview .delete-button').click();
		await expect(page.locator('.manage-item .manage-item-title')).toHaveText(['Tisane']);
		await app.goToTimeline();
		await expect(app.eventRows(TODAY, 'custom').locator('.event-card-title')).toHaveText(['Eau plate', 'Tisane']);

		// The deletion of a type leaves the entries of the other one
		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Matin' }).click();
		await page.locator('.delete-type-button').click();
		await expect(page.locator('.delete-overview')).toContainText('ainsi que sa saisie');
		await page.locator('.delete-overview .delete-button').click();
		await expect(page.locator('.manage-tile.custom')).toHaveText([/Soir/]);
		await app.goToTimeline();
		await expect(app.eventRows(TODAY, 'custom').locator('.event-card-title')).toHaveText(['Tisane']);
		await expect(app.eventRows(TODAY, 'custom').locator('.event-card-badge')).toHaveText(['0,5 L']);

		// Separate lines in the PDF report
		await app.createCustomType('Matin', { quantity: true, unit: 'L' });
		await app.goToTimeline();
		await app.addCustomEvent('Matin', { key: 'Tisane', quantity: '3' });
		await app.goToSettings('Importer / Exporter');
		await page.locator('mat-list-option', { hasText: 'Exporter en PDF' }).click();
		await page.locator('.export-pdf .confirm-button').click();
		const sections = page.locator('.top-custom');
		await expect(sections).toHaveCount(2);
		await expect(sections.filter({ hasText: 'Soir' })).toContainText('1 · 0,5 L');
		await expect(sections.filter({ hasText: 'Matin' })).toContainText('1 · 3 L');
	});

	test('in English, quantities are typed and shown with a dot', async ({ app, page }) => {
		await app.start('en');
		await app.goToManage();
		await page.locator('.manage-tile.add-tile').click();
		const editor = page.locator('.edit-custom-type');
		await editor.locator('.custom-type-label-input').fill('Water');
		await editor.locator('.quantity-toggle label').click();
		await editor.locator('.custom-type-unit-input').fill('L');
		await editor.locator('.confirm-button').click();
		await expect(page.locator('.manage-tile.custom', { hasText: 'Water' })).toBeVisible();

		await app.goToTimeline();
		await app.dayCard().locator('.add-event').click();
		await app.addMenuEntry('Water').click();
		const sheet = page.locator('.bottom-sheet-container.custom');
		await sheet.locator('.quantity-input').fill('1.5');
		await sheet.locator('.confirm-button').click();
		await expect(sheet).toBeHidden();
		const row = app.eventRows(TODAY, 'custom');
		await expect(row.locator('.event-card-title')).toHaveText('Water');
		await expect(row.locator('.event-card-badge')).toHaveText('1.5 L');

		await row.click();
		await page.locator('.edit-button').click();
		const edit = page.locator('.bottom-sheet-container.custom.closable-sheet');
		await expect(edit.locator('.quantity-input')).toHaveValue('1.5');
		// A comma is understood too
		await edit.locator('.quantity-input').fill('0,75');
		await edit.locator('.confirm-button').click();
		await expect(row.locator('.event-card-badge')).toHaveText('0.75 L');
	});

	test('the 12 hour format applies to the entries, and the quantity can be removed', async ({ app, page }) => {
		await app.start();
		await app.goToSettings('Heure');
		await app.settingsPanel('Heure').locator('mat-select').click();
		await page.locator('mat-option', { hasText: '12' }).click();
		await app.createCustomType('Café', { quantity: true, unit: 'tasses' });
		await app.goToTimeline();
		await app.addCustomEvent('Café', { quantity: '0' });
		const row = app.eventRows(TODAY, 'custom');
		await expect(row.locator('.rail-time')).toHaveText('10:30 AM');
		// Zero is a quantity
		await expect(row.locator('.event-card-badge')).toHaveText('0 tasses');

		await row.click();
		await page.locator('.edit-button').click();
		const edit = page.locator('.bottom-sheet-container.custom.closable-sheet');
		await edit.locator('.quantity-input').fill('');
		await expect(edit.locator('.confirm-button')).toBeEnabled();
		await edit.locator('.confirm-button').click();
		await expect(row.locator('.event-card-badge')).toHaveCount(0);
		// A negative quantity is refused
		await row.click();
		await page.locator('.edit-button').click();
		await edit.locator('.quantity-input').fill('-1');
		await expect(edit.locator('.confirm-button')).toBeDisabled();
	});

	test('names and units are limited in length, a blank name is refused', async ({ app, page }) => {
		await app.start();
		await app.goToManage();
		await page.locator('.manage-tile.add-tile').click();
		const editor = page.locator('.edit-custom-type');
		await editor.locator('.custom-type-label-input').fill('   ');
		await expect(editor.locator('.confirm-button')).toBeDisabled();
		await editor.locator('.custom-type-label-input').fill('x'.repeat(50));
		await expect(editor.locator('.custom-type-label-input')).toHaveValue('x'.repeat(30));
		await editor.locator('.quantity-toggle label').click();
		await editor.locator('.custom-type-unit-input').fill('y'.repeat(50));
		await expect(editor.locator('.custom-type-unit-input')).toHaveValue('y'.repeat(12));
		// Markup is only text
		await editor.locator('.custom-type-label-input').fill('<b>Gras</b>');
		await editor.locator('.confirm-button').click();
		await expect(page.locator('.manage-tile.custom')).toContainText('<b>Gras</b>');
		await expect(page.locator('.manage-tile.custom b')).toHaveCount(0);
	});

	test('the page of a type that doesn\'t exist leads back to Manage', async ({ app, page }) => {
		await app.start();
		await page.goto('/#/custom/ctunknown');
		await expect(page).toHaveURL(/#\/manage$/);
		await expect(page.locator('.manage-tile.add-tile')).toBeVisible();
	});

	test('a type without entries says how to add some', async ({ app, page }) => {
		await app.start();
		await app.createCustomType('Humeur');
		await page.locator('.manage-tile.custom', { hasText: 'Humeur' }).click();
		await expect(page.locator('.manage-list-empty')).toContainText('Humeur');
		await page.locator('.delete-type-button').click();
		await expect(page.locator('.delete-overview')).toContainText('aucune saisie');
		await page.locator('.delete-overview .delete-button').click();
		await expect(page).toHaveURL(/#\/manage$/);
	});

	test('entries of a type missing from a backup are still shown and can be deleted', async ({ app, page }) => {
		await app.start();
		await app.addEvent('log', { key: 'Note' });
		const { content } = await app.exportBackup();
		const today = content.days.find(day => day.date === TODAY);
		today.customs = [{ type: 'custom', customType: 'ctmissing', time: '08:00', key: 'Eau', detail: '', quantity: 2 }];
		await app.importBackup(jsonFile('backup.json', content));
		await page.locator('.import-confirm .confirm-button').click();
		await app.afterImport(async () => {
			await expect(app.eventRows(TODAY, 'custom').locator('.event-card-title')).toHaveText('Eau', { timeout: 1000 });
		});
		const row = app.eventRows(TODAY, 'custom');
		// Neutral color, no unit known
		expect(await cssValue(row, '--row-color')).toBe('#78909C');
		await row.click();
		await page.locator('.delete-button').click();
		await page.locator('.delete-timeline-event .confirm-button').click();
		await expect(app.eventRows(TODAY, 'custom')).toHaveCount(0);
		await expect(app.eventRows(TODAY, 'log')).toHaveCount(1);
	});

	test('a backup with an incomplete type is refused, the current types are kept', async ({ app, page }) => {
		await app.start();
		await app.createCustomType('Eau', { quantity: true, unit: 'L' });
		await app.goToTimeline();
		await app.addCustomEvent('Eau', { quantity: '1' });
		const { content } = await app.exportBackup();
		const error = page.locator('.import-error');
		for (const customType of [null, { key: 'ct1', label: 'Sans couleurs', icon: 'mood' }, { ...content.customTypes[0], key: '' }]) {
			await app.importBackup(jsonFile('backup.json', { ...content, customTypes: [customType] }));
			await expect(error).toContainText('Les données ne correspondent pas à un fichier de sauvegarde Life Notes.');
			await error.locator('.confirm-button').click();
			await expect(error).toBeHidden();
		}
		await app.goToManage();
		await expect(page.locator('.manage-tile.custom')).toHaveText([/Eau/]);
		await app.goToTimeline();
		await expect(app.eventRows(TODAY, 'custom').locator('.event-card-badge')).toHaveText('1 L');
	});

	test('the built-in types are untouched by the custom ones', async ({ app, page }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.createCustomType('Sport doux', { icon: 'self_improvement' });
		await app.goToTimeline();
		await app.addEvent('sport', { key: 'Course' });
		await app.addCustomEvent('Sport doux', { key: 'Course' });
		await app.addEvent('log', { key: 'Course' });
		await expect(app.eventRows(TODAY, 'sport').locator('.event-card-title')).toHaveText('Course');
		await expect(app.eventRows(TODAY, 'custom').locator('.event-card-title')).toHaveText('Course');

		// Deleting the custom entry leaves the sport and the note of the same name and time
		await app.eventRows(TODAY, 'custom').click();
		await page.locator('.delete-button').click();
		await page.locator('.delete-timeline-event .confirm-button').click();
		await expect(app.eventRows(TODAY, 'custom')).toHaveCount(0);
		await expect(app.eventRows(TODAY, 'sport')).toHaveCount(1);
		await expect(app.eventRows(TODAY, 'log')).toHaveCount(1);

		// Built-in lists don't list custom entries
		await app.goToManage('sport');
		await expect(page.locator('.manage-item .manage-item-title')).toHaveText(['Course']);
		await app.goToManage('log');
		await expect(page.locator('.manage-item .manage-item-title')).toHaveText(['Course']);
	});
});

// Entries have no id: they are found by their type, time and name
test.describe('Event types created by the user: edition of the entries', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
	});

	test('a quantity hidden by its type is kept when the entry is edited', async ({ app, page }) => {
		await app.createCustomType('Eau', { quantity: true, unit: 'L' });
		await app.goToTimeline();
		await app.addCustomEvent('Eau', { quantity: '0,5', detail: 'Matin' });
		const editType = async () => {
			await app.goToManage();
			await page.locator('.manage-tile.custom', { hasText: 'Eau' }).click();
			await page.locator('.edit-type-button').click();
			await page.locator('.edit-custom-type .quantity-toggle label').click();
			await page.locator('.edit-custom-type .confirm-button').click();
			await expect(page.locator('.edit-custom-type')).toBeHidden();
		};
		await editType();
		await app.goToTimeline();
		const row = app.eventRows(TODAY, 'custom');
		await row.click();
		await page.locator('.edit-button').click();
		const sheet = page.locator('.bottom-sheet-container.custom.closable-sheet');
		await expect(sheet.locator('.quantity-input')).toHaveCount(0);
		await sheet.locator('ion-textarea textarea').fill('Soir');
		await sheet.locator('.confirm-button').click();
		await expect(row.locator('.event-card-detail')).toHaveText('Soir');

		// Back with the quantity
		await editType();
		await app.goToTimeline();
		await expect(row.locator('.event-card-badge')).toHaveText('0,5 L');
	});

	test('the last quantity of a name is the one of its latest entry, even after an edition', async ({ app, page }) => {
		await app.createCustomType('Eau', { quantity: true, unit: 'L' });
		await app.goToTimeline();
		await page.clock.setFixedTime(new Date(`${TODAY}T08:00:00`));
		await app.addCustomEvent('Eau', { key: 'Eau', quantity: '0,5' });
		await page.clock.setFixedTime(new Date(`${TODAY}T20:00:00`));
		await app.addCustomEvent('Eau', { key: 'Eau', quantity: '1' });
		// The morning entry is edited (an edition used to move it after the evening one)
		const morning = app.eventRows(TODAY, 'custom').filter({ hasText: '0,5 L' });
		await morning.click();
		await page.locator('.edit-button').click();
		const sheet = page.locator('.bottom-sheet-container.custom.closable-sheet');
		await sheet.locator('ion-textarea textarea').fill('Au réveil');
		await sheet.locator('.confirm-button').click();
		await expect(morning.locator('.event-card-detail')).toHaveText('Au réveil');

		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Eau' }).click();
		await expect(page.locator('.manage-item .manage-item-meta').first()).toContainText('1 L');
		// The history lists the latest entry first
		await page.locator('.manage-item').first().locator('.manage-item-actions button').nth(0).click();
		await page.locator('.occurrence-history .list-tab').click();
		await expect(page.locator('.occurrence-history .occurrence-item')).toHaveText([/20:00/, /08:00/]);
		await page.locator('.occurrence-history .close-button').click();

		// A new entry of this name gets the latest quantity
		await app.goToTimeline();
		await app.dayCard(YESTERDAY).locator('.add-event').click();
		await app.addMenuEntry('Eau').click();
		const add = page.locator('.bottom-sheet-container.custom');
		await add.locator('.form-fields-group input').first().fill('E');
		await page.locator('mat-option', { hasText: 'Eau' }).click();
		await expect(add.locator('.quantity-input')).toHaveValue('1');
	});

	test('of two identical entries of the same minute, only one is deleted or edited', async ({ app, page }) => {
		await app.createCustomType('Humeur');
		await app.goToTimeline();
		// No name, same time: nothing tells them apart
		await app.addCustomEvent('Humeur');
		await app.addCustomEvent('Humeur');
		await app.addCustomEvent('Humeur');
		const rows = app.eventRows(TODAY, 'custom');
		await expect(rows).toHaveCount(3);

		// From the timeline
		await rows.first().click();
		await page.locator('.delete-button').click();
		await page.locator('.delete-timeline-event .confirm-button').click();
		await expect(rows).toHaveCount(2);

		// Edition
		await rows.first().click();
		await page.locator('.edit-button').click();
		const sheet = page.locator('.bottom-sheet-container.custom.closable-sheet');
		await sheet.locator('ion-textarea textarea').fill('Bien');
		await sheet.locator('.confirm-button').click();
		await expect(rows).toHaveCount(2);
		await expect(rows.locator('.event-card-detail')).toHaveText(['Bien']);

		// From the history of the type page
		await app.goToManage();
		await page.locator('.manage-tile.custom', { hasText: 'Humeur' }).click();
		await page.locator('.manage-item').first().locator('.manage-item-actions button').nth(0).click();
		await page.locator('.occurrence-history .list-tab').click();
		const history = page.locator('.occurrence-history');
		await expect(history.locator('.occurrence-item')).toHaveCount(2);
		await history.locator('.occurrence-item').first().locator('.occurrence-delete').click();
		await page.locator('app-bottom-sheet-delete-event .confirm-button').click();
		await expect(history.locator('.occurrence-item')).toHaveCount(1);
		await page.locator('.occurrence-history .close-button').click();
		await app.goToTimeline();
		await expect(rows).toHaveCount(1);
	});
});
