import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { IDay, IDayOverview } from '../models';

const CALENDAR: IDay[] = [{
	"date": "2020-09-24",
	"symptomOverviews": [{
		"key": "ventre",
		"pain": 0
	},
	{
		"key": "tete",
		"pain": 1
	}],
	"symptoms": [{
		"type": "symptom",
		"key": "ventre",
		"logs": [{
			"key": "ventre",
			"type": "symptomLog",
			"pain": 0,
			"time": "09:00",
			"detail": "rien du tout"
		}]
	}],
	"logs": [{
		"type": "log",
		"time": "10:00",
		"detail": "Je me suis levé, j'ai pris une douche, etc"
	}],
	"meds": [{
		"type": "med",
		"key": "loperamide",
		"quantity": "2mg",
		"time": "14:00"
	}],
	"meals": [{
		"type": "meal",
		"time": "12:00",
		"detail": "poulet curry"
	}],
	"wakeUp": "10:00",
	"goToBed": "00:00"
},
{
	"date": "2020-09-25",
	"symptomOverviews": [{
		"key": "ventre",
		"pain": 0
	},
	{
		"key": "tete",
		"pain": 1
	}],
	"symptoms": [{
		"type": "symptom",
		"key": "ventre",
		"logs": [{
			"key": "ventre",
			"type": "symptomLog",
			"pain": 0,
			"time": "12:00",
			"detail": "rien du tout"
		}]
	}],
	"logs": [{
		"type": "log",
		"time": "10:00",
		"detail": "Je me suis levé, j'ai pris une douche, etc"
	}],
	"meds": [{
		"type": "med",
		"key": "loperamide",
		"quantity": "2mg",
		"time": "12:00"
	}],
	"meals": [{
		"type": "meal",
		"time": "12:00",
		"detail": "poulet curry"
	}],
	"wakeUp": "10:00",
	"goToBed": "00:00"
}];

@Injectable()
export class DaysService {

	constructor(private http: HttpClient) { }

	public getDaysOverviews(): Observable<IDayOverview[]> {
		return of(CALENDAR);
	}

	public getDays(): Observable<IDay[]> {
		return of(CALENDAR);
	}

	public getDayContent(date: string): Observable<any> {
		const day = CALENDAR.find(d => d.date === date) || null;
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

		return of(dayContent);
	}

	public getSortOrder(prop) {
		return (a, b) => {
			if (a[prop] > b[prop]) {
				return 1;
			} else if (a[prop] < b[prop]) {
				return -1;
			}
			return 0;
		};
	}

	public getDay(date: string): Observable<IDay> {
		this.getDayContent(date);
		return of(CALENDAR.find(day => day.date === date) || null);
	}
}
