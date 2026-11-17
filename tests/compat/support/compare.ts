// Comparison of backups and databases: strict on the values AND their types ("400" is not 400), without any
// tolerance. Differences are listed by path, e.g. days[2026-10-31].meds[0].quantity: "400" -> 400.

export interface Backup {
	days: any[];
	symptoms: any[];
	settings: any;
	customTypes?: any[];
	[key: string]: any;
}

// Settings of the published version (0.3.7): the V2 must keep each of them
export const V1_SETTINGS_KEYS = [
	'targetSymptomKey', 'language', 'timeFormat', 'painScale', 'firstStart', 'lastInstall', 'lastUpdate',
	'showDeveloperMode', 'showAdvancedSettings', 'calendarStartOnSunday', 'calendarBlockView', 'painPalette',
	'weeklyReminder', 'lastWeeklyReminder', 'autoCalculateOverview', 'autoOverviewPopupSeen', 'timePicker', '_id'
];

// Settings added by the V2
export const V2_SETTINGS_KEYS = [
	'dailyReminder', 'lastDailyReminder', 'darkMode', 'landscapeMode', 'uiVersion', 'sleepChartMode',
	'newUiPopupSeen', 'eventColors'
];

// lastInstall, the version of the app stored in the settings, differs between two versions of the app: compared
// apart, with the version the app stores at its start. Its own one when the stored one is older or isn't a version
// (the 2025 versions stored a date), never a lower one (an app rolled back keeps the newer one)
export const VERSION_KEY = 'lastInstall';

export function versionAfterStart(stored: string, app: string): string {
	return typeof stored === 'string' && stored.startsWith('0.') && !(stored < app) ? stored : app;
}

// Same JSON whatever the order of the keys of the objects (the order of the arrays counts)
export function canonical(value: any): string {
	return JSON.stringify(sortKeys(value));
}

function sortKeys(value: any): any {
	if (Array.isArray(value)) {
		return value.map(sortKeys);
	}
	if (value != null && typeof value === 'object') {
		return Object.keys(value).sort().reduce((sorted, key) => {
			sorted[key] = sortKeys(value[key]);
			return sorted;
		}, {});
	}
	return value;
}

function show(value: any): string {
	if (value === undefined) {
		return '(absent)';
	}
	const text = JSON.stringify(value);
	return text.length > 120 ? text.slice(0, 117) + '...' : text;
}

// Differences between two values, by path. Arrays are compared index by index (the order counts).
export function diff(expected: any, actual: any, path = '', out: string[] = []): string[] {
	if (Array.isArray(expected) && Array.isArray(actual)) {
		for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
			diff(expected[i], actual[i], `${path}[${i}]`, out);
		}
		return out;
	}
	if (expected != null && actual != null && typeof expected === 'object' && typeof actual === 'object'
		&& !Array.isArray(expected) && !Array.isArray(actual)) {
		const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
		for (const key of [...keys].sort()) {
			diff(expected[key], actual[key], path ? `${path}.${key}` : key, out);
		}
		return out;
	}
	// Strict: types included, absent is not null
	if (!Object.is(expected, actual) && !(expected === undefined && actual === undefined)) {
		out.push(`${path}: ${show(expected)} -> ${show(actual)}`);
	}
	return out;
}

// Documents of a list by id (_id, or key for the custom types), to compare them whatever their order
export function byId(docs: any[], idField = '_id'): Map<string, any> {
	const map = new Map<string, any>();
	for (const doc of docs || []) {
		map.set(String(doc[idField]), doc);
	}
	return map;
}

// Differences between two lists of documents, matched by id: missing, extra and changed documents
export function diffDocs(label: string, expected: any[], actual: any[], options: { idField?: string, ignore?: string[] } = {}): string[] {
	const idField = options.idField || '_id';
	const ignore = options.ignore || [];
	const strip = (doc: any) => {
		const copy = { ...doc };
		ignore.forEach(field => delete copy[field]);
		return copy;
	};
	const out: string[] = [];
	if ((expected || []).length !== (actual || []).length) {
		out.push(`${label}: ${(expected || []).length} documents -> ${(actual || []).length}`);
	}
	const expectedById = byId(expected, idField);
	const actualById = byId(actual, idField);
	for (const [id, doc] of expectedById) {
		if (!actualById.has(id)) {
			out.push(`${label}[${id}]: missing`);
			continue;
		}
		diff(strip(doc), strip(actualById.get(id)), `${label}[${id}]`, out);
	}
	for (const id of actualById.keys()) {
		if (!expectedById.has(id)) {
			out.push(`${label}[${id}]: unexpected`);
		}
	}
	return out;
}

export function pick(object: any, keys: string[]): any {
	const picked = {};
	for (const key of keys) {
		if (object != null && key in object) {
			picked[key] = object[key];
		}
	}
	return picked;
}

export function omit(object: any, keys: string[]): any {
	const copy = { ...object };
	keys.forEach(key => delete copy[key]);
	return copy;
}

// Number of events of a day, as the timeline lists them (one row each)
export function countEvents(day: any): number {
	return (day.logs || []).length + (day.meds || []).length + (day.meals || []).length
		+ (day.sports || []).length + (day.customs || []).length
		+ (day.symptoms || []).reduce((count, symptom) => count + (symptom.logs || []).length, 0);
}

// Short summary of the differences for the error messages (the full list is attached to the report)
export function summary(differences: string[], max = 40): string {
	if (differences.length === 0) {
		return 'no difference';
	}
	const shown = differences.slice(0, max).join('\n  ');
	return `${differences.length} difference(s):\n  ${shown}${differences.length > max ? '\n  ...' : ''}`;
}
