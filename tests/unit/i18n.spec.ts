import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const fr: { [key: string]: string } = JSON.parse(readFileSync('src/assets/i18n/fr.json', 'utf-8'));
const en: { [key: string]: string } = JSON.parse(readFileSync('src/assets/i18n/en.json', 'utf-8'));

function files(dir: string, extension: string): string[] {
	return readdirSync(dir).flatMap(name => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path, extension) : path.endsWith(extension) ? [path] : [];
	});
}

function params(text: string): string[] {
	return (text.match(/{{\s*\w+\s*}}/g) || []).map(param => param.replace(/[{}\s]/g, '')).sort();
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

	test('French and English have the same keys', () => {
		expect(Object.keys(en).filter(key => !(key in fr)), 'missing in fr.json').toEqual([]);
		expect(Object.keys(fr).filter(key => !(key in en)), 'missing in en.json').toEqual([]);
	});

	test('no translation is empty', () => {
		for (const [language, texts] of [['fr', fr], ['en', en]] as const) {
			expect(Object.keys(texts).filter(key => !String(texts[key]).trim()), language).toEqual([]);
		}
	});

	test('both languages use the same parameters', () => {
		const different = Object.keys(fr).filter(key => key in en
			&& JSON.stringify(params(fr[key])) !== JSON.stringify(params(en[key])));
		expect(different).toEqual([]);
	});

	test('every key used by the app exists', () => {
		const missing = [...usedKeys().entries()]
			.filter(([key]) => !(key in fr) || !(key in en))
			.map(([key, file]) => `${key} (${file})`);
		expect(missing).toEqual([]);
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
			expect(fr[key], key).toBeTruthy();
			expect(en[key], key).toBeTruthy();
		}
	});
});
