import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ISymptom, getPainColorLevel } from '../models/symptom.model';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';
import * as ChartJs from 'chart.js';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import {
	CUSTOMIZABLE_EVENT_TYPES, IEventColors, IEventPalettes, completeEventPalettes, getDefaultEventPalettes,
	getEventColorVariables
} from '../models/event-colors.model';
import { ICustomType } from '../models/custom-type.model';

// LANDSCAPE MODE SETTING DISABLED: hidden from the settings for now, the app stays in portrait even if
// the setting was turned on before
const LANDSCAPE_MODE_ENABLED = false;

// Colors of the entries whose type no longer exists
const UNKNOWN_CUSTOM_TYPE: ICustomType = {
	key: '', label: '', icon: 'label', colors: { light: '#78909C', dark: '#B0BEC5' }, quantity: false, unit: '', created: 0
};

@Injectable({ providedIn: 'root' })
export class GlobalService {

	private _targetSymptomKey: string;
	public get targetSymptomKey(): string { return this._targetSymptomKey; }
	public set targetSymptomKey(targetSymptom: string) {
		this._targetSymptomKey = targetSymptom;
	}

	private _language: string;
	public get language(): string { return this._language; }
	public set language(language: string) {
		this._language = language;
	}

	private _timeFormat: string;
	public get timeFormat(): string { return this._timeFormat; }
	public set timeFormat(timeFormat: string) {
		this._timeFormat = timeFormat;
		if (this.timeFormat$) {
			this.timeFormat$.next(timeFormat);
		}
	}
	public timeFormat$ = new BehaviorSubject<string>('eu');

	private _painScale: number = 5;
	public get painScale(): number { return this._painScale; }
	public set painScale(painScale: number) {
		this._painScale = painScale;
	}

	// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
	// private _hideDeveloperUpdates: boolean = false;
	// public get hideDeveloperUpdates(): boolean { return this._hideDeveloperUpdates; }
	// public set hideDeveloperUpdates(hide: boolean) {
	// 	this._hideDeveloperUpdates = hide;
	// }

	private _symptoms$: Observable<ISymptom[]>;
	public get symptoms$(): Observable<ISymptom[]> { return this._symptoms$; }
	public set symptoms$(symptoms: Observable<ISymptom[]>) {
		this.symptoms$ = symptoms;
	}

	private _symptomMap: Map<string, string>;
	public get symptomMap(): Map<string, string> { return this._symptomMap; }

	// Symptoms whose high values are the good ones (e.g. a mood)
	private _invertedScaleKeys = new Set<string>();
	public isScaleInverted(symptomKey: string): boolean {
		return this._invertedScaleKeys.has(symptomKey);
	}

	// Color class of an intensity of a symptom: 'default' (no pain) or 'pain-1' to 'pain-5', reversed on an
	// inverted scale. No intensity counts as no pain, except on an inverted scale where 0 is the worst: 'none'.
	public getPainColorClass(symptomKey: string, pain: number): string {
		const invertedScale = this.isScaleInverted(symptomKey);
		if (pain == null) {
			return invertedScale ? 'none' : 'default';
		}
		const level = getPainColorLevel(pain, invertedScale);
		return level === 0 ? 'default' : 'pain-' + level;
	}

	public loadSymptoms(): Observable<ISymptom[]> {
		this._symptomMap = new Map();
		// Alphabetical order everywhere (toolbar menu, settings, add event...)
		this._symptoms$ = this.symptomsService.getSymptoms().pipe(
			map(symptoms => symptoms.sort((a, b) => (a.label || '').localeCompare(b.label || '')))
		);
		this._symptoms$.subscribe(s => {
			s.map(x => this._symptomMap.set(x.key, x.label));
			this._invertedScaleKeys = new Set(s.filter(x => x.invertedScale).map(x => x.key));
		});
		return this._symptoms$;
	}

	private _calendarStartOnSunday: boolean = true;
	public get calendarStartOnSunday(): boolean { return this._calendarStartOnSunday; }
	public set calendarStartOnSunday(value: boolean) {
		this._calendarStartOnSunday = value;
	}

	private _calendarBlockView: boolean = false;
	public get calendarBlockView(): boolean { return this._calendarBlockView; }
	public set calendarBlockView(value: boolean) {
		this._calendarBlockView = value;
	}

	private _painPalette: string = '2';
	public get painPalette(): string { return this._painPalette; }
	public set painPalette(value: string) {
		this._painPalette = value;
		this.updateCssVariables();
	}

	public readonly PALETTES = {
		'1': ['#93EA84', '#BFBC00', '#FDEC05', '#FFC000', '#E40026', '#980019'],
		'2': ['#8AF59C', '#F1F078', '#FFD940', '#FFB347', '#FF5C5C', '#B22222']
	};

	public getPainColors(): string[] {
		return this.PALETTES[this.painPalette] || this.PALETTES['2'];
	}

	public getPainColor(pain: number): string {
		const colors = this.getPainColors();
		return colors[Math.ceil(pain)] || colors[0];
	}

	private _autoCalculateOverview: boolean = false;
	public get autoCalculateOverview(): boolean { return this._autoCalculateOverview; }
	public set autoCalculateOverview(value: boolean) {
		this._autoCalculateOverview = value;
	}

	private _autoOverviewPopupSeen: boolean = false;
	public get autoOverviewPopupSeen(): boolean { return this._autoOverviewPopupSeen; }
	public set autoOverviewPopupSeen(value: boolean) {
		this._autoOverviewPopupSeen = value;
	}

	private _timePicker: string = 'material';
	public get timePicker(): string { return this._timePicker; }
	public set timePicker(value: string) {
		this._timePicker = value;
	}

	private _darkMode: boolean = false;
	public get darkMode(): boolean { return this._darkMode; }
	public set darkMode(value: boolean) {
		this._darkMode = !!value;
		this.updateTheme();
	}

	private _eventPalettes: IEventPalettes = getDefaultEventPalettes();
	public get eventPalettes(): IEventPalettes { return this._eventPalettes; }
	public set eventPalettes(value: IEventPalettes) {
		this._eventPalettes = completeEventPalettes(value);
		this.updateTheme();
	}

	// Palette of the theme currently displayed
	public get eventColors(): IEventColors {
		return this.darkMode ? this._eventPalettes.dark : this._eventPalettes.light;
	}

	// Version of the interface. The V2 is the default one, the V1 (the original interface) is kept for the users of
	// the former versions so as not to confuse them. Every difference is behind this setting: the templates test
	// isUiV1, the styles use the v1-only and v2-only classes (see styles.scss). In V1:
	// - timeline, day view and calendar in their original design, and the tutorial illustrations with them
	// - refresh button of the manage lists floating at the bottom of the page instead of in the header
	// - history of an event opened on its list rather than on its statistics
	// - no cross on the sheets that had none before the V2
	private _uiVersion: string = 'v2';
	public get uiVersion(): string { return this._uiVersion; }
	public set uiVersion(value: string) {
		this._uiVersion = value;
		document.body.classList.toggle('ui-v1', value === 'v1');
	}

	public get isUiV1(): boolean {
		return this._uiVersion === 'v1';
	}

	private _landscapeMode: boolean = false;
	public get landscapeMode(): boolean { return this._landscapeMode; }
	public set landscapeMode(value: boolean) {
		this._landscapeMode = !!value;
		this.updateOrientation();
	}

	private updateOrientation(): void {
		// The Android manifest locks portrait by default, the plugin overrides it at runtime
		if (!Capacitor.isNativePlatform()) {
			return;
		}
		const landscape = LANDSCAPE_MODE_ENABLED && this._landscapeMode;
		ScreenOrientation.lock({ orientation: landscape ? 'landscape' : 'portrait' })
			.catch(error => console.error('Screen orientation lock failed', error));
	}

	// Event types created by the user, in their creation order
	private _customTypes: ICustomType[] = [];
	private _customTypeMap = new Map<string, ICustomType>();
	// null until the types are loaded
	public customTypes$ = new BehaviorSubject<ICustomType[]>(null);
	public get customTypes(): ICustomType[] { return this._customTypes; }
	public set customTypes(types: ICustomType[]) {
		this._customTypes = types || [];
		this._customTypeMap = new Map(this._customTypes.map(type => [type.key, type]));
		this.updateCustomTypeColors();
		this.customTypes$.next(this._customTypes);
	}

	public getCustomType(key: string): ICustomType {
		return this._customTypeMap.get(key) || UNKNOWN_CUSTOM_TYPE;
	}

	// Class giving its colors to an element of the 'custom' event type (see updateCustomTypeColors)
	public customTypeClass(key: string): string {
		return this._customTypeMap.has(key) ? 'custom-type-' + key : '';
	}

	// Name of a custom entry, the type label when it has none
	public customEntryLabel(entry: { customType?: string, key: string }): string {
		return entry.key || this.getCustomType(entry.customType).label;
	}

	// Quantity with the decimal separator of the language, e.g. 1,5 in French
	public formatQuantity(quantity: number): string {
		if (quantity == null || isNaN(quantity)) {
			return '';
		}
		return Number(quantity).toLocaleString(this.language === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 3 });
	}

	// Empty when the type no longer has a quantity: the values typed before are kept, but hidden
	public customQuantityLabel(entry: { customType?: string, quantity: number }): string {
		const customType = this.getCustomType(entry.customType);
		const quantity = customType.quantity ? this.formatQuantity(entry.quantity) : '';
		return quantity && customType.unit ? quantity + ' ' + customType.unit : quantity;
	}

	private setEventColorVariables(style: CSSStyleDeclaration, type: string, color: string): void {
		const variables = getEventColorVariables(color, this._darkMode);
		Object.keys(variables).forEach(suffix => style.setProperty('--color-event-' + type + suffix, variables[suffix]));
	}

	// Each custom type sets the --color-event-custom-* variables of its elements, from a generated stylesheet
	private updateCustomTypeColors(): void {
		const id = 'custom-type-colors';
		let styleElement = document.getElementById(id);
		if (styleElement == null) {
			styleElement = document.createElement('style');
			styleElement.id = id;
			document.head.appendChild(styleElement);
		}
		styleElement.textContent = this._customTypes.map(type => {
			const color = this._darkMode ? type.colors.dark : type.colors.light;
			const variables = getEventColorVariables(color, this._darkMode);
			const declarations = Object.keys(variables).map(suffix => `--color-event-custom${suffix}: ${variables[suffix]};`);
			return `.custom-type-${type.key} { ${declarations.join(' ')} }`;
		}).join('\n');
	}

	private updateTheme(): void {
		document.body.classList.toggle('dark-theme', this._darkMode);
		const colors = this.eventColors;
		const style = document.body.style;
		CUSTOMIZABLE_EVENT_TYPES.forEach(type => this.setEventColorVariables(style, type, colors[type]));
		// Overridden by the class of each custom type
		this.setEventColorVariables(style, 'custom',
			this._darkMode ? UNKNOWN_CUSTOM_TYPE.colors.dark : UNKNOWN_CUSTOM_TYPE.colors.light);
		this.updateCustomTypeColors();
		// Chart.js draws on canvas, it can't use the CSS variables
		ChartJs.defaults.global.defaultFontColor = this._darkMode ? '#B0B0B0' : '#666';
		// White doughnut separators look like rings on dark cards. Transparent rather than the card color
		// so that charts exported in the (always light) PDF stay clean.
		ChartJs.defaults.global.elements.arc.borderColor = this._darkMode ? 'transparent' : '#FFFFFF';
	}

	private updateCssVariables(): void {
		const colors = this.getPainColors();
		document.documentElement.style.setProperty('--color-pain-0', colors[0]);
		document.documentElement.style.setProperty('--color-pain-1', colors[1]);
		document.documentElement.style.setProperty('--color-pain-2', colors[2]);
		document.documentElement.style.setProperty('--color-pain-3', colors[3]);
		document.documentElement.style.setProperty('--color-pain-4', colors[4]);
		document.documentElement.style.setProperty('--color-pain-5', colors[5]);
	}

	constructor(
		private symptomsService: SymptomsService
	) {
		this.loadSymptoms();
		this.updateCssVariables();
		this.updateTheme();
	}
}
