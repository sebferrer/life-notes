import { NgZone } from '@angular/core';
import * as PouchDB from 'pouchdb/dist/pouchdb';
import { Observable, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';

// PouchDB runs outside the Angular zone: it makes one IndexedDB request per document read, and in the zone each of
// them went through Angular's bookkeeping, 5 to 10 times the cost of the read itself. Only the result comes back into
// the zone, so that the screens are refreshed as before.
export class Collection {

	private id: string;
	private db: PouchDB;

	constructor(id: string, private readonly zone: NgZone) {
		this.id = id;
		this.db = this.open();
	}

	// The requests made before the database is opened wait for it, in the zone of its opening
	private open(): PouchDB {
		return this.zone.runOutsideAngular(() => new PouchDB(this.id));
	}

	private run<T>(request: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.zone.runOutsideAngular(request).then(
				result => this.zone.run(() => resolve(result)),
				error => this.zone.run(() => reject(error))
			);
		});
	}

	public allDocs<T>(options?): Promise<{ rows: { doc: T }[] }> {
		options = options == null ? {} : options;
		return this.run(() => this.db.allDocs(options));
	}

	public get<T>(id: string): Promise<T> {
		return this.run(() => this.db.get(id));
	}

	public put<T>(doc: T): Promise<T> {
		return this.run(() => this.db.put(doc));
	}

	public bulkDocs<T>(docs: T[]): Promise<T[]> {
		return this.run(() => this.db.bulkDocs(docs));
	}

	public remove<T>(doc: T): Promise<T> {
		return this.run(() => this.db.remove(doc));
	}

	public reset(): Observable<null> {
		return from(this.run(() => this.db.destroy())).pipe(
			tap(() => { this.db = this.open(); }),
			map(() => null)
		);
	}
}
