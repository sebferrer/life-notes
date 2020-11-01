import { Observable, of, from } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { ISymptom } from '../models/symptom.model';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class SymptomsService {

	constructor(
		private readonly dbContext: DbContext
	) { }

	public getSymptoms(): Observable<ISymptom[]> {
		return this.dbContext.asArrayObservable<ISymptom>(
			this.dbContext.symptomsCollection.allDocs()
		);
	}

	public getSymptom(key: string): Observable<ISymptom> {
		return this.dbContext.asObservable<ISymptom>(
			this.dbContext.symptomsCollection.get(key)
		);
	}

	public addSymptom(symptom: ISymptom): Observable<never> {
		this.dbContext.symptomsCollection.put(symptom);
		return of();
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

	public editSymptom(key: string, newLabel: string): Observable<null> {
		const symptom = this.getSymptom(key);
		return symptom.pipe(
			tap(s => {
				s.label = newLabel;
				this.dbContext.symptomsCollection.put(s);
			}),
			map(() => null)
		);
	}

	public createNewSymptom(key: string, label: string): Observable<null> {
		const day = {
			'_id': key,
			'key': key,
			'label': label
		};
		return from(this.dbContext.symptomsCollection.put(day).then((res: any) => { }, (err: any) => { })).pipe(
			map(() => null)
		);
	}

	public removeSymptom(symptom: ISymptom): Observable<never> {
		this.dbContext.symptomsCollection.remove(symptom);
		return of();
	}

	public removeSymptomByKey(key: string): Observable<never> {
		this.getSymptom(key).subscribe(symptom => {
			this.dbContext.symptomsCollection.remove(symptom);
		});
		return of();
	}

}
