import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { ISymptom } from '../models/symptom.model';
import { map, tap, switchMap } from 'rxjs/operators';

@Injectable()
export class SymptomsService {

	constructor(
		private readonly dbContext: DbContext
	) { }

	public getSymptoms(): Observable<ISymptom[]> {
		return this.dbContext.asArrayObservable<ISymptom>(
			this.dbContext.symptomsCollection.allDocs({ include_docs: true, descending: true })
		);
	}

	public getSymptom(key: string): Observable<ISymptom> {
		return this.dbContext.asObservable<ISymptom>(
			this.dbContext.symptomsCollection.get(key)
		);
	}

	public addSymptom(symptom: ISymptom): Observable<ISymptom> {
		return this.dbContext.asObservable(this.dbContext.symptomsCollection.put(symptom));
	}

	public addSymptoms(symptoms: ISymptom[]): Observable<ISymptom[]> {
		return this.dbContext.asObservable(this.dbContext.symptomsCollection.bulkDocs(symptoms));
	}

	public deleteSymptom(key: string): Observable<null> {
		const symptom = this.getSymptom(key);
		return symptom.pipe(
			tap(s => {
				this.dbContext.symptomsCollection.remove(s);
			}),
			map(() => null)
		);
	}

	public editSymptom(key: string, newLabel: string): Observable<ISymptom> {
		const symptom = this.getSymptom(key);
		return symptom.pipe(
			switchMap(s => {
				s.label = newLabel;
				return this.dbContext.asObservable(this.dbContext.symptomsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public createNewSymptom(key: string, label: string): Observable<null> {
		const symptom = {
			'_id': key,
			'key': key,
			'label': label
		};
		return this.dbContext.asObservable(this.dbContext.symptomsCollection.put(symptom)).pipe(
			map(() => null)
		);
	}

	public removeSymptom(symptom: ISymptom): Observable<ISymptom> {
		return this.dbContext.asObservable(this.dbContext.symptomsCollection.remove(symptom)).pipe(
			map(() => symptom)
		);
	}

	public removeSymptomByKey(key: string): Observable<ISymptom> {
		return this.getSymptom(key).pipe(
			switchMap(symptom => {
				return this.dbContext.asObservable(this.dbContext.symptomsCollection.remove(symptom)).pipe(
					map(() => symptom)
				);
			}));
	}

}
