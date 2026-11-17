import { Observable, of, forkJoin } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ISportHistory } from '../models/sport.model';
import { DaysService } from '.';

@Injectable()
export class SportsService {

	constructor(
		private readonly dbContext: DbContext,
		private readonly daysService: DaysService
	) { }

	public getSports(): Observable<ISportHistory[]> {
		return this.dbContext.asArrayObservable<ISportHistory>(
			this.dbContext.sportsCollection.allDocs({ include_docs: true, descending: true })
		);
	}

	public getSportOccurrences(key: string): Observable<{ date: string, time: string, detail: string }[]> {
		return this.daysService.getDays().pipe(
			map(days => {
				const occurrences: { date: string, time: string, detail: string }[] = [];
				days.forEach(day => {
					if (day.sports == null) return;
					day.sports.forEach(sport => {
						if (sport.key === key) {
							occurrences.push({ date: day.date, time: sport.time, detail: sport.detail });
						}
					});
				});
				return occurrences.sort((a, b) => b.date.localeCompare(a.date));
			})
		);
	}

	public getSport(key: string): Observable<ISportHistory> {
		return this.dbContext.asObservable<ISportHistory>(
			this.dbContext.sportsCollection.get(key)
		).pipe(
			catchError(() => of(null))
		);
	}

	public refreshSports(): Observable<ISportHistory[]> {
		return this.daysService.getDays().pipe(
			map(days => {
				const sportHistories = new Array<ISportHistory>();
				days.reverse().forEach(day => {
					if (day.sports == null) {
						return;
					}
					day.sports.forEach(sport => {
						const currentSport =
							sportHistories.find(sportHistory => sportHistory.key === sport.key);
						if (currentSport == null) {
							sportHistories.push({ key: sport.key, occurrences: 1, lastEntry: day.date });
						} else {
							currentSport.occurrences++;
							currentSport.lastEntry = day.date;
						}
					});
				});
				return sportHistories;
			}),
			switchMap(sportHistories => {
				return this.reset().pipe(
					switchMap(() => {
						if (sportHistories.length === 0) {
							return of(sportHistories);
						}
						const tasks = sportHistories.map(sportHistory => this.createNewSport(sportHistory));
						return forkJoin(tasks).pipe(map(() => sportHistories));
					})
				);
			})
		);
	}

	public addSport(date: string, key: string): Observable<ISportHistory> {
		return this.getSport(key).pipe(
			switchMap(sport => {
				if (sport == null) {
					return this.createNewSport({ key, occurrences: 1, lastEntry: date });
				} else {
					sport.occurrences++;
					sport.lastEntry = date;
					return this.dbContext.asObservable(this.dbContext.sportsCollection.put(sport)).pipe(
						map(() => sport)
					);
				}
			}));
	}

	public deleteSportEntry(key: string): Observable<ISportHistory[]> {
		return this.daysService.getDays().pipe(
			switchMap(days => {
				const changedDays = [];
				days.forEach(day => {
					if (day.sports == null) {
						return;
					}
					const initialLength = day.sports.length;
					day.sports = day.sports.filter(s => s.key !== key);
					if (day.sports.length !== initialLength) {
						changedDays.push(day);
					}
				});
				if (changedDays.length === 0) {
					return of(null);
				}
				return this.daysService.addDays(changedDays);
			}),
			switchMap(() => this.refreshSports())
		);
	}

	public editSportEntry(oldKey: string, newKey: string): Observable<ISportHistory[]> {
		return this.daysService.getDays().pipe(
			switchMap(days => {
				const changedDays = [];
				days.forEach(day => {
					if (day.sports == null) {
						return;
					}
					let changed = false;
					day.sports.forEach(sport => {
						if (sport.key === oldKey) {
							sport.key = newKey;
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
			switchMap(() => this.refreshSports())
		);
	}

	public createNewSport(sport: ISportHistory): Observable<null> {
		const newSport = {
			'_id': sport.key,
			'key': sport.key,
			'occurrences': sport.occurrences,
			'lastEntry': sport.lastEntry
		};
		return this.dbContext.asObservable(this.dbContext.sportsCollection.put(newSport)).pipe(
			map(() => null)
		);
	}

	public removeSportByKey(key: string): Observable<ISportHistory> {
		return this.getSport(key).pipe(
			switchMap(sport => {
				if (sport == null) {
					return of(null);
				}
				if (sport.occurrences > 1) {
					sport.occurrences--;
					return this.dbContext.asObservable(this.dbContext.sportsCollection.put(sport)).pipe(
						map(() => sport)
					);
				} else {
					return this.dbContext.asObservable(this.dbContext.sportsCollection.remove(sport)).pipe(
						map(() => sport)
					);
				}
			}));
	}

	public reset(): Observable<null> {
		return this.dbContext.sportsCollection.reset().pipe(
			map(() => null)
		);
	}

}
