import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import { IMedHistory } from '../models/med.model';
import * as moment from 'moment';

@Injectable()
export class MedsService {

	constructor(
		private readonly dbContext: DbContext
	) { }

	public getMeds(): Observable<IMedHistory[]> {
		return this.dbContext.asArrayObservable<IMedHistory>(
			this.dbContext.medsCollection.allDocs({ include_docs: true, descending: true })
		);
	}

	public getMed(key: string): Observable<IMedHistory> {
		return this.dbContext.asObservable<IMedHistory>(
			this.dbContext.medsCollection.get(key)
		).pipe(
			catchError(() => of(null))
		);
	}

	public addMed(key: string, quantity: number): Observable<IMedHistory> {
		return this.getMed(key + quantity).pipe(
			switchMap(med => {
				if (med == null) {
					return this.createNewMed({ key, quantity, occurrences: 1, lastEntry: moment().format('YYYY-MM-DD') })
				} else {
					med.occurrences++;
					return this.dbContext.asObservable(this.dbContext.medsCollection.put(med)).pipe(
						map(() => med)
					);
				}
			}));
	}

	public addMeds(meds: IMedHistory[]): Observable<IMedHistory[]> {
		return this.dbContext.asObservable(this.dbContext.medsCollection.bulkDocs(meds));
	}

	public deleteMed(key: string): Observable<null> {
		const med = this.getMed(key);
		return med.pipe(
			tap(s => {
				this.dbContext.medsCollection.remove(s);
			}),
			map(() => null)
		);
	}

	public createNewMed(med: IMedHistory): Observable<null> {
		const newMed = {
			'_id': med.key + med.quantity,
			'key': med.key,
			'quantity': med.quantity,
			'occurrences': med.occurrences,
			'lastEntry': med.lastEntry
		};
		return this.dbContext.asObservable(this.dbContext.medsCollection.put(newMed)).pipe(
			map(() => null)
		);
	}

	public removeMed(med: IMedHistory): Observable<IMedHistory> {
		return this.dbContext.asObservable(this.dbContext.medsCollection.remove(med)).pipe(
			map(() => med)
		);
	}

	public removeMedByKey(key: string): Observable<IMedHistory> {
		return this.getMed(key).pipe(
			switchMap(med => {
				return this.dbContext.asObservable(this.dbContext.medsCollection.remove(med)).pipe(
					map(() => med)
				);
			}));
	}

}
