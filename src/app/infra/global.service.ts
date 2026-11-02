import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ISymptom } from '../models/symptom.model';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';
import * as ChartJs from 'chart.js';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import {
	CUSTOMIZABLE_EVENT_TYPES, IEventColors, IEventPalettes, completeEventPalettes, getDefaultEventPalettes,
	getEventOnColor, getEventOnFilter, getEventSoftColor, getEventSoftTextColor, getEventBadgeTextColor,
	getEventTonalIconColor
} from '../models/event-colors.model';

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

	public loadSymptoms(): Observable<ISymptom[]> {
		this._symptomMap = new Map();
		// Alphabetical order everywhere (toolbar menu, settings, add event...)
		this._symptoms$ = this.symptomsService.getSymptoms().pipe(
			map(symptoms => symptoms.sort((a, b) => (a.label || '').localeCompare(b.label || '')))
		);
		this._symptoms$.subscribe(s => s.map(x => this._symptomMap.set(x.key, x.label)));
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

	// 'modern' or 'classic' (the original timeline design)
	private _timelineStyle: string = 'modern';
	public get timelineStyle(): string { return this._timelineStyle; }
	public set timelineStyle(value: string) {
		this._timelineStyle = value;
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
		ScreenOrientation.lock({ orientation: this._landscapeMode ? 'landscape' : 'portrait' })
			.catch(error => console.error('Screen orientation lock failed', error));
	}

	private updateTheme(): void {
		document.body.classList.toggle('dark-theme', this._darkMode);
		const colors = this.eventColors;
		const style = document.body.style;
		CUSTOMIZABLE_EVENT_TYPES.forEach(type => {
			const onColor = getEventOnColor(colors[type], this._darkMode);
			style.setProperty('--color-event-' + type, colors[type]);
			style.setProperty('--color-event-' + type + '-on', onColor);
			style.setProperty('--color-event-' + type + '-on-filter', getEventOnFilter(onColor));
			style.setProperty('--color-event-' + type + '-soft', getEventSoftColor(colors[type], this._darkMode));
			style.setProperty('--color-event-' + type + '-soft-text', getEventSoftTextColor(colors[type], this._darkMode, false));
			style.setProperty('--color-event-' + type + '-soft-text-muted', getEventSoftTextColor(colors[type], this._darkMode, true));
			style.setProperty('--color-event-' + type + '-icon', getEventTonalIconColor(colors[type], this._darkMode));
			style.setProperty('--color-event-' + type + '-badge-text', getEventBadgeTextColor(colors[type], this._darkMode));
		});
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
