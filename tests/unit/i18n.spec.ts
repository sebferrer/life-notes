import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { LANGUAGES, LANGUAGE_CODES } from '../../src/app/models/language.model';

type Texts = { [key: string]: string };

const I18N_DIR = 'src/assets/i18n';
const translations: { [language: string]: Texts } = {};
for (const language of LANGUAGE_CODES) {
	translations[language] = JSON.parse(readFileSync(join(I18N_DIR, language + '.json'), 'utf-8'));
}
// English is the reference of the keys
const en = translations.en;
const fr = translations.fr;

function files(dir: string, extension: string): string[] {
	return readdirSync(dir).flatMap(name => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path, extension) : path.endsWith(extension) ? [path] : [];
	});
}

function params(text: string): string[] {
	return (text.match(/{{\s*\w+\s*}}/g) || []).map(param => param.replace(/[{}\s]/g, '')).sort();
}

function tags(text: string): string[] {
	return text.match(/<[^>]+>/g) || [];
}

// Translation keys written as such in the templates and the code (keys built at runtime are not found)
function usedKeys(): Map<string, string> {
	const keys = new Map<string, string>();
	const patterns = [
		/transloco="([A-Z][\w-]*)"/g,
		/\bt\('([A-Za-z][\w-]*)'\s*[,)]/g,
		/'([A-Z][\w-]*)'\s*\|\s*transloco/g,
		/translate\('([A-Z][\w-]*)'\s*[,)]/g,
		/(?:title|subtitle|label|titleKey|text): '([A-Z][A-Z0-9_]+)'/g
	];
	for (const file of [...files('src/app', '.html'), ...files('src/app', '.ts')]) {
		const content = readFileSync(file, 'utf-8');
		for (const pattern of patterns) {
			for (const match of content.matchAll(pattern)) {
				keys.set(match[1], file);
			}
		}
	}
	return keys;
}

test.describe('Translations', () => {

	test('every translation file is a language of the app, with its flag', () => {
		const jsonFiles = readdirSync(I18N_DIR).filter(name => name.endsWith('.json')).map(name => name.replace('.json', ''));
		expect(jsonFiles.sort()).toEqual([...LANGUAGE_CODES].sort());
		for (const language of LANGUAGES) {
			expect(statSync(join('src/assets/svg', language.flag)).isFile(), language.flag).toBe(true);
		}
	});

	for (const language of LANGUAGE_CODES.filter(code => code !== 'en')) {
		test(`${language}: same keys as English, in the same order`, () => {
			const texts = translations[language];
			expect(Object.keys(en).filter(key => !(key in texts)), `missing in ${language}.json`).toEqual([]);
			expect(Object.keys(texts).filter(key => !(key in en)), `missing in en.json`).toEqual([]);
			// The French file has its own order since the beginning
			if (language !== 'fr') {
				expect(Object.keys(texts)).toEqual(Object.keys(en));
			}
		});

		test(`${language}: same parameters and HTML tags as English`, () => {
			const texts = translations[language];
			const differentParams = Object.keys(en).filter(key => key in texts
				&& JSON.stringify(params(en[key])) !== JSON.stringify(params(texts[key])));
			expect(differentParams).toEqual([]);
			const differentTags = Object.keys(en).filter(key => key in texts
				&& JSON.stringify(tags(en[key])) !== JSON.stringify(tags(texts[key])));
			expect(differentTags).toEqual([]);
		});
	}

	test('no translation is empty', () => {
		for (const language of LANGUAGE_CODES) {
			const texts = translations[language];
			expect(Object.keys(texts).filter(key => !String(texts[key]).trim()), language).toEqual([]);
		}
	});

	test('every key used by the app exists in every language', () => {
		const used = [...usedKeys().entries()];
		for (const language of LANGUAGE_CODES) {
			const missing = used
				.filter(([key]) => !(key in translations[language]))
				.map(([key, file]) => `${key} (${file})`);
			expect(missing, language).toEqual([]);
		}
	});

	test('every tutorial slide has its title and text', () => {
		const source = readFileSync('src/app/ui/tutorial/tutorial.component.ts', 'utf-8');
		const scenes = /const SCENES = \[([^\]]*)\]/.exec(source)[1].match(/'[\w-]+'/g).map(scene => scene.replace(/'/g, ''));
		expect(scenes.length).toBeGreaterThan(10);
		for (const scene of scenes) {
			const key = 'TUTORIAL_' + scene.toUpperCase().replace(/-/g, '_');
			expect(fr[key + '_TITLE'], key).toBeTruthy();
			expect(fr[key + '_TEXT'], key).toBeTruthy();
		}
		// Texts of the classic timeline design
		const classicScenes = /const CLASSIC_TEXTS = \[([^\]]*)\]/.exec(source)[1].match(/'[\w-]+'/g);
		for (const scene of classicScenes.map(s => s.replace(/'/g, ''))) {
			const key = 'TUTORIAL_' + scene.toUpperCase().replace(/-/g, '_') + '_TEXT_CLASSIC';
			for (const language of LANGUAGE_CODES) {
				expect(translations[language][key], `${key} (${language})`).toBeTruthy();
			}
		}
	});
});
