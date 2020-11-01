import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Collection } from './collection';

@Injectable({
	providedIn: 'root'
})
export class DbContext {
	public daysCollection = new Collection('days');
	public symptomsCollection = new Collection('symptoms');

	public asArrayObservable<T>(dbSet: Promise<{ rows: { doc: T }[] }>): Observable<T[]> {
		return from(dbSet).pipe(
			map(set => set.rows.map(row => row.doc))
		);
	}

	public asObservable<T>(dbSet: Promise<any>): Observable<T> {
		return from(dbSet);
	}
}
