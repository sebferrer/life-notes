import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import { IMedHistory } from '../models/med.model';
import * as moment from 'moment';
import { DaysService } from '.';

@Injectable()
export class MedsService {

	constructor(
		private readonly dbContext: DbContext,
		private readonly daysService: DaysService
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

	public refreshMeds(): Observable<IMedHistory[]> {
		return this.daysService.getDays().pipe(
			map(days => {
				const medHistories = new Array<IMedHistory>();
				days.forEach(day => {
					if (day.meds == null) {
						return;
					}
					day.meds.forEach(med => {
						const currentMed =
							medHistories.find(medHistory => medHistory.key === med.key && medHistory.quantity == med.quantity);
						if (currentMed == null) {
							medHistories.push({ key: med.key, quantity: parseFloat('' + med.quantity), occurrences: 1, lastEntry: day.date });
						} else {
							currentMed.quantity = parseFloat('' + currentMed.quantity);
							currentMed.occurrences++;
							currentMed.lastEntry = moment().format('YYYY-MM-DD');
						}
					});
				});
				this.reset().subscribe(() => {
					medHistories.forEach(medHistory => {
						this.createNewMed(medHistory)
					});
				});
				return medHistories;
			})
		);
	}

	public addMed(date: string, key: string, quantity: number): Observable<IMedHistory> {
		return this.getMed(key + quantity).pipe(
			switchMap(med => {
				if (med == null) {
					return this.createNewMed({ key, quantity, occurrences: 1, lastEntry: date })
				} else {
					med.occurrences++;
					med.lastEntry = date;
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

	public removeMedByKey(key: string, quantity: number): Observable<IMedHistory> {
		return this.getMed(key + quantity).pipe(
			switchMap(med => {
				if (med.occurrences > 1) {
					med.occurrences--;
					console.log(med.occurrences);
					return this.dbContext.asObservable(this.dbContext.medsCollection.put(med)).pipe(
						map(() => med)
					);
				} else {
					return this.dbContext.asObservable(this.dbContext.medsCollection.remove(med)).pipe(
						map(() => med)
					);
				}
			}));
	}

	public reset(): Observable<null> {
		return this.dbContext.medsCollection.reset().pipe(
			map(() => null)
		);
	}

}
