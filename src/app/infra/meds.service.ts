import { Observable, of, forkJoin } from 'rxjs';
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
				days.reverse().forEach(day => {
					if (day.meds == null) {
						return;
					}
					day.meds.forEach(med => {
						const quantity = parseFloat('' + med.quantity);
						const currentMed =
							medHistories.find(medHistory => medHistory.key === med.key && (medHistory.quantity === quantity || (isNaN(medHistory.quantity) && isNaN(quantity))));
						if (currentMed == null) {
							medHistories.push({ key: med.key, quantity: quantity, occurrences: 1, lastEntry: day.date });
						} else {
							currentMed.occurrences++;
							currentMed.lastEntry = day.date;
						}
					});
				});
				return medHistories;
			}),
			switchMap(medHistories => {
				return this.reset().pipe(
					switchMap(() => {
						if (medHistories.length === 0) {
							return of(medHistories);
						}
						const tasks = medHistories.map(medHistory => this.createNewMed(medHistory));
						return forkJoin(tasks).pipe(map(() => medHistories));
					})
				);
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

	public deleteMedication(key: string, quantity: number): Observable<IMedHistory[]> {
		return this.daysService.getDays().pipe(
			switchMap(days => {
				const changedDays = [];
				days.forEach(day => {
					const initialLength = day.meds.length;
					// Use loose equality for quantity to handle string/number differences
					day.meds = day.meds.filter(m => {
						const mQuantity = parseFloat('' + m.quantity);
						return !(m.key === key && (mQuantity === quantity || (isNaN(mQuantity) && isNaN(quantity))));
					});
					if (day.meds.length !== initialLength) {
						changedDays.push(day);
					}
				});
				if (changedDays.length === 0) {
					return of(null);
				}
				return this.daysService.addDays(changedDays);
			}),
			switchMap(() => this.refreshMeds())
		);
	}

	public editMedication(oldKey: string, oldQuantity: number, newKey: string, newQuantity: number): Observable<IMedHistory[]> {
		return this.daysService.getDays().pipe(
			switchMap(days => {
				const changedDays = [];
				days.forEach(day => {
					let changed = false;
					day.meds.forEach(med => {
						const medQuantity = parseFloat('' + med.quantity);
						// Use loose equality for quantity to handle string/number differences
						if (med.key === oldKey && (medQuantity === oldQuantity || (isNaN(medQuantity) && isNaN(oldQuantity)))) {
							med.key = newKey;
							med.quantity = newQuantity;
							changed = true;
						}
					});
					if (changed) {
						changedDays.push(day);
					}
				});
				if (changedDays.length === 0) {
					return of(null);
				}
				return this.daysService.addDays(changedDays);
			}),
			switchMap(() => this.refreshMeds())
		);
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
