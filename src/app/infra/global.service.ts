import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
	}

	private _painScale: number = 5;
	public get painScale(): number { return this._painScale; }
	public set painScale(painScale: number) {
		this._painScale = painScale;
	}

	private _hideDeveloperUpdates: boolean = false;
	public get hideDeveloperUpdates(): boolean { return this._hideDeveloperUpdates; }
	public set hideDeveloperUpdates(hide: boolean) {
		this._hideDeveloperUpdates = hide;
	}

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

	constructor(
		private symptomsService: SymptomsService
	) {
		this.loadSymptoms();
	}
}
