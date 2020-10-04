// import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { IDay, IDayOverview } from '../models';
import { getFormattedDate } from 'src/app/util/date.utils';
import { DbContext } from './database';

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
			this.dbContext.database.allDocs({ include_docs: true, descending: true })
		);
	}

	public getDays(): Observable<IDay[]> {
		return this.dbContext.asArrayObservable<IDay>(
			this.dbContext.database.allDocs({ include_docs: true, descending: true })
		);
	}

	public getDay(date: string): Observable<IDay> {
		return this.dbContext.asObservable<IDay>(
			this.dbContext.database.get(date)
		);
	}

	public getTypeLabel(type: string): string {
		const labels = new Map([
			['symptomLog', 'Symptom'],
			['log', 'Custom event'],
			['med', 'Drug'],
			['meal', 'Meal'],
			['wakeUp', 'Wake up'],
			['goToBed', 'Go to bed']]);

		return labels.get(type);
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

	public addLog(day: IDay, time: string, detail: string): void {
		day.logs.push({ type: 'log', time, detail });
	}

	public addMed(day: IDay, time: string, key: string, quantity: string): void {
		day.meds.push({ type: 'med', time, key, quantity });
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

	public addEvent(
		date: string,
		time: string,
		type: string,
		key: string,
		pain: number,
		detail: string,
		quantity: string): Observable<never> {
		const day = this.getDay(date);
		day.subscribe(d => {
			switch (type) {
				case 'symptomLog':
					this.addSymptomLog(d, time, key, pain, detail);
					break;
				case 'log':
					this.addLog(d, time, detail);
					break;
				case 'med':
					this.addMed(d, time, key, quantity);
					break;
				case 'meal':
					this.addMeal(d, time, key, detail);
					break;
				case 'wakeUp':
				case 'goToBed':
					this.setStartEnd(d, time, type);
					break;

			}
			this.dbContext.database.put(d);
		});

		return of();
	}

	public deleteEvent(date: string, time: string, type: string, key: string): Observable<IDay> {
		const day = this.getDay(date);

		day.subscribe(d => {
			switch (type) {
				case 'symptomLog':
					const symptom = d.symptoms.find(s => s.key === key);
					symptom.logs = this.filterTimeEvent(symptom.logs, time);
					if (symptom.logs.length === 0) {
						d.symptoms = d.symptoms.filter(s => s.key !== key);
					}
					break;
				case 'log':
					d.logs = this.filterTimeEvent(d.logs, time);
					break;
				case 'med':
					d.meds = this.filterTimeEvent(d.meds, time);
					break;
				case 'meal':
					d.meals = this.filterTimeEvent(d.meals, time);
					break;
			}
			this.dbContext.database.put(d);
		});
		return day;
	}

	public filterTimeEvent(events: any[], time: string) {
		return events.filter((event: { time: string; }) => event.time !== time);
	}

	public createNewDay(date: string): Observable<never> {
		const day = {
			'_id': date,
			'date': date,
			'symptomOverviews': [],
			'symptoms': [],
			'logs': [],
			'meds': [],
			'meals': [],
			'wakeUp': '',
			'goToBed': ''
		};
		this.dbContext.database.put(day).then((res: any) => { }, (err: any) => { });
		return of();
	}

	public addDay(day: IDay): Observable<never> {
		this.dbContext.database.put(day);
		return of();
	}

	public createNewDayToday(): Observable<never> {
		this.createNewDay(getFormattedDate(new Date()));
		return of();
	}

	public removeDayByDate(date: string): Observable<never> {
		this.getDay(date).subscribe(day => {
			this.dbContext.database.remove(day);
		});
		return of();
	}

	public removeDay(day: IDay): Observable<never> {
		this.dbContext.database.remove(day);
		return of();
	}

	public clearCalendar(): Observable<never> {
		this.getDays().subscribe(days => days.map(day => this.removeDay(day)));
		return of();
	}

}
