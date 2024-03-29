// import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { IDay, IDayOverview } from '../models';
import { getDetailedDate, getDateFromString, getDetailedDates, subFormattedDate } from 'src/app/util/date.utils';
import { getSortOrderLevel2, getSortOrder } from 'src/app/util/array.utils';
import { DbContext } from './database';
import { ILog } from '../models/log.model';
import { IMed } from '../models/med.model';
import { IMeal } from '../models/meal.model';
import { ISymptom } from '../models/symptom.model';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { ICustomEvent } from '../models/customEvent.model';
import { getDaysInMonth, subDays } from 'date-fns';
import * as moment from 'moment';

// const CALENDAR_API = '/api/calendar';
// const CALENDAR_FROM_API = '/api/calendar-from';
// const DAY_OVERVIEW_FIELDS = 'date, symptomOverviews';

@Injectable()
export class DaysService {

	constructor(
		// private readonly http: HttpClient,
		private readonly dbContext: DbContext
	) { }

	public getDaysOverviews(): Observable<IDayOverview[]> {
		return this.dbContext.asArrayObservable<IDayOverview>(
			this.dbContext.daysCollection.allDocs({ include_docs: true, descending: true })
		);
	}

	public getMonthDaysOverviews(month: number, year: number): Observable<IDayOverview[]> {
		return this.dbContext.asArrayObservable<IDayOverview>(
			this.dbContext.daysCollection.allDocs({ include_docs: true, descending: true })
		).pipe(
			map(days => this.getFilledMonthDays(days, month, year))
		);
	}

	public getFilledMonthDays(days: IDayOverview[], month: number, year: number): IDayOverview[] {
		const monthDays = [...days].filter(d => d.detailedDate.month === month
			&& d.detailedDate.year === year);
		for (let i = 1; i <= getDaysInMonth(new Date(year, month - 1)); i++) {
			const day = days.find(d => d.detailedDate.year === year && d.detailedDate.month === month
				&& d.detailedDate.day === i);
			if (day == null) {
				// const formattedDate = year + '-' + month + '-' + i;
				const formattedDate = moment(year + '-' + month + '-' + i).format('YYYY-MM-DD');
				const emptyDay = {
					'date': formattedDate,
					'detailedDate': getDetailedDate(formattedDate),
					'symptomOverviews': [],
					'symptoms': [],
					'logs': [],
					'meds': [],
					'meals': [],
					'wakeUp': '',
					'goToBed': ''
				};
				monthDays.push(emptyDay);
			}
		}
		monthDays.sort(getSortOrderLevel2('detailedDate', 'day'));
		return monthDays;
	}

	public getDays(limit?: number, nbDays?: number): Observable<IDay[]> {
		if (limit == null || limit == null) {
			return this.dbContext.asArrayObservable<IDay>(
				this.dbContext.daysCollection.allDocs({ include_docs: true, descending: true })
			);
		}
		const firstDay = subDays(moment().toDate(), nbDays);
		const expectedDates = new Array<string>();
		for (let i = 0; i < limit; i++) {
			expectedDates.push(moment(subDays(firstDay, i)).format('YYYY-MM-DD'));
		}
		return this.dbContext.asArrayObservable<IDay>(
			this.dbContext.daysCollection.allDocs({ include_docs: true, descending: true, keys: expectedDates })
		).pipe(
			map(days => days.filter(day => day != null))
		).pipe(
			map(days => {
				if (days.length === expectedDates.length) {
					return days;
				}
				const newDays = new Array<IDay>();
				for (const expectedDate of expectedDates) {
					let newDay = days.find(day => day.date === expectedDate);
					if (newDay == null) {
						newDay = this.buildDay(expectedDate);
					}
					newDays.push(newDay);
				}
				return newDays;
			})
		).pipe(
			map(days => days.sort(getSortOrder('date', true)))
		);
	}

	public getLastDay(): Observable<IDay> {
		return this.dbContext.asArrayObservable<IDay>(
			this.dbContext.daysCollection.allDocs({ include_docs: true, descending: true, limit: 1 })
		).pipe(
			map(days => days[0])
		);
	}

	public getDay(date: string): Observable<IDay> {
		return this.dbContext.asObservable<IDay>(
			this.dbContext.daysCollection.get(date)
		).pipe(
			catchError(() => of(null))
		);
	}

	public getOrCreateDay(date: string): Observable<IDay> {
		return this.getDay(date).pipe(
			switchMap(
				day => day == null ? this.createNewDay(date).pipe(
					switchMap(d => this.getDay(d.date))
				) : of(day)
			)
		);
	}

	public getSymptomOverview(day: IDay, key: string) {
		if (day == null) {
			return null;
		}
		return day.symptomOverviews.find(s => s.key === key);
	}

	public getSymptomLog(day: IDay, time: string, key: string): Observable<ILog> {
		const symptom: ISymptom = day.symptoms.find(s => s.key === key);
		return of(symptom.logs.find(log => log.time === time));
	}

	public addSymptomLog(day: IDay, time: string, key: string, pain: number, detail: string): void {
		let symptom = day.symptoms.find(s => s.key === key);
		if (symptom == null) {
			const symptomLogs = Array<any>();
			symptom = { type: 'symptom', key, logs: symptomLogs };
			day.symptoms.push(symptom);
		}
		day.symptoms.find(s => s.key === key).logs.push({ type: 'symptomLog', time, key, pain, detail });
	}

	public addSymptomOverview(date: string, key: string, pain: number): Observable<IDay> {
		const day = this.getOrCreateDay(date);
		return day.pipe(
			switchMap(d => {
				let symptomOverview = d.symptomOverviews.find(s => s.key === key);
				if (symptomOverview == null) {
					symptomOverview = { key, pain };
					d.symptomOverviews.push(symptomOverview);
				} else {
					symptomOverview.pain = pain;
				}
				return this.dbContext.asObservable(this.dbContext.daysCollection.put(d)).pipe(
					map(() => d)
				);
			}));
	}

	public addLog(day: IDay, time: string, key: string, detail: string): void {
		day.logs.push({ type: 'log', time, key, detail });
	}

	public getMed(day: IDay, time: string, key: string): Observable<IMed> {
		return of(day.meds.find(med => med.time === time && med.key === key));
	}

	public addMed(day: IDay, time: string, key: string, quantity: number): void {
		day.meds.push({ type: 'med', time, key, quantity });
	}

	public getMeal(day: IDay, time: string, key: string): Observable<IMeal> {
		return of(day.meals.find(meal => meal.time === time && meal.key === key));
	}

	public addMeal(day: IDay, time: string, key: string, detail: string): void {
		day.meals.push({ type: 'meal', time, key, detail });
	}

	public setStartEnd(day: IDay, time: string, type: string): void {
		switch (type) {
			case 'wakeUp':
				day.wakeUp = time;
				break;
			case 'goToBed':
				day.goToBed = time;
				break;
		}
	}

	public addEvent(date: string, customEvent: ICustomEvent): Observable<IDay> {
		const day = this.getOrCreateDay(date);
		return day.pipe(
			switchMap(d => {
				if (customEvent.time != null && customEvent.key != null) {
					switch (customEvent.type) {
						case 'symptomLog':
							this.addSymptomLog(d, customEvent.time, customEvent.key, customEvent.pain, customEvent.detail);
							break;
						case 'log':
							this.addLog(d, customEvent.time, customEvent.key, customEvent.detail);
							break;
						case 'med':
							this.addMed(d, customEvent.time, customEvent.key, customEvent.quantity);
							break;
						case 'meal':
							this.addMeal(d, customEvent.time, customEvent.key, customEvent.detail);
							break;
						case 'wakeUp':
						case 'goToBed':
							this.setStartEnd(d, customEvent.time, customEvent.type);
							break;

					}
				}
				switch (customEvent.type) {
					case 'wakeUp':
					case 'goToBed':
						this.setStartEnd(d, customEvent.time, customEvent.type);
						break;

				}

				return this.dbContext.asObservable(this.dbContext.daysCollection.put(d)).pipe(
					map(() => d)
				);
			}));
	}

	public editEvent(date: string, oldCustomEvent: ICustomEvent, customEvent: ICustomEvent): Observable<IDay> {
		return this.deleteEvent(date, oldCustomEvent).pipe(
			switchMap(() => {
				return this.addEvent(date, customEvent);
			}));
	}

	public deleteEvent(date: string, customEvent: ICustomEvent): Observable<IDay> {
		const day = this.getDay(date);
		return day.pipe(
			switchMap(d => {
				switch (customEvent.type) {
					case 'symptomLog':
						const symptom = d.symptoms.find(s => s.key === customEvent.key);
						symptom.logs = this.filterEvent(symptom.logs, customEvent.time, customEvent.key);
						if (symptom.logs.length === 0) {
							d.symptoms = d.symptoms.filter(s => s.key !== customEvent.key);
						}
						break;
					case 'log':
						d.logs = this.filterEvent(d.logs, customEvent.time, customEvent.key);
						break;
					case 'med':
						d.meds = this.filterEvent(d.meds, customEvent.time, customEvent.key);
						break;
					case 'meal':
						d.meals = this.filterEvent(d.meals, customEvent.time, customEvent.key);
						break;
				}
				return this.dbContext.asObservable(this.dbContext.daysCollection.put(d)).pipe(
					map(() => d)
				);
			}));
	}

	public deleteDeepEvent(date: string, customEvent: ICustomEvent): Observable<IDay> {
		return this.deleteEvent(date, customEvent).pipe(
			switchMap(day => {
				if (this.isDayEmpty(day)) {
					return this.removeDayByDate(date);
				}
				return of(day);
			})
		);
	}

	public isDayEmpty(day: IDay): boolean {
		return day.logs.length === 0 &&
			day.symptoms.length === 0 &&
			day.meds.length === 0 &&
			day.meals.length === 0 &&
			day.wakeUp === '' && day.goToBed === '';
	}

	public filterEvent(events: any[], time: string, key: string) {
		return events.filter((event: { time: string; key: string; }) => event.time !== time || event.key !== key);
	}

	public createNewDay(formattedDate: string): Observable<IDay> {
		const date = moment(formattedDate).toDate();
		const day = {
			'_id': formattedDate,
			'date': formattedDate,
			'detailedDate': getDetailedDate(formattedDate),
			'symptomOverviews': [],
			'symptoms': [],
			'logs': [],
			'meds': [],
			'meals': [],
			'wakeUp': '',
			'goToBed': ''
		};
		return this.dbContext.asObservable(this.dbContext.daysCollection.put(day)).pipe(
			map(() => day)
		);
	}

	public createNewDayToday(): Observable<IDay> {
		return this.createNewDay(moment().format('YYYY-MM-DD'));
	}

	public buildDay(formattedDate: string): IDay {
		const date = moment(formattedDate).toDate();
		return {
			'date': formattedDate,
			'detailedDate': getDetailedDate(formattedDate),
			'symptomOverviews': [],
			'symptoms': [],
			'logs': [],
			'meds': [],
			'meals': [],
			'wakeUp': '',
			'goToBed': ''
		};
	}

	public addDay(day: IDay): Observable<IDay> {
		return this.dbContext.asObservable(this.dbContext.daysCollection.put(day)).pipe(
			map(() => day)
		);
	}

	public addDays(days: IDay[]): Observable<IDay[]> {
		return this.dbContext.asObservable(this.dbContext.daysCollection.bulkDocs(days)).pipe(
			map(() => days)
		);
	}

	public removeDayByDate(date: string): Observable<IDay> {
		return this.getDay(date).pipe(
			switchMap(day => {
				return this.dbContext.asObservable(this.dbContext.daysCollection.remove(day)).pipe(
					map(() => day)
				);
			}));
	}

	public removeDay(day: IDay): Observable<IDay> {
		return this.dbContext.asObservable(this.dbContext.daysCollection.remove(day)).pipe(
			map(() => day)
		);
	}

	public reset(): Observable<null> {
		return this.dbContext.daysCollection.reset().pipe(
			map(() => null)
		);
	}
}
