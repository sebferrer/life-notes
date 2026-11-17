import { Observable, of, forkJoin } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { map, switchMap, catchError } from 'rxjs/operators';
import { IMealHistory } from '../models/meal.model';
import { DaysService } from '.';

@Injectable()
export class MealsService {

	constructor(
		private readonly dbContext: DbContext,
		private readonly daysService: DaysService
	) { }

	public getMeals(): Observable<IMealHistory[]> {
		return this.dbContext.asArrayObservable<IMealHistory>(
			this.dbContext.mealsCollection.allDocs({ include_docs: true, descending: true })
		);
	}

	public getMealOccurrences(key: string): Observable<{ date: string, time: string, detail: string }[]> {
		return this.daysService.getDays().pipe(
			map(days => {
				const occurrences: { date: string, time: string, detail: string }[] = [];
				days.forEach(day => {
					if (day.meals == null) return;
					day.meals.forEach(meal => {
						if (meal.key === key) {
							occurrences.push({ date: day.date, time: meal.time, detail: meal.detail });
						}
					});
				});
				return occurrences.sort((a, b) => b.date.localeCompare(a.date));
			})
		);
	}

	public getMeal(key: string): Observable<IMealHistory> {
		return this.dbContext.asObservable<IMealHistory>(
			this.dbContext.mealsCollection.get(key)
		).pipe(
			catchError(() => of(null))
		);
	}

	public refreshMeals(): Observable<IMealHistory[]> {
		return this.daysService.getDays().pipe(
			map(days => {
				const mealHistories = new Array<IMealHistory>();
				days.reverse().forEach(day => {
					if (day.meals == null) {
						return;
					}
					day.meals.forEach(meal => {
						const currentMeal =
							mealHistories.find(mealHistory => mealHistory.key === meal.key);
						if (currentMeal == null) {
							mealHistories.push({ key: meal.key, occurrences: 1, lastEntry: day.date });
						} else {
							currentMeal.occurrences++;
							currentMeal.lastEntry = day.date;
						}
					});
				});
				return mealHistories;
			}),
			switchMap(mealHistories => {
				return this.reset().pipe(
					switchMap(() => {
						if (mealHistories.length === 0) {
							return of(mealHistories);
						}
						const tasks = mealHistories.map(mealHistory => this.createNewMeal(mealHistory));
						return forkJoin(tasks).pipe(map(() => mealHistories));
					})
				);
			})
		);
	}

	public addMeal(date: string, key: string): Observable<IMealHistory> {
		return this.getMeal(key).pipe(
			switchMap(meal => {
				if (meal == null) {
					return this.createNewMeal({ key, occurrences: 1, lastEntry: date });
				} else {
					meal.occurrences++;
					meal.lastEntry = date;
					return this.dbContext.asObservable(this.dbContext.mealsCollection.put(meal)).pipe(
						map(() => meal)
					);
				}
			}));
	}

	public deleteMealEntry(key: string): Observable<IMealHistory[]> {
		return this.daysService.getDays().pipe(
			switchMap(days => {
				const changedDays = [];
				days.forEach(day => {
					if (day.meals == null) {
						return;
					}
					const initialLength = day.meals.length;
					day.meals = day.meals.filter(s => s.key !== key);
					if (day.meals.length !== initialLength) {
						changedDays.push(day);
					}
				});
				if (changedDays.length === 0) {
					return of(null);
				}
				return this.daysService.addDays(changedDays);
			}),
			switchMap(() => this.refreshMeals())
		);
	}

	public editMealEntry(oldKey: string, newKey: string): Observable<IMealHistory[]> {
		return this.daysService.getDays().pipe(
			switchMap(days => {
				const changedDays = [];
				days.forEach(day => {
					if (day.meals == null) {
						return;
					}
					let changed = false;
					day.meals.forEach(meal => {
						if (meal.key === oldKey) {
							meal.key = newKey;
							changed = true;
						}
					});
					if (changed) {
						changedDays.push(day);
					}
				});
				if (changedDays.length === 0) {
					return of(null);
				}
				return this.daysService.addDays(changedDays);
			}),
			switchMap(() => this.refreshMeals())
		);
	}

	public createNewMeal(meal: IMealHistory): Observable<null> {
		const newMeal = {
			'_id': meal.key,
			'key': meal.key,
			'occurrences': meal.occurrences,
			'lastEntry': meal.lastEntry
		};
		return this.dbContext.asObservable(this.dbContext.mealsCollection.put(newMeal)).pipe(
			map(() => null)
		);
	}

	public removeMealByKey(key: string): Observable<IMealHistory> {
		return this.getMeal(key).pipe(
			switchMap(meal => {
				if (meal == null) {
					return of(null);
				}
				if (meal.occurrences > 1) {
					meal.occurrences--;
					return this.dbContext.asObservable(this.dbContext.mealsCollection.put(meal)).pipe(
						map(() => meal)
					);
				} else {
					return this.dbContext.asObservable(this.dbContext.mealsCollection.remove(meal)).pipe(
						map(() => meal)
					);
				}
			}));
	}

	public reset(): Observable<null> {
		return this.dbContext.mealsCollection.reset().pipe(
			map(() => null)
		);
	}

}
