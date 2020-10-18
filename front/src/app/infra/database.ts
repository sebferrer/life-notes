import { Injectable } from '@angular/core';
import * as PouchDB from 'pouchdb/dist/pouchdb';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class DbContext {
	public readonly daysCollection = new PouchDB('days');
	public readonly symptomsCollection = new PouchDB('symptoms');

	public asArrayObservable<T>(dbSet: Promise<{ rows: { doc: T }[] }>): Observable<T[]> {
		return from(dbSet).pipe(
			map(set => set.rows.map(row => row.doc))
		);
	}

	public asObservable<T>(dbSet: Promise<any>): Observable<T> {
		return from(dbSet);
	}
}
