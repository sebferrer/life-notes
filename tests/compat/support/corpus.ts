import { readFileSync } from 'fs';
import { Backup } from './compare';

// The backups imported by the compatibility tests. Real files made by the published version (V1), and files built
// here, deterministic, with what a backup of each version can hold.

export interface CorpusFile {
	name: string;
	description: string;
	text: string;
	backup: Backup;
}

function fromFile(path: string, description: string): CorpusFile {
	const text = readFileSync(path, 'utf-8');
	return { name: path.split('/').pop(), description, text, backup: JSON.parse(text) };
}

function built(name: string, description: string, backup: Backup): CorpusFile {
	return { name, description, text: JSON.stringify(backup), backup };
}

// A day as the V1 saves it (same order of the fields)
function day(date: string, content: any = {}): any {
	return {
		date, symptomOverviews: [], symptoms: [], logs: [], meds: [], meals: [], wakeUp: '', goToBed: '',
		...content, _id: date
	};
}

function symptomLog(key: string, time: string, pain: any, detail?: string): any {
	return detail === undefined ? { type: 'symptomLog', time, key, pain } : { type: 'symptomLog', time, key, pain, detail };
}

// Groups symptom logs as the days hold them
function symptoms(...logs: any[]): any[] {
	const groups: any[] = [];
	for (const log of logs) {
		let group = groups.find(g => g.key === log.key);
		if (group == null) {
			group = { type: 'symptom', key: log.key, logs: [] };
			groups.push(group);
		}
		group.logs.push(log);
	}
	return groups;
}

function med(time: string, key: string, quantity?: any): any {
	return quantity === undefined ? { type: 'med', time, key } : { type: 'med', time, key, quantity };
}

function meal(time: string, key: string, detail?: string): any {
	return detail === undefined ? { type: 'meal', time, key } : { type: 'meal', time, key, detail };
}

function note(time: string, key: string, detail?: string): any {
	return detail === undefined ? { type: 'log', time, key } : { type: 'log', time, key, detail };
}

function sport(time: string, key: string, detail?: string): any {
	return { type: 'sport', time, key, detail };
}

function custom(customType: string, time: string, key: string, quantity: number, detail?: string): any {
	return { type: 'custom', customType, time, key, detail, quantity };
}

// Deterministic pseudo-random numbers (mulberry32)
function random(seed: number): () => number {
	return () => {
		seed |= 0;
		seed = seed + 0x6D2B79F5 | 0;
		let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

function dates(last: string, count: number): string[] {
	const result: string[] = [];
	const d = new Date(`${last}T12:00:00Z`);
	for (let i = 0; i < count; i++) {
		result.push(d.toISOString().slice(0, 10));
		d.setUTCDate(d.getUTCDate() - 1);
	}
	return result;
}

function time(rand: () => number, from = 6, to = 23): string {
	const minutes = Math.floor(rand() * (to - from) * 60) + from * 60;
	return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// Settings of the published version, every field set to a value other than the default one
const V1_SETTINGS_CUSTOMIZED = {
	targetSymptomKey: 'maux_de_ventre',
	language: 'fr',
	timeFormat: 'us',
	painScale: 5,
	firstStart: false,
	lastInstall: '0.3.7',
	lastUpdate: 0,
	showDeveloperMode: true,
	showAdvancedSettings: true,
	calendarStartOnSunday: false,
	calendarBlockView: true,
	painPalette: '1',
	weeklyReminder: false,
	lastWeeklyReminder: 1790000000000,
	autoCalculateOverview: false,
	autoOverviewPopupSeen: true,
	timePicker: 'ionic',
	_id: 'settings'
};

const LONG_TEXT = 'Très long texte. '.repeat(300);

// ---------------------------------------------------------------------------------------------------------------
// Real backups of the published version

// Made by the user with the published app: 1063 days (2023-12-06 to 2026-11-02), 7 symptoms, English
export const REF = fromFile('tests/compat/fixtures/life-notes-save-v1-ref.json',
	'Backup of the published app (0.3.7), 1063 days, 7 symptoms, English');

// Made with the version 0.3.7 too, some entries typed in its own interface (see tests/README.md), French
export const V037 = fromFile('tests/fixtures/backup-0.3.7.json',
	'Backup of the version 0.3.7 (tests/fixtures), 58 days, entries typed in its interface, French');

// ---------------------------------------------------------------------------------------------------------------
// Every value a day of the V1 can hold, and the unusual ones

export const EDGE_V1 = built('edge-cases-v1.json', 'V1 format: every kind of entry and the unusual values', {
	days: [
		// Oldest day
		day('2019-06-01', { logs: [note('09:00', 'Premier jour')] }),
		// Leap day
		day('2024-02-29', {
			symptomOverviews: [{ key: 'migraine', pain: 4 }],
			symptoms: symptoms(symptomLog('migraine', '08:10', 3), symptomLog('migraine', '19:45', 4.5, 'Plus fort le soir'))
		}),
		// New year: bedtime at the last minute, wake-up at midnight
		day('2024-12-31', { goToBed: '23:59', meals: [meal('20:30', 'Réveillon', 'Huîtres & foie gras')] }),
		day('2025-01-01', { wakeUp: '00:00', logs: [note('00:00', 'Bonne année !')] }),
		// Changes of time in Paris: 02:30 doesn't exist in spring, happens twice in autumn
		day('2025-03-30', { meds: [med('02:30', 'Doliprane', '1000')], wakeUp: '07:00', goToBed: '23:00' }),
		day('2025-10-26', { meds: [med('02:30', 'Doliprane', '1000'), med('02:30', 'Doliprane', '1000')] }),
		// A full day: every kind of entry, several of each, times not in order, identical entries of the same minute
		day('2025-04-30', {
			symptomOverviews: [{ key: 'migraine', pain: 3.5 }, { key: 'maux_de_ventre', pain: 1 }, { key: 'douleur', pain: 0 }],
			symptoms: symptoms(
				symptomLog('migraine', '18:00', 4),
				symptomLog('migraine', '08:00', 2),
				symptomLog('migraine', '08:00', 2),
				symptomLog('maux_de_ventre', '12:30', 1, ''),
				symptomLog('douleur', '23:59', 0, 'Aucune douleur'),
				symptomLog('unicode', '00:00', 5, 'Max 🔥')
			),
			logs: [
				note('21:00', 'Ligne 1\nLigne 2', 'Tab\tet "guillemets" et \\antislash\\'),
				note('07:00', '<script>alert("x")</script>', '<b>gras</b> & <i>italique</i>'),
				note('12:00', 'Émoji 😀👍🏽 et 日本語 et עברית', ''),
				note('12:00', 'Émoji 😀👍🏽 et 日本語 et עברית', '')
			],
			meds: [
				med('08:00', 'Doliprane', '1000'),
				med('09:00', 'Ibuprofène', 400),
				med('10:00', 'Mélatonine', '0.5'),
				med('11:00', 'Spasfon', '1,5'),
				med('12:00', 'Homéopathie', ''),
				med('13:00', 'Smecta', '2 sachets'),
				med('14:00', 'Placebo', 0),
				med('15:00', 'Sans dose'),
				med('16:00', 'Vitamine D', 2.5),
				med('17:00', 'Grosse dose', 1000000)
			],
			meals: [
				meal('20:00', 'Dîner', 'Pâtes à la carbonara'),
				meal('07:30', 'Petit-déjeuner'),
				meal('12:15', 'Déjeuner', ''),
				meal('16:00', 'Goûter "maison"', 'Crêpes 🥞')
			],
			wakeUp: '06:45',
			goToBed: '23:30'
		}),
		// Only the wake-up, only the bedtime
		day('2025-05-01', { wakeUp: '06:15' }),
		day('2025-05-02', { goToBed: '22:45' }),
		// Intensities entered by hand only, one of a deleted symptom
		day('2025-05-03', {
			symptomOverviews: [{ key: 'migraine', pain: 0 }, { key: 'maux_de_ventre', pain: 5 }, { key: 'douleur', pain: 2.5 },
				{ key: 'supprime', pain: 3 }]
		}),
		// Nothing left in the day
		day('2025-05-04'),
		// Intensities saved as strings by a former version
		day('2025-05-05', {
			symptomOverviews: [{ key: 'migraine', pain: '2' }],
			symptoms: symptoms(symptomLog('migraine', '10:00', '3', ''))
		}),
		// Very long texts
		day('2025-05-06', {
			logs: [note('10:00', 'Titre très long '.repeat(20).trim(), LONG_TEXT)],
			meals: [meal('12:00', 'Repas', LONG_TEXT)],
			symptoms: symptoms(symptomLog('migraine', '13:00', 2, LONG_TEXT))
		}),
		// Fields unknown to both versions (e.g. a backup of a future version): kept as they are
		day('2025-05-07', {
			mood: 3,
			weather: { temperature: 21.5, sky: 'clair' },
			logs: [{ type: 'log', time: '09:00', key: 'Note', detail: 'Avec un champ inconnu', foo: 'bar' }],
			meds: [{ type: 'med', time: '10:00', key: 'Doliprane', quantity: '500', unit: 'mg' }]
		}),
		// Entries of a deleted symptom
		day('2025-05-08', {
			symptomOverviews: [{ key: 'supprime', pain: 4 }],
			symptoms: symptoms(symptomLog('supprime', '11:00', 4, 'Symptôme supprimé depuis'))
		}),
		// The day before the clock of the phones: first day of the timeline
		day('2026-11-07', {
			symptomOverviews: [{ key: 'maux_de_ventre', pain: 2 }],
			symptoms: symptoms(symptomLog('maux_de_ventre', '09:30', 2, 'Après le café')),
			meds: [med('09:45', 'Spasfon', '2')],
			meals: [meal('08:00', 'Café', 'Serré')],
			logs: [note('20:00', 'Hier')],
			wakeUp: '07:20',
			goToBed: '23:10'
		}),
		// A day of the future
		day('2027-01-15', { logs: [note('10:00', 'Rendez-vous chez le médecin')] })
	],
	symptoms: [
		{ key: 'migraine', label: 'Migraine', _id: 'migraine' },
		{ key: 'maux_de_ventre', label: 'Maux de ventre 🤢', _id: 'maux_de_ventre' },
		{ key: 'douleur', label: 'Douleur "aiguë" <b>gras</b> & \\ antislash', _id: 'douleur' },
		{ key: 'unicode', label: 'Ünïcödé 日本語 עברית العربية', _id: 'unicode' },
		{ key: 'jamais_utilise', label: 'Jamais utilisé', _id: 'jamais_utilise' }
	],
	settings: { ...V1_SETTINGS_CUSTOMIZED }
});

// Settings of a 2025 version (five fields) with the days of the reference file
export const OLD_SETTINGS = built('old-settings-2025.json', 'Settings of a 2025 version (five fields), 120 days of the reference', {
	days: REF.backup.days.slice(0, 120),
	symptoms: REF.backup.symptoms,
	settings: { targetSymptomKey: 'headache', language: 'fr', timeFormat: 'eu', firstStart: false, lastInstall: '20250601120000', _id: 'settings' }
});

// Six years of a heavy user: 2190 days, about 17,000 entries
export const STRESS = (() => {
	const rand = random(20261108);
	const keys = ['migraine', 'nausee', 'fatigue', 'dos'];
	const days = dates('2026-11-07', 2190).map(date => {
		const logs = [];
		for (let i = Math.floor(rand() * 4); i > 0; i--) {
			const key = keys[Math.floor(rand() * keys.length)];
			logs.push(symptomLog(key, time(rand), Math.round(rand() * 10) / 2, rand() < 0.3 ? `Détail ${date}` : undefined));
		}
		const groups = symptoms(...logs);
		const overviews = groups.map(g => ({ key: g.key, pain: Math.ceil(g.logs.reduce((s, l) => s + l.pain, 0) / g.logs.length * 2) / 2 }));
		const meds = [];
		for (let i = Math.floor(rand() * 3); i > 0; i--) {
			meds.push(med(time(rand), ['Doliprane', 'Ibuprofène', 'Spasfon'][Math.floor(rand() * 3)], rand() < 0.8 ? String([500, 1000, 400][Math.floor(rand() * 3)]) : 200));
		}
		return day(date, {
			symptomOverviews: overviews,
			symptoms: groups,
			logs: rand() < 0.4 ? [note(time(rand), `Note du ${date}`, rand() < 0.5 ? 'Avec un détail' : undefined)] : [],
			meds,
			meals: [meal('08:00', 'Petit-déjeuner'), meal('12:30', 'Déjeuner', 'Cantine'), meal('20:00', 'Dîner')],
			wakeUp: time(rand, 6, 9),
			goToBed: rand() < 0.95 ? time(rand, 21, 23) : ''
		});
	});
	// The V1 saves the days in the order of their ids
	days.sort((a, b) => a._id.localeCompare(b._id));
	return built('stress-6-years.json', '2190 days, about 17,000 entries', {
		days,
		symptoms: keys.map(key => ({ key, label: key[0].toUpperCase() + key.slice(1), _id: key })),
		settings: { ...V1_SETTINGS_CUSTOMIZED, targetSymptomKey: 'migraine' }
	});
})();

// ---------------------------------------------------------------------------------------------------------------
// The V2 format: sports, event types created by the user and their entries, inverted scales, new settings

export const CUSTOM_TYPES = [
	{
		key: 'ctwater01', label: 'Eau', icon: 'water_drop', colors: { light: '#00897B', dark: '#4DB6AC' },
		quantity: true, unit: 'L', created: 1790000000000
	},
	{
		key: 'ctcafe002', label: 'Café ☕ "serré"', icon: 'local_cafe', colors: { light: '#6D4C41', dark: '#BCAAA4' },
		quantity: true, unit: 'tasses', created: 1790000001000
	},
	{
		key: 'ctmood003', label: 'Méditation', icon: 'self_improvement', colors: { light: '#8E24AA', dark: '#CE93D8' },
		quantity: false, unit: '', created: 1790000002000
	}
];

export const RICH_V2 = (() => {
	const rand = random(42);
	const days = dates('2026-11-07', 100).map((date, i) => {
		const logs = [];
		if (rand() < 0.6) {
			logs.push(symptomLog('migraine', time(rand), Math.round(rand() * 10) / 2, rand() < 0.4 ? 'Pulsatile' : ''));
		}
		if (rand() < 0.5) {
			logs.push(symptomLog('humeur', time(rand), Math.round(rand() * 10) / 2, ''));
		}
		const groups = symptoms(...logs);
		const customs = [];
		for (let n = Math.floor(rand() * 4); n > 0; n--) {
			customs.push(custom('ctwater01', time(rand), rand() < 0.5 ? 'Eau plate' : '', Math.round(rand() * 20) / 10, ''));
		}
		if (rand() < 0.5) {
			customs.push(custom('ctcafe002', time(rand, 7, 16), 'Expresso', 1 + Math.floor(rand() * 3), rand() < 0.3 ? 'Sans sucre' : ''));
		}
		if (rand() < 0.3) {
			customs.push(custom('ctmood003', time(rand), '', null, 'Dix minutes'));
		}
		return day(date, {
			symptomOverviews: groups.map(g => ({ key: g.key, pain: g.logs[0].pain })),
			symptoms: groups,
			logs: rand() < 0.3 ? [note(time(rand), 'Note', '')] : [],
			meds: rand() < 0.4 ? [med(time(rand), 'Doliprane', '1000')] : [],
			meals: rand() < 0.7 ? [meal('12:30', 'Déjeuner', '')] : [],
			sports: rand() < 0.4 ? [sport(time(rand, 7, 20), ['Course', 'Vélo', 'Natation'][Math.floor(rand() * 3)], rand() < 0.5 ? '5 km' : '')] : [],
			customs,
			wakeUp: time(rand, 6, 9),
			goToBed: i === 0 ? '' : time(rand, 21, 23)
		});
	});
	// Days saved by the V1 before the update: without the fields of the V2
	const older = dates('2026-07-29', 20).map(date => day(date, {
		meals: [meal('12:00', 'Déjeuner')], wakeUp: '07:00', goToBed: '23:00'
	}));
	const all = [...days, ...older].sort((a, b) => a._id.localeCompare(b._id));
	return built('rich-v2.json', 'V2 format: sports, 3 custom types and their entries, inverted scale, every new setting', {
		days: all,
		symptoms: [
			{ key: 'humeur', label: 'Humeur', invertedScale: true, _id: 'humeur' },
			{ key: 'migraine', label: 'Migraine', invertedScale: false, _id: 'migraine' },
			// Created by the V1
			{ key: 'nausee', label: 'Nausée', _id: 'nausee' }
		],
		settings: {
			targetSymptomKey: 'migraine', language: 'fr', timeFormat: 'eu', painScale: 10, firstStart: false,
			lastInstall: '0.3.7', lastUpdate: 0, showDeveloperMode: false, showAdvancedSettings: true,
			calendarStartOnSunday: false, calendarBlockView: false, painPalette: '2', weeklyReminder: true,
			lastWeeklyReminder: 1794000000000, autoCalculateOverview: true, autoOverviewPopupSeen: true,
			timePicker: 'material', _id: 'settings', dailyReminder: true, lastDailyReminder: 1794000000000,
			darkMode: true, landscapeMode: false, uiVersion: 'v2', sleepChartMode: 'curves', newUiPopupSeen: true,
			eventColors: {
				light: { symptomLog: '#AA0000', med: '#0096BF', log: '#98A2AE', sport: '#FF8C00' },
				dark: { symptomLog: '#FF7A90', med: '#00FF00', log: '#AAB4C0', sport: '#FFAD5C' }
			}
		},
		customTypes: CUSTOM_TYPES
	});
})();

// Days whose only entry known by the V1 is a symptom, without wake-up nor bedtime (but the last one): when it is
// removed, a version removes the whole day if it deems it empty. Only the 2026-11-04 is (a symptom, nothing else)
export const NEWER_DATA = (() => {
	const symptom = {
		symptomOverviews: [{ key: 'migraine', pain: 3 }],
		symptoms: symptoms(symptomLog('migraine', '09:00', 3, 'Pulsatile'))
	};
	const v2Entries = {
		sports: [sport('18:00', 'Course', '5 km')],
		customs: [custom('ctwater01', '10:00', 'Eau plate', 1.5, '')]
	};
	return built('newer-data.json', 'Days holding entries of the V2 and of a later version, besides a symptom', {
		days: [
			// A field of a version after the V2, unknown to the V1 and to the V2
			day('2026-11-03', { ...symptom, moods: [{ type: 'mood', time: '20:00', key: 'Calme', detail: '' }] }),
			day('2026-11-04', { ...symptom }),
			day('2026-11-05', { ...symptom, ...v2Entries }),
			day('2026-11-06', { ...symptom, ...v2Entries, wakeUp: '07:00' })
		],
		symptoms: [{ key: 'migraine', label: 'Migraine', invertedScale: false, _id: 'migraine' }],
		settings: { ...RICH_V2.backup.settings, darkMode: false },
		customTypes: [CUSTOM_TYPES[0]]
	});
})();

// Files of the V1 world, imported into both versions and compared
export const V1_CORPUS: CorpusFile[] = [REF, V037, EDGE_V1, OLD_SETTINGS, STRESS];

export function expectedCounts(file: CorpusFile): { days: number, symptoms: number, language: string } {
	return {
		days: new Set(file.backup.days.map(d => d._id)).size,
		symptoms: new Set(file.backup.symptoms.map(s => s._id)).size,
		language: file.backup.settings.language
	};
}
