import { test as base, expect, Locator, Page } from '@playwright/test';

// Day used as "today" by every test (frozen clock): the dates and times shown by the app are deterministic
export const TODAY = '2026-03-18';
export const NOW = new Date(`${TODAY}T10:30:00`);

export function shiftDate(date: string, days: number): string {
	const d = new Date(`${date}T12:00:00`);
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 10);
}

export const YESTERDAY = shiftDate(TODAY, -1);

export type EventType = 'symptomLog' | 'med' | 'log' | 'sport' | 'meal';

// Entries of the "add an event" sheet (French)
const ADD_MENU: { [type in EventType]: string } = {
	symptomLog: 'Ajouter un symptôme',
	med: 'Ajouter un médicament',
	log: 'Ajouter une note',
	sport: 'Ajouter un sport',
	meal: 'Ajouter un repas'
};

// Console errors that don't come from the app
const IGNORED_CONSOLE_ERRORS: RegExp[] = [
	// Google Fonts unreachable (offline runs): the icons are then drawn with their names, the tests still pass
	/fonts\.(googleapis|gstatic)\.com/
];

// Actions of a user in the app, in French unless said otherwise
export class App {

	constructor(public readonly page: Page) { }

	// First launch: language choice then the welcome dialogs
	public async start(language: 'fr' | 'en' = 'fr'): Promise<void> {
		await this.page.goto('/');
		await this.page.locator('.language-label', { hasText: language === 'fr' ? 'French' : 'English' }).click();
		await expect(this.page.locator('.language-label')).toHaveCount(0);
		await this.closeDialogs();
	}

	// Closes the dialogs opened one after the other (welcome, updates, tutorial notice...)
	public async closeDialogs(): Promise<void> {
		// "Close" button of the top dialog (the tutorial notice also has a "go to tutorial" one)
		const closeButton = this.page.locator('mat-dialog-container button[mat-dialog-close]:not([routerlink])').last();
		for (let i = 0; i < 10; i++) {
			try {
				// The next dialog opens once the previous answer is saved
				await closeButton.waitFor({ state: 'visible', timeout: 2500 });
			} catch {
				return;
			}
			// A dialog playing its closing animation can't be clicked: the next loop finds the following one
			await closeButton.click({ timeout: 3000 }).catch(() => undefined);
			await this.page.waitForTimeout(300);
		}
	}

	public async reload(): Promise<void> {
		await this.page.reload();
		await this.closeDialogs();
	}

	public async goToTimeline(): Promise<void> {
		await this.page.locator('#menu-icon-timeline').click();
		await expect(this.page.locator('.day-card, .timeline-tile').first()).toBeVisible();
	}

	public async goToCalendar(): Promise<void> {
		await this.page.locator('#menu-icon-calendar').click();
		await expect(this.page.locator('.calendar-card')).toBeVisible();
	}

	public async goToManage(tile?: 'symptomLog' | 'med' | 'log' | 'sport'): Promise<void> {
		await this.page.locator('#menu-icon-manage').click();
		if (tile) {
			await this.page.locator(`.manage-tile.${tile}`).click();
		}
	}

	public async goToSettings(panel?: string): Promise<void> {
		await this.page.locator('#menu-icon-settings').click();
		if (panel) {
			await this.settingsPanel(panel).locator('mat-expansion-panel-header').click();
		}
	}

	public settingsPanel(title: string): Locator {
		return this.page.locator('mat-expansion-panel', {
			has: this.page.locator('.panel-title', { hasText: title })
		}).first();
	}

	// Slide toggle of the settings, found by its label
	public settingsToggle(label: string): Locator {
		return this.page.locator('.toggle-container', { hasText: label }).locator('mat-slide-toggle');
	}

	public async setToggle(label: string, checked: boolean): Promise<void> {
		const toggle = this.settingsToggle(label);
		if ((await toggle.locator('input').isChecked()) !== checked) {
			await toggle.locator('label').click();
		}
		await expect(toggle.locator('input')).toBeChecked({ checked });
	}

	public async chooseRadio(label: string): Promise<void> {
		await this.page.locator('mat-radio-button', { hasText: label }).locator('label').click();
	}

	// Manage > Symptoms > Add
	public async addSymptom(label: string): Promise<void> {
		await this.goToManage('symptomLog');
		await this.page.locator('.add-card').click();
		const sheet = this.page.locator('.add-symptom');
		await sheet.locator('input').fill(label);
		await sheet.locator('.actions button').click();
		await expect(this.page.locator('.symptom-card .symptom-label', { hasText: label })).toBeVisible();
	}

	public async targetSymptom(label: string): Promise<void> {
		await this.page.locator('#menu-icon-target-symptom').click();
		await this.page.locator('.mat-menu-item', { hasText: label }).click();
		await expect(this.page.locator('#menu-icon-target-symptom .targetSymptomKey')).toHaveText(label);
	}

	// Card of a day in the (modern) timeline
	public dayCard(date: string = TODAY): Locator {
		return this.page.locator(`#day-${date}`);
	}

	public eventRows(date: string = TODAY, type?: EventType): Locator {
		return this.dayCard(date).locator(type ? `.event-row.${type}` : '.event-row');
	}

	// Adds an event to a day of the timeline, at the current (frozen) time unless a time is given
	public async addEvent(type: EventType, options: { key?: string, quantity?: string, detail?: string } = {},
		date: string = TODAY): Promise<void> {
		const rowsBefore = await this.eventRows(date).count();
		await this.dayCard(date).locator('.add-event').click();
		await this.page.locator('mat-nav-list a', { hasText: ADD_MENU[type] }).click();
		const sheet = this.page.locator(`.bottom-sheet-container.${type}`);
		await expect(sheet).toBeVisible();
		const inputs = sheet.locator('.form-fields-group input');
		if (options.key != null) {
			await inputs.nth(0).fill(options.key);
		}
		if (options.quantity != null) {
			await inputs.nth(1).fill(options.quantity);
		}
		if (options.detail != null) {
			await sheet.locator('ion-textarea textarea').fill(options.detail);
		}
		// Closes the suggestions of the name field (the sheet itself ignores Escape)
		await this.page.keyboard.press('Escape');
		await sheet.locator('.confirm-button').click();
		await expect(sheet).toBeHidden();
		// One-time information dialogs (e.g. after the first symptom)
		await this.closeDialogs();
		await expect(this.eventRows(date)).toHaveCount(rowsBefore + 1);
	}

	// Intensity of the day for the target symptom, through the dot of the day card
	public async setDayIntensity(value: number, date: string = TODAY): Promise<void> {
		await this.dayCard(date).locator('.day-card-overview').click();
		const sheet = this.page.locator('.edit-symptom-overview');
		await expect(sheet).toBeVisible();
		await sheet.locator('ion-range').evaluate((range: any, v) => {
			range.value = v;
			range.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
		}, value);
		await expect(sheet.locator('.pain-badge')).toHaveText(String(value));
		await sheet.locator('.confirm-button').click();
		await expect(sheet).toBeHidden();
	}

	// Value of a CSS variable on the body (theme and event colors)
	public async cssVariable(name: string): Promise<string> {
		return (await this.page.evaluate(n => getComputedStyle(document.body).getPropertyValue(n), name)).trim();
	}

	// Settings > Import / Export > Import, with the given backup file
	public async importBackup(file: string | { name: string, mimeType: string, buffer: Buffer }): Promise<void> {
		await this.goToSettings('Importer / Exporter');
		await this.page.locator('#file-import').setInputFiles(file);
	}

	// The import runs in the background after its confirmation: retries the check until the data is there
	public async afterImport(check: () => Promise<void>): Promise<void> {
		await expect(async () => {
			// Leaves the timeline so that it reads the days again
			await this.page.locator('#menu-icon-calendar').click();
			await this.goToTimeline();
			await check();
		}).toPass({ timeout: 15_000 });
	}

	// Settings > Import / Export > Save: the backup downloaded by the browser
	public async exportBackup(): Promise<{ fileName: string, content: any }> {
		await this.goToSettings('Importer / Exporter');
		const [download] = await Promise.all([
			this.page.waitForEvent('download'),
			this.page.locator('mat-list-option', { hasText: 'Sauvegarder' }).click()
		]);
		const stream = await download.createReadStream();
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(chunk as Buffer);
		}
		return { fileName: download.suggestedFilename(), content: JSON.parse(Buffer.concat(chunks).toString('utf-8')) };
	}

	// Waits for the icon and text fonts, needed for stable screenshots
	public async fontsReady(): Promise<void> {
		await this.page.evaluate(() => (document as any).fonts.ready);
	}
}

// Every test gets a fresh app (empty database, frozen clock). Any JavaScript error or console error
// of the page fails the test, even when the screen looks fine.
export const test = base.extend<{ app: App }>({
	app: async ({ page }, use) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(`Uncaught: ${error.message}`));
		page.on('console', message => {
			const text = message.text();
			// Failed resources are reported below, with their URL
			if (message.type() === 'error' && !text.startsWith('Failed to load resource')
				&& !IGNORED_CONSOLE_ERRORS.some(pattern => pattern.test(text))) {
				errors.push(`Console: ${text}`);
			}
		});
		page.on('response', response => {
			if (response.status() >= 400 && !IGNORED_CONSOLE_ERRORS.some(pattern => pattern.test(response.url()))) {
				errors.push(`HTTP ${response.status()}: ${response.url()}`);
			}
		});
		await page.clock.setFixedTime(NOW);
		await use(new App(page));
		expect(errors, 'JavaScript errors in the page').toEqual([]);
	}
});

export { expect };
