import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { DbContext } from './database';
import { DaysService } from './days.service';
import { GlobalService } from './global.service';
import { IDay } from '../models';
import { ICustomEntry, ICustomEntryHistory, ICustomType } from '../models/custom-type.model';

// Event types created by the user (definitions), and their entries stored in the days
@Injectable()
export class CustomTypesService {

	constructor(
		private readonly dbContext: DbContext,
		private readonly daysService: DaysService,
		private readonly globalService: GlobalService
	) { }

	public getCustomTypes(): Observable<ICustomType[]> {
		return this.dbContext.asArrayObservable<ICustomType>(
			this.dbContext.customTypesCollection.allDocs({ include_docs: true })
		).pipe(
			map(types => types.sort((a, b) => a.created - b.created))
		);
	}

	// Makes the types available to the whole app (labels, icons, colors)
	public loadCustomTypes(): Observable<ICustomType[]> {
		return this.getCustomTypes().pipe(
			tap(types => this.globalService.customTypes = types)
		);
	}

	// Creates the type or updates it
	public saveCustomType(customType: ICustomType): Observable<ICustomType[]> {
		const collection = this.dbContext.customTypesCollection;
		return this.dbContext.asObservable<any>(collection.get(customType.key)).pipe(
			catchError(() => of(null)),
			switchMap(saved => this.dbContext.asObservable(collection.put({
				...customType,
				'_id': customType.key,
				...(saved != null ? { '_rev': saved._rev } : {})
			}))),
			switchMap(() => this.loadCustomTypes())
		);
	}

	// Deletes the type and all its entries
	public deleteCustomType(key: string): Observable<ICustomType[]> {
		const collection = this.dbContext.customTypesCollection;
		return this.updateEntries(key, () => null).pipe(
			switchMap(() => this.dbContext.asObservable<any>(collection.get(key))),
			switchMap(saved => this.dbContext.asObservable(collection.remove(saved))),
			catchError(() => of(null)),
			switchMap(() => this.loadCustomTypes())
		);
	}

	// Replaces every type (backup import)
	public replaceCustomTypes(types: ICustomType[]): Observable<ICustomType[]> {
		return this.dbContext.customTypesCollection.reset().pipe(
			switchMap(() => {
				if (types == null || types.length === 0) {
					return of(null);
				}
				const docs = types.map(type => {
					const doc = { ...type, '_id': type.key };
					delete doc['_rev'];
					return doc;
				});
				return this.dbContext.asObservable(this.dbContext.customTypesCollection.bulkDocs(docs));
			}),
			switchMap(() => this.loadCustomTypes())
		);
	}

	public countEntries(typeKey: string): Observable<number> {
		return this.daysService.getDays().pipe(
			map(days => days.reduce((count, day) => count + this.getEntries(day, typeKey).length, 0))
		);
	}

	// One line per entry name, the most recent first
	public getEntryHistories(typeKey: string): Observable<ICustomEntryHistory[]> {
		return this.daysService.getDays().pipe(
			map(days => {
				const histories = new Map<string, ICustomEntryHistory>();
				// Oldest day first, so that the last entry of a name is the most recent one
				days.sort((a, b) => a.date.localeCompare(b.date)).forEach(day => {
					this.getEntries(day, typeKey).sort((a, b) => (a.time || '').localeCompare(b.time || '')).forEach(entry => {
						const key = entry.key || '';
						const history = histories.get(key) || { key, occurrences: 0, lastEntry: null, lastQuantity: null };
						history.occurrences++;
						history.lastEntry = day.date;
						history.lastQuantity = entry.quantity != null ? entry.quantity : history.lastQuantity;
						histories.set(key, history);
					});
				});
				return Array.from(histories.values()).sort((a, b) => b.lastEntry.localeCompare(a.lastEntry));
			})
		);
	}

	public getEntryOccurrences(typeKey: string, key: string):
		Observable<{ date: string, time: string, detail: string, quantity: number }[]> {
		return this.daysService.getDays().pipe(
			map(days => {
				const occurrences = [];
				days.forEach(day => {
					this.getEntries(day, typeKey).filter(entry => (entry.key || '') === key).forEach(entry => {
						occurrences.push({ date: day.date, time: entry.time, detail: entry.detail, quantity: entry.quantity });
					});
				});
				return occurrences.sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
			})
		);
	}

	// Renames the entries of a name, in every day
	public renameEntries(typeKey: string, oldKey: string, newKey: string): Observable<null> {
		return this.updateEntries(typeKey, entry => (entry.key || '') === oldKey ? { ...entry, key: newKey } : entry);
	}

	// Deletes the entries of a name, in every day
	public deleteEntries(typeKey: string, key: string): Observable<null> {
		return this.updateEntries(typeKey, entry => (entry.key || '') === key ? null : entry);
	}

	private getEntries(day: IDay, typeKey: string): ICustomEntry[] {
		return (day.customs || []).filter(entry => entry.customType === typeKey);
	}

	// Applies the change to every entry of the type (null removes the entry) and saves the changed days.
	// Days left empty are removed, as when the last event of a day is deleted from the timeline.
	private updateEntries(typeKey: string, change: (entry: ICustomEntry) => ICustomEntry): Observable<null> {
		return this.daysService.getDays().pipe(
			switchMap(days => {
				const changedDays: IDay[] = [];
				days.forEach(day => {
					if (this.getEntries(day, typeKey).length === 0) {
						return;
					}
					day.customs = day.customs
						.map(entry => entry.customType === typeKey ? change(entry) : entry)
						.filter(entry => entry != null);
					if (this.daysService.isDayEmpty(day) && day.symptomOverviews.length === 0) {
						(day as any)._deleted = true;
					}
					changedDays.push(day);
				});
				if (changedDays.length === 0) {
					return of(null);
				}
				return this.daysService.addDays(changedDays).pipe(map(() => null));
			})
		);
	}
}
