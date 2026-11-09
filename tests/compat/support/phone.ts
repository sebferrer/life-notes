import { Browser, BrowserContext, Page, TestInfo, expect, test as base } from '@playwright/test';
import { COMPAT_URL, readBuilds } from './builds';
import { Backup, canonical } from './compare';

export type Version = 'v1' | 'v2';

// Clock of the phones: the day after the last backup of the reference file (2026-11-07), so that its days are the
// first ones of the timeline and its last backup reminder is recent
export const NOW = new Date('2026-11-08T10:30:00+01:00');

// The databases of the app (PouchDB collections)
export const DATA_DBS = ['days', 'symptoms', 'settings', 'customTypes'];

export type Dump = { [db: string]: any[] };

export interface ImportOutcome {
	accepted: boolean;
	// Message of the error sheet when the file is refused
	error?: string;
}

export interface Exported {
	fileName: string;
	text: string;
	json: Backup;
}

// Console errors that don't come from the app
const IGNORED_ERRORS: RegExp[] = [/fonts\.(googleapis|gstatic)\.com/];

// Errors already there in the published version, unrelated to the data. They are reported in the test (annotations),
// they don't fail it. Any other error fails it.
const KNOWN_ERRORS: RegExp[] = [
	// V1 only: concurrent writes of the settings document at the first launch (fixed by the queue of SettingsService
	// in V2)
	// (CustomPouchError, its name minified in the production build)
	/^\[v1\] Console: ERROR \S+ \{"name":"conflict","status":409,"docId":"settings"\}$/,
	// V1 and V2, development build only (Angular doesn't run this check in production): the language select of the
	// settings, when an import changes the language
	/^\[v[12]\] Console: ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked\. Previous value: '(Français|French|Anglais|English)'\. Current value: '(Français|French|Anglais|English)'\.\s+at throwErrorIfNoChangesMode[\s\S]*MatSelect_span/
];

// A phone running the V1 or the V2: its own browser context, so its own database. Switching the version keeps the
// database, as an update of the app (see serve.mjs).
export class Phone {
	private readonly errorList: Promise<string>[] = [];
	private probe: Page;

	private constructor(public readonly name: string, public readonly context: BrowserContext, public readonly page: Page,
		public version: Version) {
		page.on('pageerror', error => this.addError(`[${this.version}] Uncaught: ${error.message}`));
		page.on('console', message => {
			const text = message.text();
			if (message.type() === 'error' && !text.startsWith('Failed to load resource')
				&& !IGNORED_ERRORS.some(pattern => pattern.test(text))) {
				const version = this.version;
				// The errors of PouchDB are objects: their name, status and document tell them apart
				this.errorList.push(Promise.all(message.args().map(arg => arg.evaluate((value: any) =>
					value != null && typeof value === 'object' && value.status != null
						? JSON.stringify({ name: value.name, status: value.status, docId: value.docId })
						: null).catch(() => null)))
					.then(details => `[${version}] Console: ${[text, ...details.filter(d => d != null)].join(' ')}`));
			}
		});
		page.on('response', response => {
			if (response.status() >= 400 && !IGNORED_ERRORS.some(pattern => pattern.test(response.url()))) {
				this.addError(`[${this.version}] HTTP ${response.status()}: ${response.url()}`);
			}
		});
	}

	private addError(error: string): void {
		this.errorList.push(Promise.resolve(error));
	}

	// Errors of the page so far: the unexpected ones, and the known ones (see KNOWN_ERRORS)
	public async errors(): Promise<{ unexpected: string[], known: string[] }> {
		const all = await Promise.all(this.errorList);
		const isKnown = (error: string) => KNOWN_ERRORS.some(pattern => pattern.test(error));
		return { unexpected: all.filter(error => !isKnown(error)), known: all.filter(isKnown) };
	}

	public static async create(browser: Browser, name: string, version: Version, now: Date = NOW): Promise<Phone> {
		const context = await browser.newContext({
			baseURL: COMPAT_URL,
			locale: 'fr-FR',
			timezoneId: 'Europe/Paris',
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			acceptDownloads: true
		});
		await context.clock.setFixedTime(now);
		const page = await context.newPage();
		const phone = new Phone(name, context, page, version);
		await phone.setVersion(version);
		return phone;
	}

	private async setVersion(version: Version): Promise<void> {
		await this.context.addCookies([{ name: 'ln_build', value: version, url: COMPAT_URL }]);
		this.version = version;
	}

	// First launch of a fresh install: language choice, then the welcome dialogs
	public async firstLaunch(language: 'fr' | 'en' = 'fr'): Promise<void> {
		await this.page.goto('/');
		const label = this.page.locator('.language-label', { hasText: language === 'fr' ? 'French' : 'English' });
		await expect(label).toBeVisible();
		// The V1 opens its weekly backup reminder over the choice of the language, at the first launch
		await expect(async () => {
			const other = this.page.locator('mat-dialog-container')
				.filter({ hasNot: this.page.locator('.language-label') })
				.locator('button[mat-dialog-close]:not([routerlink])');
			if (await other.count() > 0) {
				await other.last().click({ timeout: 1000 }).catch(() => undefined);
			}
			await label.click({ timeout: 1000 });
		}).toPass({ timeout: 20_000 });
		await expect(this.page.locator('.language-label')).toHaveCount(0);
		await this.closeDialogs();
	}

	// The app closed and opened again (its database kept)
	public async restart(): Promise<void> {
		await this.page.goto('about:blank');
		await this.page.goto('/');
		await expect(this.page.locator('#menu-icon-settings')).toBeVisible();
		await this.closeDialogs();
	}

	// The app replaced by the other version, as by an update from the store (or a rollback), then opened
	public async installVersion(version: Version): Promise<void> {
		await this.setVersion(version);
		await this.restart();
	}

	// Closes the dialogs opened one after the other (reminders, updates, new interface, tutorial notice...)
	public async closeDialogs(): Promise<void> {
		for (let i = 0; i < 12; i++) {
			const dialog = this.page.locator('mat-dialog-container').last();
			try {
				await dialog.waitFor({ state: 'visible', timeout: 2500 });
			} catch {
				return;
			}
			const close = dialog.locator('button[mat-dialog-close]:not([routerlink])').last();
			if (await close.count() > 0) {
				// A dialog playing its closing animation can't be clicked: the next loop finds the following one
				await close.click({ timeout: 3000 }).catch(() => undefined);
			} else {
				await this.page.keyboard.press('Escape');
			}
			await this.page.waitForTimeout(400);
		}
	}

	public async goToSettings(): Promise<void> {
		await this.page.locator('#menu-icon-settings').click();
		await expect(this.page.locator('#file-import')).toBeAttached();
	}

	// Settings > Import / Export > Import: the confirmation sheet, or the error sheet (closed) for a refused file
	public async selectBackup(name: string, content: string | Buffer): Promise<ImportOutcome> {
		await this.goToSettings();
		await this.page.locator('#file-import').setInputFiles({
			name,
			mimeType: name.toLowerCase().endsWith('.json') ? 'application/json' : 'text/plain',
			buffer: Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8')
		});
		const confirm = this.page.locator('.import-confirm');
		const error = this.page.locator('.import-error');
		await expect(confirm.or(error)).toBeVisible();
		if (await error.isVisible()) {
			const message = (await error.locator('.content-body').innerText()).trim();
			await error.locator('.confirm-button').click();
			await expect(error).toBeHidden();
			return { accepted: false, error: message };
		}
		return { accepted: true };
	}

	public async cancelImport(): Promise<void> {
		await this.page.locator('.import-confirm .cancel-button').click();
		await expect(this.page.locator('.import-confirm')).toHaveCount(0);
	}

	// Confirms the import, then waits for the database to hold the data of the backup: the import runs in the
	// background after the confirmation, the app doesn't tell when it is over
	public async confirmImport(expected: { days: number, symptoms?: number, language?: string }): Promise<void> {
		await this.page.locator('.import-confirm .confirm-button').click();
		await expect(this.page.locator('simple-snack-bar')).toBeVisible();
		await this.waitForStableData(dump => (dump.days || []).length === expected.days
			&& (expected.symptoms == null || (dump.symptoms || []).length === expected.symptoms)
			&& (expected.language == null || (dump.settings || [])[0]?.language === expected.language));
	}

	// Full import of a file, refused files failing the test
	public async importBackup(name: string, content: string | Buffer,
		expected: { days: number, symptoms?: number, language?: string }): Promise<void> {
		const outcome = await this.selectBackup(name, content);
		expect(outcome, `${this.name} (${this.version}) refused ${name}`).toEqual({ accepted: true });
		await this.confirmImport(expected);
	}

	// Settings > Import / Export > Save: the file downloaded, as the user gets it
	public async exportBackup(): Promise<Exported> {
		await this.goToSettings();
		const panel = this.page.locator('mat-expansion-panel').filter({ has: this.page.locator('#file-import') });
		const header = panel.locator('mat-expansion-panel-header');
		if ((await header.getAttribute('aria-expanded')) !== 'true') {
			await header.click();
		}
		const save = panel.locator('mat-list-option').filter({ has: this.page.locator('mat-icon', { hasText: /^\s*save_alt\s*$/ }) });
		const [download] = await Promise.all([this.page.waitForEvent('download'), save.click()]);
		const stream = await download.createReadStream();
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(chunk as Buffer);
		}
		const text = Buffer.concat(chunks).toString('utf-8');
		return { fileName: download.suggestedFilename(), text, json: JSON.parse(text) };
	}

	// Page of the app server that doesn't run the app, to read and write its database directly
	private async probePage(): Promise<Page> {
		if (this.probe == null) {
			this.probe = await this.context.newPage();
			await this.probe.goto('/assets/i18n/fr.json');
			await this.probe.addScriptTag({ path: 'node_modules/pouchdb/dist/pouchdb.min.js' });
		}
		return this.probe;
	}

	// Every document of the databases of the app, as stored (only the existing databases are opened)
	public async dump(names: string[] = DATA_DBS): Promise<Dump> {
		const probe = await this.probePage();
		return probe.evaluate(async (wanted: string[]) => {
			const existing = (await (indexedDB as any).databases()).map(db => db.name);
			const result = {};
			for (const name of wanted) {
				if (!existing.includes('_pouch_' + name)) {
					result[name] = [];
					continue;
				}
				const db = new (window as any).PouchDB(name);
				const all = await db.allDocs({ include_docs: true });
				result[name] = all.rows.map(row => row.doc);
				await db.close();
			}
			return result;
		}, names);
	}

	// Writes documents as a former version stored them (the revision of an existing document is taken over)
	public async writeDocs(name: string, docs: any[]): Promise<void> {
		const probe = await this.probePage();
		await probe.evaluate(async ({ name, docs }) => {
			const db = new (window as any).PouchDB(name);
			for (const doc of docs) {
				const saved = await db.get(doc._id).catch(() => null);
				const { _rev, ...content } = doc;
				await db.put(saved ? { ...content, _rev: saved._rev } : content);
			}
			await db.close();
		}, { name, docs });
	}

	// Waits until the data satisfies the condition and no longer changes (1.5 s)
	public async waitForStableData(condition: (dump: Dump) => boolean, timeout = 120_000): Promise<Dump> {
		const start = Date.now();
		let last: string = null;
		let stableSince = 0;
		let dump: Dump;
		while (Date.now() - start < timeout) {
			dump = await this.dump();
			const current = canonical(dump);
			if (current === last && condition(dump)) {
				if (Date.now() - stableSince >= 1500) {
					return dump;
				}
			} else {
				last = current;
				stableSince = Date.now();
			}
			await this.page.waitForTimeout(250);
		}
		throw new Error(`${this.name} (${this.version}): data not as expected after ${timeout} ms: `
			+ JSON.stringify({ days: dump?.days?.length, symptoms: dump?.symptoms?.length, settings: dump?.settings }));
	}

	public async close(testInfo: TestInfo): Promise<void> {
		if (testInfo.status !== testInfo.expectedStatus && !this.page.isClosed()) {
			const screenshot = await this.page.screenshot().catch(() => null);
			if (screenshot) {
				await testInfo.attach(`${this.name}-${this.version}.png`, { body: screenshot, contentType: 'image/png' });
			}
		}
		await this.context.close();
	}
}

type PhoneFactory = (name: string, version: Version, now?: Date) => Promise<Phone>;

// Each test creates its phones; any JavaScript error of their app fails the test
export const test = base.extend<{ phone: PhoneFactory }>({
	phone: async ({ browser }, use, testInfo) => {
		// The versions compared, in the report
		const builds = readBuilds();
		testInfo.annotations.push({
			type: 'builds',
			description: `${builds.mode}: V1 ${builds.v1.ref} ${builds.v1.sha.slice(0, 10)} (${builds.v1.version}), `
				+ `V2 ${builds.v2.ref} ${builds.v2.sha.slice(0, 10)} (${builds.v2.version})`
		});
		const phones: Phone[] = [];
		await use(async (name, version, now) => {
			const phone = await Phone.create(browser, name, version, now);
			phones.push(phone);
			return phone;
		});
		// Read before the pages are closed (the details of the errors come from the pages)
		const errors = await Promise.all(phones.map(phone => phone.errors()));
		for (const phone of phones) {
			await phone.close(testInfo);
		}
		phones.forEach((phone, i) => {
			if (errors[i].known.length > 0) {
				testInfo.annotations.push({ type: 'known error', description: `${phone.name}: ${errors[i].known.map(e => e.split('\n')[0]).join(' | ')}` });
			}
			expect(errors[i].unexpected, `JavaScript errors in ${phone.name}`).toEqual([]);
		});
	}
});

export { expect };
