import { test, expect, Phone } from './support/phone';
import { CorpusFile, EDGE_V1, REF, RICH_V2, V037, expectedCounts } from './support/corpus';
import { Backup, diffDocs, summary } from './support/compare';

// What the V2 shows of an imported backup: on the page of each day, every entry with its name, its detail and its
// dose, in the V2 interface and in the V1 one (kept by the users of the former versions). Then every month of the
// calendar and every year of the Year in Pixels, without any error. Browsing never changes the data.

type Mode = 'v2' | 'v1';
const TYPES = ['symptomLog', 'log', 'med', 'meal', 'sport', 'custom'];

function norm(text: any): string {
	return text == null ? '' : String(text).replace(/\s+/g, ' ').trim();
}

// The rows the page of a day must show, as "type | title | detail | badge" (* : not compared)
function expectedRows(day: any, backup: Backup, mode: Mode): string[] {
	const label = (key: string) => (backup.symptoms.find(s => s.key === key) || {}).label;
	const customType = (key: string) => (backup.customTypes || []).find(t => t.key === key);
	const rows: string[] = [];
	const detail = (event: any) => mode === 'v2'
		? (event.detail ? norm(event.detail) : '')
		: (event.detail != null && event.detail.length ? norm(event.detail) : '');
	for (const symptom of day.symptoms || []) {
		for (const log of symptom.logs || []) {
			rows.push(['symptomLog', mode === 'v2' ? norm(label(log.key)) : '*', detail(log), '*'].join(' | '));
		}
	}
	for (const type of ['log', 'meal', 'sport']) {
		const list = day[type === 'log' ? 'logs' : type + 's'] || [];
		for (const event of list) {
			rows.push([type, norm(event.key), detail(event), ''].join(' | '));
		}
	}
	for (const med of day.meds || []) {
		rows.push(mode === 'v2'
			? ['med', norm(med.key), '', med.quantity ? norm(`${med.quantity} mg`) : ''].join(' | ')
			: ['med', norm(`${med.key} ${med.quantity ?? ''}mg`), '', ''].join(' | '));
	}
	for (const entry of day.customs || []) {
		const title = entry.key || (customType(entry.customType) || {}).label || '';
		rows.push(['custom', mode === 'v2' ? norm(title) : '*', detail(entry), '*'].join(' | '));
	}
	return rows.sort();
}

// The rows shown by the page of the day
async function shownRows(phone: Phone, date: string, mode: Mode): Promise<string[]> {
	const page = phone.page;
	// Through another page: the page of a day doesn't read the date again when only the date changes (as a user,
	// who goes back to the calendar or the timeline before opening another day)
	await page.evaluate(() => { location.hash = '#/about'; });
	await expect(page.locator('app-about')).toBeAttached();
	await page.evaluate(d => { location.hash = `#/${d}`; }, date);
	const container = page.locator(mode === 'v2' ? `.day-page#day-${date}` : `.day-container#day-${date}`);
	await expect(container).toBeVisible();
	// The rows are drawn with the day
	await page.waitForTimeout(50);
	const rows = await container.evaluate((element, { mode, types }) => {
		const text = (node: Element) => node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
		if (mode === 'v2') {
			return Array.from(element.querySelectorAll('.event-row')).map(row => {
				const type = types.find(t => row.classList.contains(t));
				// Badges of the intensities and of the custom quantities depend on the settings: not compared
				const badge = type === 'symptomLog' || type === 'custom' ? '*' : text(row.querySelector('.event-card-badge'));
				return [type, text(row.querySelector('.event-card-title')), text(row.querySelector('.event-card-detail')), badge].join(' | ');
			});
		}
		return Array.from(element.querySelectorAll('mat-chip')).map(chip => {
			const type = types.find(t => chip.classList.contains('day-day-item-' + t));
			const content = type === 'symptomLog' || type === 'custom' ? '*' : text(chip.querySelector('.event-content'));
			return [type, content, text(chip.querySelector('.event-detail')), type === 'symptomLog' || type === 'custom' ? '*' : ''].join(' | ');
		});
	}, { mode, types: TYPES });
	return rows.sort();
}

async function useInterface(phone: Phone, mode: Mode): Promise<void> {
	const [settings] = (await phone.dump(['settings'])).settings;
	await phone.writeDocs('settings', [{ ...settings, uiVersion: mode, newUiPopupSeen: true }]);
	await phone.restart();
	await expect(phone.page.locator('body')).toHaveClass(mode === 'v1' ? /ui-v1/ : /^(?!.*ui-v1)/);
}

async function importInto(phone: Phone, file: CorpusFile): Promise<void> {
	await phone.firstLaunch('fr');
	await phone.importBackup(file.name, file.text, expectedCounts(file));
	if (file.backup.customTypes) {
		await phone.waitForStableData(d => d.customTypes.length === file.backup.customTypes.length);
	}
}

// Every entry of the given days is shown, then the data is still the one of the file
async function checkDays(phone: Phone, file: CorpusFile, dates: string[], mode: Mode): Promise<void> {
	const failures: string[] = [];
	for (const date of dates) {
		const day = file.backup.days.find(d => d.date === date);
		const expected = expectedRows(day, file.backup, mode);
		const shown = await shownRows(phone, date, mode);
		if (JSON.stringify(expected) !== JSON.stringify(shown)) {
			failures.push(`${date}\n    expected: ${JSON.stringify(expected)}\n    shown:    ${JSON.stringify(shown)}`);
		}
		const wakeUp = phone.page.locator(mode === 'v2' ? `#day-${date} .sleep-row.wakeUp` : `#day-${date} .wakeup-time`);
		if (mode === 'v2') {
			await expect.soft(wakeUp, `${date}: wake-up`).toHaveClass(day.wakeUp ? /^(?!.*\bempty\b)/ : /\bempty\b/);
		} else {
			await expect.soft(wakeUp, `${date}: wake-up`).toHaveText(day.wakeUp || '');
		}
	}
	expect.soft(failures, `${failures.length} day(s) not shown as saved:\n${failures.slice(0, 10).join('\n')}`).toEqual([]);
	const exported = (await phone.exportBackup()).json;
	const differences = diffDocs('days', file.backup.days, exported.days);
	expect.soft(differences, `data changed by browsing: ${summary(differences)}`).toEqual([]);
}

const allDates = (file: CorpusFile) => file.backup.days.map(d => d.date).sort();

for (const mode of ['v2', 'v1'] as Mode[]) {
	test.describe(`V2 app, ${mode.toUpperCase()} interface: page of each day`, () => {

		for (const file of [EDGE_V1, V037, RICH_V2]) {
			test(`${file.name}: every entry of every day`, async ({ phone }) => {
				const v2 = await phone('phone-v2', 'v2');
				await importInto(v2, file);
				await useInterface(v2, mode);
				await checkDays(v2, file, allDates(file), mode);
			});
		}

		// The 1063 days of the reference, in parts run side by side
		const PARTS = mode === 'v2' ? 4 : 2;
		for (let part = 0; part < PARTS; part++) {
			test(`${REF.name}: every entry of every day, part ${part + 1}/${PARTS}`, async ({ phone }) => {
				test.setTimeout(600_000);
				const v2 = await phone('phone-v2', 'v2');
				await importInto(v2, REF);
				await useInterface(v2, mode);
				const dates = allDates(REF).filter((_, i) => i % PARTS === part);
				await checkDays(v2, REF, dates, mode);
			});
		}
	});
}

test.describe('V2 app: calendar and Year in Pixels of every month', () => {

	for (const mode of ['v2', 'v1'] as Mode[]) {
		for (const file of [REF, EDGE_V1, RICH_V2]) {
			test(`${mode.toUpperCase()} interface, ${file.name}`, async ({ phone }) => {
				test.setTimeout(400_000);
				const v2 = await phone('phone-v2', 'v2');
				await importInto(v2, file);
				await useInterface(v2, mode);
				const page = v2.page;
				const dates = allDates(file).filter(d => d <= '2026-11-30');
				const first = dates[0];
				// Months from the current one back to the first one of the file
				const months = (2026 - +first.slice(0, 4)) * 12 + (11 - +first.slice(5, 7));
				await page.locator('#menu-icon-calendar').click();
				const previous = page.locator('button[aria-label="Previous"]').first();
				await expect(previous).toBeVisible();
				for (let i = 0; i < months; i++) {
					await previous.click();
					await page.waitForTimeout(150);
				}
				// Year in Pixels of each year of the file
				for (let year = +first.slice(0, 4); year <= 2026; year++) {
					await page.evaluate(y => { location.hash = `#/yearinpixels/${y}`; }, year);
					await expect(page.locator('app-year-in-pixels')).toBeVisible();
					await page.waitForTimeout(300);
				}
				// Monthly report of the last month with data
				await page.evaluate(m => { location.hash = `#/monthlyreport/${m}`; }, dates[dates.length - 1].slice(0, 7));
				await page.waitForTimeout(1500);
				// Browsing never changes the data
				const exported = (await v2.exportBackup()).json;
				const differences = diffDocs('days', file.backup.days, exported.days);
				expect.soft(differences, `data changed by browsing: ${summary(differences)}`).toEqual([]);
			});
		}
	}
});
