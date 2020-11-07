import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { Observable } from 'rxjs';
import { ISymptom } from '../models/symptom.model';
import { SymptomsService } from './symptoms.service';
// const CALENDAR_API = '/api/calendar';
// const CALENDAR_FROM_API = '/api/calendar-from';
// const DAY_OVERVIEW_FIELDS = 'date, symptomOverviews';

@Injectable({ providedIn: 'root' })
export class GlobalService {

	public _targetSymptomKey: string;
	public get targetSymptomKey(): string { return this._targetSymptomKey; }
	public set targetSymptomKey(targetSymptom: string) {
		this._targetSymptomKey = targetSymptom;
	}

	public _symptoms$: Observable<ISymptom[]>;
	public get symptoms$(): Observable<ISymptom[]> { return this._symptoms$; }
	public set symptoms$(symptoms: Observable<ISymptom[]>) {
		this.symptoms$ = symptoms;
	}

	public _symptomMap: Map<string, string>;
	public get symptomMap(): Map<string, string> { return this._symptomMap; }

	public loadSymptoms(): void {
		this._symptomMap = new Map();
		this._symptoms$ = this.symptomsService.getSymptoms();
		this._symptoms$.subscribe(s => s.map(x => this._symptomMap.set(x.key, x.label)));
	}

	constructor(
		private readonly dbContext: DbContext,
		private symptomsService: SymptomsService
	) {
		this.loadSymptoms();
	}
}
