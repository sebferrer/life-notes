import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { IDay, IDayOverview } from '../models';

const CALENDAR: IDay[] = [{
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
		"key": "ventre",
		"logs": [{
			"pain": 0,
			"time": "12:00",
			"detail": "rien du tout"
		}]
	}],
	"logs": [{
		"time": "10:00",
		"detail": "Je me suis levé, j'ai pris une douche, etc"
	}],
	"meds": [{
		"key": "loperamide",
		"quantity": "2mg",
		"time": "12:00"
	}],
	"meals": [{
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

	public getDay(date: string): Observable<IDay> {
		return of(CALENDAR.find(day => day.date === date) || null);
	}
}
