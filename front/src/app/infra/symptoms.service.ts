import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { ISymptom } from '../models/symptom.model';

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

	public addSymptom(symptom: ISymptom): Observable<never> {
		this.dbContext.symptomsCollection.put(symptom);
		return of();
	}

	public createNewSymptom(key: string, label: string): Observable<never> {
		const day = {
			'_id': key,
			'key': key,
			'label': label
		};
		this.dbContext.symptomsCollection.put(day).then((res: any) => { }, (err: any) => { });
		return of();
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
