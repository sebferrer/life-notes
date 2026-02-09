import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ISymptom } from '../models/symptom.model';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';

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
		this._symptoms$ = this.symptomsService.getSymptoms();
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
	}
}
