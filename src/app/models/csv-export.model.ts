import { IDay } from './day.model';
import { ISymptom, MAX_PAIN_LEVEL } from './symptom.model';
import { ICustomType } from './custom-type.model';
import { toNightMinutes } from './sleep-stats.model';

// Export of the entries as a CSV file, for a spreadsheet (Excel, Google Sheets, LibreOffice) and its charts. Only what
// the user logged, none of the settings. Two layouts of the same data:
// - 'days': one line per day, one column per measure: the intensity of the day of each symptom (the dot of the day),
//   the sleep, the dose of each medication, the quantity (or the count) of each type of the user, the count of the
//   meals, sports and notes. A chart in two clicks: the dates and a column.
// - 'events': one line per entry, as in the backup: the intensities of the day, the wake-up and the bedtime, every
//   event with its time and its detail. For the filters and the pivot tables.
// In both, an empty cell is "nothing logged", never 0 (the app tells them apart too), and the days without any entry
// are left out. The dates are ISO (YYYY-MM-DD) and the times 24 h: every spreadsheet reads them as such. The
// intensities are on the scale of the app (0-5 or 0-10), as the user knows them.
export type CsvLayout = 'days' | 'events';

export const CSV_LAYOUTS: CsvLayout[] = ['days', 'events'];

export interface ICsvData {
	days: IDay[];
	symptoms: ISymptom[];
	customTypes: ICustomType[];
}

export interface ICsvOptions {
	// 5 or 10, as in the settings
	painScale: number;
	// Locale of the language of the app: its decimal separator, and the separator of the cells that goes with it
	locale: string;
	translate: (key: string, params?: { [param: string]: any }) => string;
}

// null: an empty cell. Numbers are written with the decimal separator of the language.
type Cell = string | number | null;

// Excel only reads the file as UTF-8 (accents, Japanese) with this mark
const BYTE_ORDER_MARK = '﻿';
const LINE_END = '\r\n';
const MED_UNIT = 'mg';

// The spreadsheets of the languages writing 1,5 split the cells of a CSV file on ";", the other ones on ","
export function getCsvSeparators(locale: string): { cell: string, decimal: string } {
	const decimal = (1.5).toLocaleString(locale).includes(',') ? ',' : '.';
	return { cell: decimal === ',' ? ';' : ',', decimal };
}

// e.g. life-notes-days-202603181030.csv
export function getCsvFileName(layout: CsvLayout, date: Date): string {
	const pad = (value: number) => String(value).padStart(2, '0');
	const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
		+ `${pad(date.getHours())}${pad(date.getMinutes())}`;
	return `life-notes-${layout}-${stamp}.csv`;
}

// The days with at least one entry, oldest first
export function getCsvDays(days: IDay[]): IDay[] {
	return (days || []).filter(day => day != null && hasEntries(day))
		.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

export function buildCsv(layout: CsvLayout, data: ICsvData, options: ICsvOptions): string {
	const rows = layout === 'days' ? buildDayRows(data, options) : buildEventRows(data, options);
	const separators = getCsvSeparators(options.locale);
	return BYTE_ORDER_MARK + rows.map(row => row.map(cell => formatCell(cell, separators)).join(separators.cell))
		.join(LINE_END) + LINE_END;
}

// --- One line per day ---

interface IColumn {
	title: string;
	value: (day: IDay) => Cell;
}

function buildDayRows(data: ICsvData, options: ICsvOptions): Cell[][] {
	const t = options.translate;
	const days = getCsvDays(data.days);
	// Every day, for the bedtime of the day before the first one of a series
	const bedTimes = new Map<string, string>();
	(data.days || []).filter(day => day != null).forEach(day => bedTimes.set(day.date, day.goToBed));

	const columns: IColumn[] = [
		{ title: t('CSV_DATE'), value: day => day.date },
		{ title: t('TIMELINE_WAKE_UP'), value: day => day.wakeUp || null },
		{ title: t('TIMELINE_GO_TO_BED'), value: day => day.goToBed || null },
		{ title: t('CSV_SLEEP'), value: day => getSleepHours(bedTimes.get(previousDate(day.date)), day.wakeUp) }
	];

	// The intensity of the day of each symptom which has one, in the order of the list of symptoms
	const labels = getSymptomLabels(data.symptoms);
	const symptomKeys = sortByOrder(unique(flatMap(days, day => (day.symptomOverviews || [])
		.filter(overview => overview != null && toNumber(overview.pain) != null).map(overview => overview.key))),
		(data.symptoms || []).map(symptom => symptom.key));
	symptomKeys.forEach(key => columns.push({
		title: t('CSV_SYMPTOM_COLUMN', { name: labels.get(key) || key, max: options.painScale }),
		value: day => {
			const overview = (day.symptomOverviews || []).find(o => o != null && o.key === key);
			return overview != null ? toScale(overview.pain, options.painScale) : null;
		}
	}));

	// The dose of each medication in the day, or how many times it was taken when no dose was ever given
	const medKeys = unique(flatMap(days, day => (day.meds || []).map(med => trimmed(med.key)).filter(key => key !== '')))
		.sort(compareText);
	medKeys.forEach(key => {
		const entries = (day: IDay) => (day.meds || []).filter(med => trimmed(med.key) === key);
		const withDose = days.some(day => entries(day).some(med => toNumber(med.quantity) != null));
		columns.push(withDose
			? { title: t('CSV_QUANTITY_COLUMN', { name: key, unit: MED_UNIT }), value: day => sum(entries(day).map(med => med.quantity)) }
			: { title: t('CSV_COUNT_COLUMN', { name: key }), value: day => count(entries(day)) });
	});

	// The types of the user: the quantity of the day (with the unit of the type) or the number of entries
	(data.customTypes || []).forEach(customType => {
		const entries = (day: IDay) => (day.customs || []).filter(entry => entry != null && entry.customType === customType.key);
		if (!days.some(day => entries(day).length > 0)) {
			return;
		}
		if (customType.quantity) {
			columns.push({
				title: customType.unit ? t('CSV_QUANTITY_COLUMN', { name: customType.label, unit: customType.unit })
					: customType.label,
				value: day => sum(entries(day).map(entry => entry.quantity))
			});
		} else {
			columns.push({ title: t('CSV_COUNT_COLUMN', { name: customType.label }), value: day => count(entries(day)) });
		}
	});

	columns.push(
		{ title: t('CSV_COUNT_COLUMN', { name: t('MANAGE_MEALS') }), value: day => count(day.meals) },
		{ title: t('CSV_COUNT_COLUMN', { name: t('MANAGE_SPORTS') }), value: day => count(day.sports) },
		{ title: t('CSV_COUNT_COLUMN', { name: t('MANAGE_LOGS') }), value: day => count(day.logs) }
	);

	return [columns.map(column => column.title), ...days.map(day => columns.map(column => column.value(day)))];
}

// The night before the day: from the bedtime of the day before to the wake-up (as the sleep of the calendar)
function getSleepHours(bedTime: string, wakeUp: string): number {
	const start = toNightMinutes(bedTime);
	const end = toNightMinutes(wakeUp);
	return start != null && end != null && end > start ? (end - start) / 60 : null;
}

// --- One line per entry ---

function buildEventRows(data: ICsvData, options: ICsvOptions): Cell[][] {
	const t = options.translate;
	const labels = getSymptomLabels(data.symptoms);
	const customTypes = new Map<string, ICustomType>();
	(data.customTypes || []).forEach(customType => customTypes.set(customType.key, customType));

	const rows: Cell[][] = [[
		t('CSV_DATE'), t('TIME'), t('CSV_TYPE'), t('CSV_NAME'), t('CSV_INTENSITY', { max: options.painScale }),
		t('CSV_QUANTITY'), t('CSV_UNIT'), t('CSV_DETAIL')
	]];
	getCsvDays(data.days).forEach(day => {
		const row = (time: string, type: string, name: string, intensity: Cell, quantity: Cell, unit: string,
			detail: string): Cell[] => [day.date, time || null, type, name || null, intensity, quantity, unit || null,
				detail || null];

		(day.symptomOverviews || []).filter(overview => overview != null && toNumber(overview.pain) != null)
			.forEach(overview => rows.push(row(null, t('CSV_DAY_INTENSITY'), labels.get(overview.key) || overview.key,
				toScale(overview.pain, options.painScale), null, null, null)));
		if (day.wakeUp) {
			rows.push(row(day.wakeUp, t('TIMELINE_WAKE_UP'), null, null, null, null, null));
		}

		// The events of the day by time, those without a time at the end
		const events: { time: string, cells: Cell[] }[] = [];
		(day.symptoms || []).forEach(symptom => (symptom.logs || []).filter(log => log != null).forEach(log =>
			events.push({ time: log.time, cells: row(log.time, t('ADD_MENU_SYMPTOM'), labels.get(log.key) || log.key,
				toScale(log.pain, options.painScale), null, null, log.detail) })));
		(day.meds || []).forEach(med => {
			const dose = toNumber(med.quantity);
			events.push({ time: med.time, cells: row(med.time, t('ADD_MENU_MED'), med.key, null, dose,
				dose != null ? MED_UNIT : null, (med as any).detail) });
		});
		(day.meals || []).forEach(meal =>
			events.push({ time: meal.time, cells: row(meal.time, t('ADD_MENU_MEAL'), meal.key, null, null, null, meal.detail) }));
		(day.sports || []).forEach(sport =>
			events.push({ time: sport.time, cells: row(sport.time, t('ADD_MENU_SPORT'), sport.key, null, null, null, sport.detail) }));
		(day.logs || []).forEach(log =>
			events.push({ time: log.time, cells: row(log.time, t('ADD_MENU_NOTE'), log.key, null, null, null, log.detail) }));
		(day.customs || []).filter(entry => entry != null).forEach(entry => {
			const customType = customTypes.get(entry.customType);
			const label = customType != null ? customType.label : entry.customType;
			// The quantity only for a type which has one (as in the app: the values typed before are kept, but hidden)
			const quantity = customType != null && customType.quantity ? toNumber(entry.quantity) : null;
			events.push({ time: entry.time, cells: row(entry.time, label, entry.key || label, null, quantity,
				quantity != null ? customType.unit : null, entry.detail) });
		});
		events.filter(event => event != null).map((event, index) => ({ ...event, index }))
			.sort((a, b) => compareTimes(a.time, b.time) || a.index - b.index)
			.forEach(event => rows.push(event.cells));

		if (day.goToBed) {
			rows.push(row(day.goToBed, t('TIMELINE_GO_TO_BED'), null, null, null, null, null));
		}
	});
	return rows;
}

// --- Cells ---

function formatCell(cell: Cell, separators: { cell: string, decimal: string }): string {
	if (cell == null) {
		return '';
	}
	if (typeof cell === 'number') {
		return String(Math.round(cell * 100) / 100).replace('.', separators.decimal);
	}
	let text = String(cell);
	// A text starting like a formula would be computed by the spreadsheet ("=...", "+33 6...", "-5 kg"): kept as a text
	if (/^[=+\-@\t\r]/.test(text) && !/^[+-]?\d+([.,]\d+)?$/.test(text)) {
		text = '\'' + text;
	}
	if (text.includes(separators.cell) || /["\r\n]/.test(text)) {
		text = '"' + text.replace(/"/g, '""') + '"';
	}
	return text;
}

// --- Helpers ---

function hasEntries(day: IDay): boolean {
	return !!day.wakeUp || !!day.goToBed
		|| (day.symptomOverviews || []).some(overview => overview != null && toNumber(overview.pain) != null)
		|| (day.symptoms || []).some(symptom => symptom != null && (symptom.logs || []).length > 0)
		|| [day.meds, day.meals, day.sports, day.logs, day.customs].some(entries => (entries || []).length > 0);
}

function getSymptomLabels(symptoms: ISymptom[]): Map<string, string> {
	const labels = new Map<string, string>();
	(symptoms || []).filter(symptom => symptom != null).forEach(symptom => labels.set(symptom.key, symptom.label || symptom.key));
	return labels;
}

// Intensities are stored from 0 to 5
function toScale(pain: any, painScale: number): number {
	const value = toNumber(pain);
	return value != null ? value * painScale / MAX_PAIN_LEVEL : null;
}

// The quantities of the former versions are texts ("500"), some typed with a comma
function toNumber(value: any): number {
	if (value == null || value === '') {
		return null;
	}
	const number = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));
	return isFinite(number) ? number : null;
}

function sum(values: any[]): number {
	const numbers = values.map(toNumber).filter(value => value != null);
	return numbers.length > 0 ? numbers.reduce((total, value) => total + value, 0) : null;
}

function count(entries: any[]): number {
	const length = (entries || []).filter(entry => entry != null).length;
	return length > 0 ? length : null;
}

function previousDate(date: string): string {
	const day = new Date(date + 'T00:00:00Z');
	day.setUTCDate(day.getUTCDate() - 1);
	return day.toISOString().slice(0, 10);
}

function compareTimes(a: string, b: string): number {
	if (!a || !b) {
		return !a && !b ? 0 : !a ? 1 : -1;
	}
	return a < b ? -1 : a > b ? 1 : 0;
}

function compareText(a: string, b: string): number {
	return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function trimmed(value: any): string {
	return value == null ? '' : String(value).trim();
}

function unique<T>(values: T[]): T[] {
	return Array.from(new Set(values));
}

function flatMap<T, U>(values: T[], map: (value: T) => U[]): U[] {
	return values.reduce((all, value) => all.concat(map(value)), [] as U[]);
}

// In the given order, the other ones after
function sortByOrder(keys: string[], order: string[]): string[] {
	const rank = (key: string) => order.indexOf(key) >= 0 ? order.indexOf(key) : order.length;
	return keys.map((key, index) => ({ key, index })).sort((a, b) => rank(a.key) - rank(b.key) || a.index - b.index)
		.map(item => item.key);
}
