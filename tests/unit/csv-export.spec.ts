import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { ICsvData, buildCsv, getCsvDays, getCsvFileName, getCsvSeparators } from '../../src/app/models/csv-export.model';
import { LANGUAGES } from '../../src/app/models/language.model';

// The texts of the app, with their parameters
function translator(language: string): (key: string, params?: { [param: string]: any }) => string {
	const texts = JSON.parse(readFileSync(`src/assets/i18n/${language}.json`, 'utf-8'));
	return (key, params = {}) => {
		expect(texts[key], key).toBeDefined();
		return Object.keys(params).reduce((text, param) =>
			text.replace(new RegExp(`{{\\s*${param}\\s*}}`, 'g'), String(params[param])), texts[key]);
	};
}

const DATA: ICsvData = {
	symptoms: [
		{ type: 'symptom', key: 'head', label: 'Tête' },
		{ type: 'symptom', key: 'mood', label: 'Humeur', invertedScale: true },
		// Never filled in: no column
		{ type: 'symptom', key: 'back', label: 'Dos' }
	],
	customTypes: [
		{ key: 'ct1', label: 'Hydratation', icon: 'water_drop', colors: { light: '#00897B', dark: '#337D75' }, quantity: true, unit: 'L', created: 1 },
		{ key: 'ct2', label: 'Café', icon: 'local_cafe', colors: { light: '#6D4C41', dark: '#8A6A5C' }, quantity: false, unit: '', created: 2 }
	],
	days: [
		// Nothing logged: left out
		{ date: '2026-03-18', symptomOverviews: [], symptoms: [], logs: [], meds: [], meals: [], wakeUp: '', goToBed: '' },
		{
			date: '2026-03-17', wakeUp: '06:45', goToBed: '', symptomOverviews: [{ key: 'mood', pain: 4 }],
			symptoms: [], logs: [], meds: [], meals: [],
			customs: [{ type: 'custom', customType: 'ct2', time: '09:00', key: 'Expresso', detail: '', quantity: null }]
		},
		{
			date: '2026-03-16', wakeUp: '07:00', goToBed: '23:30',
			symptomOverviews: [{ key: 'head', pain: 3 }],
			symptoms: [{ type: 'symptom', key: 'head', logs: [{ type: 'symptomLog', key: 'head', time: '10:15', pain: 2.5, detail: 'Côté gauche' }] }],
			// Doses of the former versions are texts
			meds: [
				{ type: 'med', key: 'Doliprane', time: '20:00', quantity: '500' as any },
				{ type: 'med', key: 'Doliprane', time: '12:00', quantity: 1000 }
			],
			meals: [{ type: 'meal', time: '12:30', key: 'Pâtes', detail: '' }],
			logs: [{ type: 'log', time: '21:00', key: '=SOMME(A1)', detail: 'Note; avec "guillemets"\nsur deux lignes' }],
			sports: [],
			customs: [
				{ type: 'custom', customType: 'ct1', time: '14:00', key: '', detail: '', quantity: 0.5 },
				{ type: 'custom', customType: 'ct1', time: '08:00', key: 'Eau', detail: 'Au réveil', quantity: 1.5 }
			]
		}
	]
};

const FRENCH = { painScale: 10, locale: 'fr-FR', translate: translator('fr') };

function lines(csv: string): string[] {
	expect(csv.startsWith('﻿'), 'byte order mark, for Excel').toBe(true);
	expect(csv.endsWith('\r\n')).toBe(true);
	return csv.slice(1, -2).split('\r\n');
}

test.describe('CSV export', () => {

	test('the separators follow the language: ";" and 1,5 where the comma is decimal', () => {
		for (const language of LANGUAGES) {
			const separators = getCsvSeparators(language.locale);
			const comma = ['fr', 'de', 'es', 'it', 'pt'].includes(language.code);
			expect(separators, language.code).toEqual(comma ? { cell: ';', decimal: ',' } : { cell: ',', decimal: '.' });
		}
	});

	test('file names carry the layout, the date and the time', () => {
		expect(getCsvFileName('days', new Date(2026, 2, 8, 9, 5))).toBe('life-notes-days-202603080905.csv');
		expect(getCsvFileName('events', new Date(2026, 11, 31, 23, 59))).toBe('life-notes-events-202612312359.csv');
	});

	test('only the days with an entry, oldest first', () => {
		expect(getCsvDays(DATA.days).map(day => day.date)).toEqual(['2026-03-16', '2026-03-17']);
		expect(getCsvDays([])).toEqual([]);
	});

	test('one line per day: a column per measure, ready for a chart', () => {
		expect(lines(buildCsv('days', DATA, FRENCH))).toEqual([
			'Date;Réveil;Coucher;Sommeil (h);Tête (0-10);Humeur (0-10);Doliprane (mg);Hydratation (L);Café (nombre);'
			+ 'Repas (nombre);Sport (nombre);Notes (nombre)',
			// No day before: no sleep. The doses and quantities of the day added up; nothing logged: empty, not 0
			'2026-03-16;07:00;23:30;;6;;1500;2;;1;;1',
			// From 23:30 the day before to 06:45
			'2026-03-17;06:45;;7,25;;8;;;1;;;'
		]);
	});

	test('one line per entry: the day, then its events by time, as in the app', () => {
		expect(lines(buildCsv('events', DATA, FRENCH))).toEqual([
			'Date;Heure;Type;Nom;Intensité (0-10);Quantité;Unité;Détail',
			'2026-03-16;;Intensité du jour;Tête;6;;;',
			'2026-03-16;07:00;Réveil;;;;;',
			'2026-03-16;08:00;Hydratation;Eau;;1,5;L;Au réveil',
			'2026-03-16;10:15;Symptôme;Tête;5;;;Côté gauche',
			'2026-03-16;12:00;Médicament;Doliprane;;1000;mg;',
			'2026-03-16;12:30;Repas;Pâtes;;;;',
			// Without a name, the entry of a type is named after it (as in the app)
			'2026-03-16;14:00;Hydratation;Hydratation;;0,5;L;',
			'2026-03-16;20:00;Médicament;Doliprane;;500;mg;',
			// Never computed as a formula; the separator, the quotes and the line break kept inside quotes
			'2026-03-16;21:00;Note;\'=SOMME(A1);;;;"Note; avec ""guillemets""\nsur deux lignes"',
			'2026-03-16;23:30;Coucher;;;;;',
			'2026-03-17;;Intensité du jour;Humeur;8;;;',
			'2026-03-17;06:45;Réveil;;;;;',
			// A type without quantity
			'2026-03-17;09:00;Café;Expresso;;;;'
		]);
	});

	test('in English: "," between the cells, 1.5, and the scale of 5', () => {
		const english = { painScale: 5, locale: 'en-US', translate: translator('en') };
		const days = lines(buildCsv('days', DATA, english));
		expect(days[0]).toBe('Date,Wake up,Bedtime,Sleep (h),Tête (0-5),Humeur (0-5),Doliprane (mg),Hydratation (L),'
			+ 'Café (number),Meals (number),Sport (number),Notes (number)');
		expect(days[1]).toBe('2026-03-16,07:00,23:30,,3,,1500,2,,1,,1');
		expect(days[2]).toBe('2026-03-17,06:45,,7.25,,4,,,1,,,');
		const events = lines(buildCsv('events', DATA, english));
		expect(events).toContain('2026-03-16,08:00,Hydratation,Eau,,1.5,L,Au réveil');
		expect(events).toContain('2026-03-16,10:15,Symptom,Tête,2.5,,,Côté gauche');
		// The comma of the text is the separator here
		expect(events).toContain('2026-03-16,21:00,Note,\'=SOMME(A1),,,,"Note; avec ""guillemets""\nsur deux lignes"');
	});

	test('every language has the texts of the columns', () => {
		for (const language of LANGUAGES) {
			const options = { painScale: 10, locale: language.locale, translate: translator(language.code) };
			for (const layout of ['days', 'events'] as const) {
				const header = lines(buildCsv(layout, DATA, options))[0];
				expect(header, `${language.code} ${layout}`).not.toMatch(/[A-Z]{2,}_[A-Z_]+|{{/);
			}
		}
	});

	test('a medication never given with a dose is counted, a negative or signed number stays a number', () => {
		const data: ICsvData = {
			symptoms: [], customTypes: [],
			days: [{
				date: '2026-03-16', wakeUp: '', goToBed: '', symptomOverviews: [], symptoms: [], meals: [],
				meds: [{ type: 'med', key: 'Spray', time: '08:00', quantity: null }, { type: 'med', key: 'Spray', time: '20:00', quantity: '' as any }],
				logs: [{ type: 'log', time: '09:00', key: '-5', detail: '+33 6 12 34 56 78' }]
			}]
		};
		const days = lines(buildCsv('days', data, FRENCH));
		expect(days[0]).toContain('Spray (nombre)');
		expect(days[1]).toBe('2026-03-16;;;;2;;;1');
		const events = lines(buildCsv('events', data, FRENCH));
		expect(events).toContain('2026-03-16;09:00;Note;-5;;;;\'+33 6 12 34 56 78');
	});
});
