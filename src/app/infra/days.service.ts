import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { IDay, IDayOverview } from '../models';
import * as CALENDAR_JSON from './static-calendar.json';

const CALENDAR: IDay[] = (CALENDAR_JSON as any).default;
let DAYS_CONTENTS: any[];

@Injectable()
export class DaysService {

	constructor(private http: HttpClient) {
		DAYS_CONTENTS = this.calendarToDaysContent();
	}

	public getDaysOverviews(): Observable<IDayOverview[]> {
		return of(CALENDAR);
	}

	public getDays(): Observable<IDay[]> {
		return of(CALENDAR);
	}

	public getDaysContents(): Observable<any[]> {
		return of(DAYS_CONTENTS);
	}

	public calendarToDaysContent(): any[] {
		const contents = Array();
		for (const day of CALENDAR) {
			contents.push(this.getContent(day));
		}
		return contents;
	}

	public getContent(day: IDay): any {
		if (day == null) {
			return null;
		}
		const content = Array();

		for (const log of day.logs) {
			content.push(log);
		}
		for (const symptom of day.symptoms) {
			for (const symptomLog of symptom.logs) {
				content.push(symptomLog);
			}
		}
		for (const med of day.meds) {
			content.push(med);
		}
		for (const meal of day.meals) {
			content.push(meal);
		}

		const dayContent = { 'date': day.date, 'wakeUp': day.wakeUp, 'goToBed': day.goToBed, 'content': content };

		dayContent.content.sort(this.getSortOrder('time'));

		return dayContent;
	}

	public getSortOrder(prop: any) {
		return (a: any, b: any) => {
			if (a[prop] > b[prop]) {
				return 1;
			} else if (a[prop] < b[prop]) {
				return -1;
			}
			return 0;
		};
	}

	public getDay(date: string): Observable<IDay> {
		return of(this.getDayByDate(date));
	}

	public getDayByDate(date: string): IDay {
		return CALENDAR.find(day => day.date === date) || null;
	}

	public getDayContent(date: string): Observable<any> {
		const day = CALENDAR.find(d => d.date === date) || null;
		const dayContent = this.getContent(day);
		return of(dayContent);
	}

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
			const symptom = { 'type': 'symptom', 'key': key, 'logs': symptomLogs };
			day.symptoms.push(symptom);
		}
		day.symptoms[key].logs.push({ 'type': 'symptomLog', 'time': time, 'key': key, 'pain': pain, 'detail': detail });
	}

	public addLog(day: IDay, time: string, detail: string): void {
		day.logs.push({ 'type': 'log', 'time': time, 'detail': detail });
	}

	public addMed(day: IDay, time: string, key: string, quantity: string): void {
		day.meds.push({ 'type': 'med', 'time': time, 'key': key, 'quantity': quantity });
	}

	public addMeal(day: IDay, time: string, detail: string): void {
		day.meals.push({ 'type': 'meal', 'time': time, 'detail': detail });
	}

	public add(
		date: string,
		time: string,
		type: string,
		key: string,
		pain: string,
		detail: string,
		quantity: string): any {
		const day = this.getDayByDate(date);
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
		DAYS_CONTENTS = this.calendarToDaysContent();
		return {
			'date': date,
			'time': time,
			'type': type,
			'key': key,
			'pain': pain,
			'detail': detail,
			'quantity': quantity
		};
	}
}
