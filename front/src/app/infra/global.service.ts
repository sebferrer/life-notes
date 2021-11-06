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

	constructor(
		private symptomsService: SymptomsService
	) {
		this.loadSymptoms();
	}
}
