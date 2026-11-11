import { Injectable, NgZone } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Collection } from './collection';

@Injectable({
	providedIn: 'root'
})
export class DbContext {
	public readonly daysCollection: Collection;
	public readonly symptomsCollection: Collection;
	public readonly medsCollection: Collection;
	public readonly logsCollection: Collection;
	public readonly sportsCollection: Collection;
	public readonly mealsCollection: Collection;
	public readonly customTypesCollection: Collection;
	public readonly settingsCollection: Collection;

	constructor(zone: NgZone) {
		this.daysCollection = new Collection('days', zone);
		this.symptomsCollection = new Collection('symptoms', zone);
		this.medsCollection = new Collection('meds', zone);
		this.logsCollection = new Collection('logs', zone);
		this.sportsCollection = new Collection('sports', zone);
		this.mealsCollection = new Collection('meals', zone);
		this.customTypesCollection = new Collection('customTypes', zone);
		this.settingsCollection = new Collection('settings', zone);
	}

	public asArrayObservable<T>(dbSet: Promise<{ rows: { doc: T }[] }>): Observable<T[]> {
		return from(dbSet).pipe(
			map(set => set.rows.map(row => row.doc))
		);
	}

	public asObservable<T>(dbSet: Promise<any>): Observable<T> {
		return from(dbSet);
	}
}
