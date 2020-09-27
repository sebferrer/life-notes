import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { IDay, IDayOverview } from '../models';
import { environment } from '../../environments/environment';

const CALENDAR_API = '/api/calendar';
const DAY_OVERVIEW_FIELDS = 'date,symptomOverviews';

@Injectable()
export class DaysService {
	private static daysOverview: Observable<IDayOverview[]>;
	private static calendar: Observable<IDay[]>;

	constructor(private http: HttpClient) { }

	public getDaysOverviews(): Observable<IDayOverview[]> {
		if (DaysService.calendar == null) {
			DaysService.daysOverview = this.http.get<IDayOverview[]>(
				`${environment.backendUrl}${CALENDAR_API}`
			).pipe(
				shareReplay(1)
			);
		}
		return DaysService.daysOverview;
	}

	public getDays(): Observable<IDay[]> {
		if (DaysService.calendar == null) {
			DaysService.calendar = this.http.get<IDay[]>(
				`${environment.backendUrl}${CALENDAR_API}`
			).pipe(
				shareReplay(1)
			);
		}
		return DaysService.calendar;
	}

	public getDay(date: string): Observable<IDay[]> {
		if (DaysService.calendar == null) {
			DaysService.calendar = this.http.get<IDay[]>(
				`${environment.backendUrl}${CALENDAR_API}`
			).pipe(
				shareReplay(1)
			);
		}
		return DaysService.calendar;
	}

	/*public getDay(date: string): Observable<IDay> {
		return of(this.getDayByDate(date));
	}

	public getDayByDate(date: string): IDay {
		return CALENDAR.find(day => day.date === date) || null;
	}

	public getDayContent(date: string): Observable<any> {
		const day = CALENDAR.find(d => d.date === date) || null;
		const dayContent = this.getContent(day);
		return of(dayContent);
	}*/

	public getTypeLabel(type: string): string {
		const labels = new Map([
			['symptomLog', 'Symptom'],
			['log', 'Custom event'],
			['med', 'Drug'],
			['meal', 'Meal']]);

		return labels.get(type);
	}

	public addSymptomLog(day: IDay, time: string, key: string, pain: string, detail: string): void {
		if (!(key in day.symptoms)) {
			const symptomLogs = Array<any>();
			const symptom = { type: 'symptom', key, logs: symptomLogs };
			day.symptoms.push(symptom);
		}
		day.symptoms[key].logs.push({ type: 'symptomLog', time, key, pain, detail });
	}

	public addLog(day: IDay, time: string, detail: string): void {
		day.logs.push({ type: 'log', time, detail });
	}

	public addMed(day: IDay, time: string, key: string, quantity: string): void {
		day.meds.push({ type: 'med', time, key, quantity });
	}

	public addMeal(day: IDay, time: string, detail: string): void {
		day.meals.push({ type: 'meal', time, detail });
	}
/*
	public add(
		date: string,
		time: string,
		type: string,
		key: string,
		pain: string,
		detail: string,
		quantity: string): Observable<never> {
		const day = this.http.get<IDay[]>(
			`${environment.backendUrl}${CALENDAR_API}`
		);
		switch (type) {
			case 'symptomLog':
				this.addSymptomLog(day, time, key, pain, detail);
				break;
			case 'log':
				this.addLog(day, time, detail);
				break;
			case 'med':
				this.addMed(day, time, key, quantity);
				break;
			case 'meal':
				this.addMeal(day, time, detail);
				break;
		}
		return {
			'date': date,
			'time': time,
			'type': type,
			'key': key,
			'pain': pain,
			'detail': detail,
			'quantity': quantity
		};
		return null;
	}*/
}
