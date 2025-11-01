import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import { ILogHistory } from '../models/log.model';
import * as moment from 'moment';
import { DaysService } from '.';

@Injectable()
export class LogsService {

	constructor(
		private readonly dbContext: DbContext,
		private readonly daysService: DaysService
	) { }

	public getLogs(): Observable<ILogHistory[]> {
		return this.dbContext.asArrayObservable<ILogHistory>(
			this.dbContext.logsCollection.allDocs({ include_docs: true, descending: true })
		);
	}

	public getLog(key: string): Observable<ILogHistory> {
		return this.dbContext.asObservable<ILogHistory>(
			this.dbContext.logsCollection.get(key)
		).pipe(
			catchError(() => of(null))
		);
	}

	public refreshLogs(): Observable<ILogHistory[]> {
		return this.daysService.getDays().pipe(
			map(days => {
				const logHistories = new Array<ILogHistory>();
				days.reverse().forEach(day => {
					if (day.logs == null) {
						return;
					}
					day.logs.forEach(log => {
						const currentLog =
							logHistories.find(logHistory => logHistory.key === log.key);
						if (currentLog == null) {
							logHistories.push({ key: log.key, occurrences: 1, lastEntry: day.date });
						} else {
							currentLog.occurrences++;
							currentLog.lastEntry = day.date;
						}
					});
				});
				this.reset().subscribe(() => {
					logHistories.forEach(logHistory => {
						this.createNewLog(logHistory)
					});
				});
				return logHistories;
			})
		);
	}

	public addLog(date: string, key: string): Observable<ILogHistory> {
		return this.getLog(key).pipe(
			switchMap(log => {
				if (log == null) {
					return this.createNewLog({ key, occurrences: 1, lastEntry: moment().format('YYYY-MM-DD') })
				} else {
					log.occurrences++;
					log.lastEntry = date;
					return this.dbContext.asObservable(this.dbContext.logsCollection.put(log)).pipe(
						map(() => log)
					);
				}
			}));
	}

	public addLogs(logs: ILogHistory[]): Observable<ILogHistory[]> {
		return this.dbContext.asObservable(this.dbContext.logsCollection.bulkDocs(logs));
	}

	public deleteLog(key: string): Observable<null> {
		const log = this.getLog(key);
		return log.pipe(
			tap(s => {
				this.dbContext.logsCollection.remove(s);
			}),
			map(() => null)
		);
	}

	public createNewLog(log: ILogHistory): Observable<null> {
		const newLog = {
			'_id': log.key,
			'key': log.key,
			'occurrences': log.occurrences,
			'lastEntry': log.lastEntry
		};
		return this.dbContext.asObservable(this.dbContext.logsCollection.put(newLog)).pipe(
			map(() => null)
		);
	}

	public removeLog(log: ILogHistory): Observable<ILogHistory> {
		return this.dbContext.asObservable(this.dbContext.logsCollection.remove(log)).pipe(
			map(() => log)
		);
	}

	public removeLogByKey(key: string): Observable<ILogHistory> {
		return this.getLog(key).pipe(
			switchMap(log => {
				if (log.occurrences > 1) {
					log.occurrences--;
					return this.dbContext.asObservable(this.dbContext.logsCollection.put(log)).pipe(
						map(() => log)
					);
				} else {
					return this.dbContext.asObservable(this.dbContext.logsCollection.remove(log)).pipe(
						map(() => log)
					);
				}
			}));
	}

	public reset(): Observable<null> {
		return this.dbContext.logsCollection.reset().pipe(
			map(() => null)
		);
	}

}
