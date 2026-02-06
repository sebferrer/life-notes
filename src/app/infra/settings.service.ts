import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ISettings } from '../models/settings.model';
import { GlobalService } from './global.service';

const KEY = 'settings';

@Injectable()
export class SettingsService {

	public readonly AVAILABLE_LANGS = ['en', 'fr'];
	public readonly AVAILABLE_TIME_FORMATS = ['us', 'eu'];
	public readonly AVAILABLE_PAIN_SCALES = [5, 10];

	public readonly CURRENT_VERSION = "0.2.2";

	constructor(
		private readonly dbContext: DbContext,
		private readonly globalService: GlobalService
	) { }

	public getSettings(): Observable<ISettings> {
		return this.dbContext.asObservable<ISettings>(
			this.dbContext.settingsCollection.get(KEY)
		).pipe(
			catchError(() => of(null))
		);
	}

	public editSettings(newSettings: ISettings): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.language = newSettings.language;
				s.targetSymptomKey = newSettings.targetSymptomKey;
				s.lastInstall = this.CURRENT_VERSION
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setLanguage(newDefaultLanguage: string): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.language = newDefaultLanguage;
				this.globalService.language = newDefaultLanguage;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setTimeFormat(newDefaultTimeFormat: string): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.timeFormat = newDefaultTimeFormat;
				this.globalService.timeFormat = newDefaultTimeFormat;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setPainScale(newPainScale: number): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.painScale = newPainScale;
				this.globalService.painScale = newPainScale;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setCurrentVersion(): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.lastInstall = this.CURRENT_VERSION;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public getSettingsCurrentVersion(): Observable<string> {
		return this.getSettings().pipe(
			map(s => s.lastInstall ?? this.CURRENT_VERSION)
		);
	}

	public getCurrentVersion(): Observable<string> {
		return this.getSettings().pipe(
			map(s => this.CURRENT_VERSION)
		);
	}

	public setTargetSymptomKey(newTargetSymptomKey: string): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.targetSymptomKey = newTargetSymptomKey;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setFirstStart(firstStart: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.firstStart = firstStart;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	/*public updateLastInstall(): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.lastInstall = moment().format().replace(/[^\w\s]/gi, '');
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public updateLastInstallFromSettings(settings: ISettings): Observable<ISettings> {
		settings.lastInstall = moment().format().replace(/[^\w\s]/gi, '');
		return this.dbContext.asObservable(this.dbContext.settingsCollection.put(settings)).pipe(
			map(() => settings)
		);

	}*/

	public setLastUpdate(lastUpdate: number): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.lastUpdate = lastUpdate;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setWeeklyReminder(weeklyReminder: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.weeklyReminder = weeklyReminder;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setLastWeeklyReminder(lastWeeklyReminder: number): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.lastWeeklyReminder = lastWeeklyReminder;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
	// public setHideDeveloperUpdates(hide: boolean): Observable<ISettings> {
	// 	const settings = this.getSettings();
	// 	return settings.pipe(
	// 		switchMap(s => {
	// 			s.hideDeveloperUpdates = hide;
	// 			this.globalService.hideDeveloperUpdates = hide;
	// 			return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
	// 				map(() => s)
	// 			);
	// 		})
	// 	);
	// }

	public setShowDeveloperMode(show: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.showDeveloperMode = show;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setCalendarStartOnSunday(startOnSunday: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.calendarStartOnSunday = startOnSunday;
				this.globalService.calendarStartOnSunday = startOnSunday;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setCalendarBlockView(blockView: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.calendarBlockView = blockView;
				this.globalService.calendarBlockView = blockView;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setPainPalette(palette: string): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.painPalette = palette;
				this.globalService.painPalette = palette;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public initSettings(): Observable<ISettings> {
		return this.getSettings().pipe(
			switchMap(s => {
				if (s == null) {
					const settings = {
						'_id': KEY,
						'targetSymptomKey': '',
						'language': '',
						'timeFormat': '',
						'painScale': 5,
						'firstStart': true,
						'lastInstall': this.CURRENT_VERSION,
						'lastUpdate': 0,
						// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
						// 'hideDeveloperUpdates': false,
						'showDeveloperMode': false,
						'calendarStartOnSunday': true,
						'calendarBlockView': false,
						'painPalette': '2',
						'weeklyReminder': true,
						'lastWeeklyReminder': 0
					};
					return this.dbContext.asObservable(this.dbContext.settingsCollection.put(settings)).pipe(
						map(() => settings)
					);
				}
				else {
					let changed = false;
					if (s.weeklyReminder == null) {
						s.weeklyReminder = true;
						changed = true;
					}
					if (s.lastWeeklyReminder == null) {
						s.lastWeeklyReminder = 0;
						changed = true;
					}
					if (s.painScale == null) {
						s.painScale = 5;
						changed = true;
					}
					if (s.lastUpdate == null) {
						s.lastUpdate = 0;
						changed = true;
					}
					// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
					// if (s.hideDeveloperUpdates == null) {
					// 	s.hideDeveloperUpdates = false;
					// 	changed = true;
					// }
					if (s.showDeveloperMode == null) {
						s.showDeveloperMode = false;
						changed = true;
					}
					if (s.calendarStartOnSunday == null) {
						s.calendarStartOnSunday = true;
						changed = true;
					}
					if (s.calendarBlockView == null) {
						s.calendarBlockView = false;
						changed = true;
					}
					if (s.painPalette == null) {
						s.painPalette = '2';
						changed = true;
					}
					if (changed) {
						this.dbContext.settingsCollection.put(s);
					}
					return of(s);
				}
			})
		);

	}

}
