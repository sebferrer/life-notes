import * as PouchDB from 'pouchdb/dist/pouchdb';

export class Collection {

	private id: string;
	private db: PouchDB;

	constructor(id: string) {
		this.id = id;
		this.db = new PouchDB(this.id);
	}

	public allDocs<T>(): Promise<{ rows: { doc: T }[] }> {
		return this.db.allDocs({ include_docs: true, descending: true });
	}

	public get<T>(id: string): T {
		return this.db.get(id);
	}

	public put<T>(doc: T): Promise<T> {
		return this.db.put(doc);
	}

	public remove<T>(doc: T): Promise<T> {
		return this.db.remove(doc);
	}

	public reset() {
		this.db = new PouchDB(this.id);
	}
}
