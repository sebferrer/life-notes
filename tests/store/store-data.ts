// Data of the Google Play screenshots: a backup of ten months of a realistic use of the app, in French or English.
// The story: migraines that become rarer after a magnesium treatment started in March.
import { CURRENT_VERSION } from '../support/app';

export type Lang = 'fr' | 'en';

// "Today" of the screenshots (frozen clock): late in a month, so that the calendar and the Year in Pixels are full
export const STORE_TODAY = '2026-10-28';
export const STORE_NOW = new Date(`${STORE_TODAY}T20:30:00`);
const FIRST_DAY = '2026-01-01';

export const SYMPTOM_KEYS = { migraine: 'migraine', fatigue: 'fatigue', stomach: 'stomach', back: 'back' };
const CUSTOM_KEYS = { water: 'ctwater', coffee: 'ctcoffee', meditation: 'ctmeditation' };

const TEXTS = {
	fr: {
		symptoms: { migraine: 'Migraine', fatigue: 'Fatigue', stomach: 'Maux de ventre', back: 'Mal de dos' },
		migraineDetails: ['Côté droit', 'Derrière l\'œil droit', 'Pulsatile', 'Avec nausées', 'Sensible à la lumière'],
		fatigueDetails: ['Coup de barre', 'Difficile de se concentrer'],
		stomachDetails: ['Ballonnements', 'Après le repas'],
		backDetails: ['Bas du dos', 'Après une longue journée assis'],
		meds: { magnesium: 'Magnésium', sumatriptan: 'Sumatriptan', paracetamol: 'Paracétamol', ibuprofen: 'Ibuprofène' },
		logs: {
			badNight: ['Mauvaise nuit', 'Réveillé deux fois'],
			stress: ['Journée stressante', 'Gros rendu au travail'],
			storm: ['Orage', 'Temps lourd'],
			screens: ['Écrans tard le soir', ''],
			doctor: ['Rendez-vous médecin', 'Bilan migraines'],
			doctorStart: ['Rendez-vous médecin', 'Début du magnésium']
		},
		sports: {
			running: ['Course à pied', ['5 km', '6 km', '8 km', '10 km']],
			yoga: ['Yoga', ['30 min', '45 min', 'Stretching']],
			cycling: ['Vélo', ['18 km', '25 km', '32 km']],
			swimming: ['Natation', ['1 km', '1,5 km']]
		},
		meals: ['Salade de quinoa', 'Pâtes au pesto', 'Saumon et riz', 'Curry de lentilles', 'Soupe de légumes',
			'Omelette aux champignons', 'Poulet rôti', 'Pizza'],
		mealDetails: ['', '', 'Fait maison', 'Au restaurant'],
		customTypes: { water: ['Hydratation', 'L'], coffee: ['Café', ''], meditation: ['Méditation', 'min'] },
		water: 'Eau',
		coffees: ['Expresso', 'Expresso', 'Cappuccino', 'Café allongé'],
		meditations: ['Respiration', 'Méditation guidée'],
		today: {
			migraineDetail: 'Derrière l\'œil droit',
			stress: ['Journée stressante', 'Gros rendu au travail'],
			yoga: ['Yoga', '30 min, ça soulage'],
			meal: ['Salade de quinoa', 'Fait maison']
		}
	},
	en: {
		symptoms: { migraine: 'Migraine', fatigue: 'Fatigue', stomach: 'Stomach ache', back: 'Back pain' },
		migraineDetails: ['Right side', 'Behind the right eye', 'Throbbing', 'With nausea', 'Light sensitivity'],
		fatigueDetails: ['Energy crash', 'Hard to focus'],
		stomachDetails: ['Bloating', 'After the meal'],
		backDetails: ['Lower back', 'After a long day sitting'],
		meds: { magnesium: 'Magnesium', sumatriptan: 'Sumatriptan', paracetamol: 'Paracetamol', ibuprofen: 'Ibuprofen' },
		logs: {
			badNight: ['Bad night', 'Woke up twice'],
			stress: ['Stressful day', 'Big deadline at work'],
			storm: ['Thunderstorm', 'Heavy weather'],
			screens: ['Late screen time', ''],
			doctor: ['Doctor appointment', 'Migraine check-up'],
			doctorStart: ['Doctor appointment', 'Started magnesium']
		},
		sports: {
			running: ['Running', ['5 km', '6 km', '8 km', '10 km']],
			yoga: ['Yoga', ['30 min', '45 min', 'Stretching']],
			cycling: ['Cycling', ['18 km', '25 km', '32 km']],
			swimming: ['Swimming', ['1 km', '1.5 km']]
		},
		meals: ['Quinoa salad', 'Pesto pasta', 'Salmon and rice', 'Lentil curry', 'Vegetable soup',
			'Mushroom omelette', 'Roast chicken', 'Pizza'],
		mealDetails: ['', '', 'Homemade', 'Restaurant'],
		customTypes: { water: ['Hydration', 'L'], coffee: ['Coffee', ''], meditation: ['Meditation', 'min'] },
		water: 'Water',
		coffees: ['Espresso', 'Espresso', 'Cappuccino', 'Americano'],
		meditations: ['Breathing', 'Guided meditation'],
		today: {
			migraineDetail: 'Behind the right eye',
			stress: ['Stressful day', 'Big deadline at work'],
			yoga: ['Yoga', '30 min, it helps'],
			meal: ['Quinoa salad', 'Homemade']
		}
	}
};

// Deterministic pseudo-random numbers (mulberry32): the same screenshots on every run
function random(seed: number): () => number {
	return () => {
		seed = (seed + 0x6D2B79F5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

function time(minutes: number): string {
	minutes = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
	return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function dates(from: string, to: string): string[] {
	const result = [];
	const day = new Date(`${from}T12:00:00Z`);
	while (day.toISOString().slice(0, 10) <= to) {
		result.push(day.toISOString().slice(0, 10));
		day.setUTCDate(day.getUTCDate() + 1);
	}
	return result;
}

// Intensities are stored from 0 to 5 by steps of 0.5 (shown out of 10)
function intensity(value: number): number {
	return Math.max(0, Math.min(5, Math.round(value * 2) / 2));
}

// customTypes false: only the built-in event types (the video shows a type being created)
export function storeBackup(lang: Lang, options: { customTypes?: boolean } = {}): any {
	const t = TEXTS[lang];
	const rnd = random(42);
	// Back pain, added later: numbers of its own, so that the other data stay the same
	const backRnd = random(7);
	const pick = <T>(list: T[]): T => list[Math.floor(rnd() * list.length)];
	const chance = (p: number) => rnd() < p;
	const days = [];

	let nextMigraine = 3;
	let migraineTail = 0;
	dates(FIRST_DAY, STORE_TODAY).forEach((date, index) => {
		const month = Number(date.slice(5, 7));
		const weekDay = new Date(`${date}T12:00:00Z`).getUTCDay();
		const weekend = weekDay === 0 || weekDay === 6;
		// Magnesium from the doctor appointment of March 3rd
		const treated = date >= '2026-03-03';

		const day = {
			_id: date, date, symptomOverviews: [], symptoms: [], logs: [], meds: [], meals: [], sports: [], customs: [],
			wakeUp: '', goToBed: ''
		};
		const symptomLog = (key: string, minutes: number, pain: number, detail: string) => {
			let symptom = day.symptoms.find(s => s.key === key);
			if (symptom == null) {
				symptom = { type: 'symptom', key, logs: [] };
				day.symptoms.push(symptom);
			}
			symptom.logs.push({ type: 'symptomLog', time: time(minutes), key, pain: intensity(pain), detail });
		};
		const log = ([key, detail]: string[], minutes: number) =>
			day.logs.push({ type: 'log', time: time(minutes), key, detail });
		const med = (key: string, quantity: string, minutes: number) =>
			day.meds.push({ type: 'med', time: time(minutes), key, quantity });
		const custom = (customType: string, key: string, minutes: number, quantity?: number) =>
			day.customs.push({ type: 'custom', customType, time: time(minutes), key, detail: '', quantity: quantity ?? null });

		// Sleep
		const badNight = chance(0.13) || nextMigraine === 1 && chance(0.5);
		const wakeUp = (weekend ? 8 * 60 + 30 : 7 * 60) + (rnd() - 0.5) * 70 - (badNight ? 25 : 0);
		day.wakeUp = time(wakeUp);
		day.goToBed = time(22 * 60 + 50 + (rnd() - 0.5) * 80 + (badNight ? 35 : 0));

		// Migraine attacks, rarer with the treatment
		let migraine = 0;
		nextMigraine--;
		if (nextMigraine <= 0) {
			migraine = 3 + rnd() * 1.6;
			migraineTail = chance(treated ? 0.35 : 0.65) ? 1.5 + rnd() * 1.2 : 0;
			const gap = month <= 2 ? 4 + rnd() * 3 : month <= 5 ? 7 + rnd() * 4 : 11 + rnd() * 6;
			nextMigraine = Math.round(gap);
		} else if (migraineTail > 0) {
			migraine = migraineTail;
			migraineTail = 0;
		} else if (chance(treated ? 0.06 : 0.14)) {
			migraine = 0.5 + rnd();
		}
		migraine = intensity(migraine);
		if (migraine > 0) {
			const start = 10 * 60 + rnd() * 7 * 60;
			symptomLog(SYMPTOM_KEYS.migraine, start, migraine, pick(t.migraineDetails));
			if (migraine >= 3) {
				med(t.meds.sumatriptan, '50', start + 10);
			} else if (migraine >= 1.5) {
				med(chance(0.6) ? t.meds.paracetamol : t.meds.ibuprofen, chance(0.6) ? '1000' : '400', start + 15);
			}
		}

		const fatigue = intensity((badNight ? 2 + rnd() * 1.5 : chance(0.45) ? 0 : 0.5 + rnd() * 1.2)
			+ (migraine >= 3 ? 1 : 0));
		if (fatigue >= 2.5) {
			symptomLog(SYMPTOM_KEYS.fatigue, 14 * 60 + rnd() * 180, fatigue, pick(t.fatigueDetails));
		}
		const stomach = chance(0.08) ? intensity(1.5 + rnd() * 1.5) : 0;
		if (stomach > 0) {
			symptomLog(SYMPTOM_KEYS.stomach, 13 * 60 + 30 + rnd() * 60, stomach, pick(t.stomachDetails));
		}
		// Back pain: now and then, on working days mostly
		const back = backRnd() < (weekend ? 0.06 : 0.16) ? intensity(1 + backRnd() * 2.5) : 0;
		if (back > 0) {
			const details = t.backDetails;
			symptomLog(SYMPTOM_KEYS.back, 17 * 60 + backRnd() * 120, back, details[Math.floor(backRnd() * details.length)]);
		}
		// No symptom of an inverted scale (a mood) in the screenshots: it weighs them down. Its number is still drawn,
		// so that the next ones, and so the other data, stay the same.
		rnd();

		day.symptomOverviews = [
			{ key: SYMPTOM_KEYS.migraine, pain: migraine },
			{ key: SYMPTOM_KEYS.fatigue, pain: fatigue },
			{ key: SYMPTOM_KEYS.stomach, pain: stomach },
			{ key: SYMPTOM_KEYS.back, pain: back }
		];

		// Notes
		if (badNight) {
			log(t.logs.badNight, wakeUp + 5);
		}
		if (!weekend && chance(0.11)) {
			log(t.logs.stress, 17 * 60 + rnd() * 90);
		}
		if (chance(0.04) && month >= 5 && month <= 9) {
			log(t.logs.storm, 16 * 60 + rnd() * 120);
		}
		if (chance(0.06)) {
			log(t.logs.screens, 23 * 60);
		}
		if (date === '2026-03-03') {
			log(t.logs.doctorStart, 9 * 60 + 30);
		} else if (['2026-01-14', '2026-06-10', '2026-09-22'].includes(date)) {
			log(t.logs.doctor, 9 * 60 + 30);
		}

		// Treatment
		if (treated) {
			med(t.meds.magnesium, '300', wakeUp + 30 + rnd() * 30);
		}

		// Sports, more and more often
		const sportChance = month <= 3 ? 0.25 : month <= 6 ? 0.4 : 0.5;
		if (migraine < 3 && chance(sportChance)) {
			const sport = weekend
				? pick([t.sports.cycling, t.sports.running, t.sports.swimming])
				: pick([t.sports.running, t.sports.running, t.sports.yoga, t.sports.yoga, t.sports.swimming]);
			const minutes = weekend ? 10 * 60 + rnd() * 120 : 18 * 60 + rnd() * 90;
			day.sports.push({ type: 'sport', time: time(minutes), key: sport[0] as string, detail: pick(sport[1] as string[]) });
		}

		// Meals
		if (chance(0.45)) {
			day.meals.push({ type: 'meal', time: time(12 * 60 + 15 + rnd() * 45), key: pick(t.meals), detail: pick(t.mealDetails) });
		}
		if (chance(0.25)) {
			day.meals.push({ type: 'meal', time: time(19 * 60 + 30 + rnd() * 60), key: pick(t.meals), detail: pick(t.mealDetails) });
		}

		// Custom event types
		if (chance(0.85)) {
			custom(CUSTOM_KEYS.coffee, pick(t.coffees), wakeUp + 15 + rnd() * 20);
		}
		if (chance(0.3)) {
			custom(CUSTOM_KEYS.coffee, pick(t.coffees), 13 * 60 + 30 + rnd() * 60);
		}
		if (chance(0.7)) {
			custom(CUSTOM_KEYS.water, t.water, 19 * 60 + rnd() * 90, intensity(1 + rnd() * 1.2));
		}
		if (index > 60 && chance(0.4)) {
			custom(CUSTOM_KEYS.meditation, pick(t.meditations), 21 * 60 + rnd() * 60, chance(0.6) ? 10 : 15);
		}

		days.push(day);
	});

	// Today, the first card of the timeline: one entry of each type, the day isn't over yet (no bedtime)
	const today = days[days.length - 1];
	Object.assign(today, {
		wakeUp: '07:05',
		goToBed: '',
		symptomOverviews: [
			{ key: SYMPTOM_KEYS.migraine, pain: 3 },
			{ key: SYMPTOM_KEYS.fatigue, pain: 1.5 },
			{ key: SYMPTOM_KEYS.stomach, pain: 0 },
			{ key: SYMPTOM_KEYS.back, pain: 0 }
		],
		symptoms: [{
			type: 'symptom', key: SYMPTOM_KEYS.migraine, logs: [
				{ type: 'symptomLog', time: '13:40', key: SYMPTOM_KEYS.migraine, pain: 3, detail: t.today.migraineDetail }
			]
		}],
		meds: [
			{ type: 'med', time: '07:45', key: t.meds.magnesium, quantity: '300' },
			{ type: 'med', time: '13:50', key: t.meds.sumatriptan, quantity: '50' }
		],
		logs: [{ type: 'log', time: '16:30', key: t.today.stress[0], detail: t.today.stress[1] }],
		meals: [{ type: 'meal', time: '12:30', key: t.today.meal[0], detail: t.today.meal[1] }],
		sports: [{ type: 'sport', time: '18:30', key: t.today.yoga[0], detail: t.today.yoga[1] }],
		customs: [
			{ type: 'custom', customType: CUSTOM_KEYS.coffee, time: '07:20', key: t.coffees[0], detail: '', quantity: null },
			{ type: 'custom', customType: CUSTOM_KEYS.water, time: '19:30', key: t.water, detail: '', quantity: 1.5 }
		]
	});

	if (options.customTypes === false) {
		days.forEach(day => day.customs = []);
	}
	const customType = (key: string, [label, unit]: string[], icon: string, colors: { light: string, dark: string }) =>
		({ key, label, icon, colors, quantity: unit !== '', unit, created: Date.parse('2026-01-01T09:00:00Z') });

	return {
		days,
		symptoms: [
			{ key: SYMPTOM_KEYS.migraine, label: t.symptoms.migraine, invertedScale: false },
			{ key: SYMPTOM_KEYS.fatigue, label: t.symptoms.fatigue, invertedScale: false },
			{ key: SYMPTOM_KEYS.stomach, label: t.symptoms.stomach, invertedScale: false },
			{ key: SYMPTOM_KEYS.back, label: t.symptoms.back, invertedScale: false }
		].map(symptom => ({ ...symptom, _id: symptom.key })),
		customTypes: options.customTypes === false ? [] : [
			customType(CUSTOM_KEYS.water, t.customTypes.water, 'water_drop', { light: '#00897B', dark: '#4DB6AC' }),
			customType(CUSTOM_KEYS.coffee, t.customTypes.coffee, 'local_cafe', { light: '#6D4C41', dark: '#BCAAA4' }),
			customType(CUSTOM_KEYS.meditation, t.customTypes.meditation, 'self_improvement', { light: '#8E24AA', dark: '#CE93D8' })
		],
		settings: {
			_id: 'settings',
			targetSymptomKey: SYMPTOM_KEYS.migraine,
			language: lang,
			timeFormat: 'eu',
			painScale: 10,
			firstStart: false,
			lastInstall: CURRENT_VERSION,
			lastUpdate: 0,
			showDeveloperMode: false,
			showAdvancedSettings: false,
			// French calendars start on Monday
			calendarStartOnSunday: lang === 'en',
			calendarBlockView: false,
			painPalette: '2',
			weeklyReminder: true,
			lastWeeklyReminder: STORE_NOW.getTime(),
			dailyReminder: false,
			lastDailyReminder: STORE_NOW.getTime(),
			autoCalculateOverview: true,
			autoOverviewPopupSeen: true,
			timePicker: 'material',
			darkMode: false,
			landscapeMode: false,
			uiVersion: 'v2',
			newUiPopupSeen: true,
			eventColors: {
				light: { symptomLog: '#FF3154', med: '#0096BF', log: '#98A2AE', sport: '#FF8C00' },
				dark: { symptomLog: '#FF7A90', med: '#5CC8F2', log: '#AAB4C0', sport: '#FFAD5C' }
			}
		}
	};
}
