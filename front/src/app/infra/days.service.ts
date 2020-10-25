// import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { IDay, IDayOverview } from '../models';
import { getFormattedDate, getDetailedDate } from 'src/app/util/date.utils';
import { getSortOrder } from 'src/app/util/array.utils';
import { DbContext } from './database';
import { ILog } from '../models/log.model';
import { IMed } from '../models/med.model';
import { IMeal } from '../models/meal.model';
import { ISymptom } from '../models/symptom.model';
import { tap, map, switchMap, filter } from 'rxjs/operators';
import { ICustomEvent } from '../models/customEvent.model';
import { isLeapYear, getDaysInMonth } from 'date-fns';

// const CALENDAR_API = '/api/calendar';
// const CALENDAR_FROM_API = '/api/calendar-from';
// const DAY_OVERVIEW_FIELDS = 'date, symptomOverviews';

@Injectable()
export class DaysService {
	private static daysOverview: Observable<IDayOverview[]>;
	private static calendar: Observable<IDay[]>;

	constructor(
		// private readonly http: HttpClient,
		private readonly dbContext: DbContext
	) { }

	public getDaysOverviews(): Observable<IDayOverview[]> {
		return this.dbContext.asArrayObservable<IDayOverview>(
			this.dbContext.daysCollection.allDocs({ include_docs: true, descending: true })
		);
	}

	public getMonthDaysOverviews(month: number): Observable<IDayOverview[]> {
		return this.dbContext.asArrayObservable<IDayOverview>(
			this.dbContext.daysCollection.allDocs({ include_docs: true, descending: true })
		).pipe(
			map(days => this.getFilledMonthDays(days, month))
		);
	}

	public getFilledMonthDays(days: IDayOverview[], month: number): IDayOverview[] {
		const monthDays = [...days].filter(d => d.detailedDate.month === month);
		const year = days[0].detailedDate.year;
		for (let i = 1; i <= getDaysInMonth(month); i++) {
			const day = days.find(d => d.detailedDate.year === year && d.detailedDate.month === month
				&& d.detailedDate.day === i);
			if (day == null) {
				const formattedDate = year + '-' + month + '-' + i;
				const date = new Date(Date.parse(formattedDate));
				const emptyDay = {
					'date': formattedDate,
					'detailedDate': getDetailedDate(date),
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
		monthDays.sort(getSortOrder('date'));
		return monthDays;
	}

	public getDays(): Observable<IDay[]> {
		return this.dbContext.asArrayObservable<IDay>(
			this.dbContext.daysCollection.allDocs({ include_docs: true, descending: true })
		);
	}

	public getDay(date: string): Observable<IDay> {
		return this.dbContext.asObservable<IDay>(
			this.dbContext.daysCollection.get(date)
		);
	}

	public getSymptomOverview(day: IDay, key: string) {
		return day.symptomOverviews.find(s => s.key === key);
	}

	public getTypeLabel(type: string): string {
		const labels = new Map([
			['symptomLog', 'Symptom'],
			['log', 'Custom event'],
			['med', 'Drug'],
			['meal', 'Meal'],
			['wakeUp', 'Wake up'],
			['goToBed', 'Bed time']]);

		return labels.get(type);
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

	public addSymptomOverview(date: string, key: string, pain: number): Observable<null> {
		const day = this.getDay(date);
		return day.pipe(
			tap(d => {
				let symptomOverview = d.symptomOverviews.find(s => s.key === key);
				if (symptomOverview == null) {
					symptomOverview = { key, pain };
					d.symptomOverviews.push(symptomOverview);
				} else {
					symptomOverview.pain = pain;
				}
				this.dbContext.daysCollection.put(d);
			}),
			map(() => null));
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

	public addEvent(date: string, customEvent: ICustomEvent): Observable<null> {
		const day = this.getDay(date);
		return day.pipe(
			tap(d => {
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
				this.dbContext.daysCollection.put(d);
			}),
			map(() => null));
	}

	public editEvent(date: string, oldCustomEvent: ICustomEvent, customEvent: ICustomEvent): Observable<null> {
		return this.deleteEvent(date, oldCustomEvent).pipe(
			switchMap(() => {
				return this.addEvent(date, customEvent);
			}),
			map(() => null));
	}

	public deleteEvent(date: string, customEvent: ICustomEvent): Observable<null> {
		const day = this.getDay(date);
		return day.pipe(
			tap(d => {
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
				this.dbContext.daysCollection.put(d);
			}),
			map(() => null));
	}

	public filterEvent(events: any[], time: string, key: string) {
		return events.filter((event: { time: string; key: string; }) => event.time !== time || event.key !== key);
	}

	public createNewDay(date: Date): Observable<never> {
		const formattedDate = getFormattedDate(new Date());
		const day = {
			'_id': formattedDate,
			'date': formattedDate,
			'detailedDate': getDetailedDate(date),
			'symptomOverviews': [],
			'symptoms': [],
			'logs': [],
			'meds': [],
			'meals': [],
			'wakeUp': '',
			'goToBed': ''
		};
		this.dbContext.daysCollection.put(day).then((res: any) => { }, (err: any) => { });
		return of();
	}

	public addDay(day: IDay): Observable<never> {
		this.dbContext.daysCollection.put(day);
		return of();
	}

	public createNewDayToday(): Observable<never> {
		this.createNewDay(new Date());
		return of();
	}

	public removeDayByDate(date: string): Observable<never> {
		this.getDay(date).subscribe(day => {
			this.dbContext.daysCollection.remove(day);
		});
		return of();
	}

	public removeDay(day: IDay): Observable<never> {
		this.dbContext.daysCollection.remove(day);
		return of();
	}

	public clearCalendar(): Observable<never> {
		this.getDays().subscribe(days => days.map(day => this.removeDay(day)));
		return of();
	}

}
