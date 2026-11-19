// Languages of the app. To add one: its translation file assets/i18n/<code>.json, its flag in assets/svg,
// then a line here.
export interface ILanguage {
	code: string;
	// Format of the numbers, e.g. the decimal separator: 1,5 in French
	locale: string;
	// Name of the language in itself, wherever a language is chosen (first launch, settings)
	name: string;
	flag: string;
	// Type names capitalized word by word in the title of the event form ("Add Symptom", "Heure De Coucher"),
	// the look English and French always had. Otherwise only the first letter: "Hora de acostarse".
	titleCase: boolean;
}

export const LANGUAGES: ILanguage[] = [
	{ code: 'en', locale: 'en-US', name: 'English', flag: 'united-kingdom.svg', titleCase: true },
	{ code: 'fr', locale: 'fr-FR', name: 'Français', flag: 'france.svg', titleCase: true },
	{ code: 'de', locale: 'de-DE', name: 'Deutsch', flag: 'germany.svg', titleCase: false },
	{ code: 'es', locale: 'es-ES', name: 'Español', flag: 'spain.svg', titleCase: false },
	{ code: 'it', locale: 'it-IT', name: 'Italiano', flag: 'italy.svg', titleCase: false },
	{ code: 'pt', locale: 'pt-BR', name: 'Português', flag: 'brazil.svg', titleCase: false },
	{ code: 'ja', locale: 'ja-JP', name: '日本語', flag: 'japan.svg', titleCase: false }
];

export const LANGUAGE_CODES = LANGUAGES.map(language => language.code);

// English when the language isn't chosen yet, as the texts
export function getLanguage(code: string): ILanguage {
	return LANGUAGES.find(language => language.code === code) || LANGUAGES[0];
}

export function getLanguageLocale(code: string): string {
	return getLanguage(code).locale;
}
