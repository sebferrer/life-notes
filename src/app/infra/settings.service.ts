import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { DbContext } from './database';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ISettings } from '../models/settings.model';
import { GlobalService } from './global.service';
import { IEventPalettes, completeEventPalettes, getDefaultEventPalettes } from '../models/event-colors.model';

const KEY = 'settings';

@Injectable()
export class SettingsService {

	public readonly AVAILABLE_LANGS = ['en', 'fr'];
	public readonly AVAILABLE_TIME_FORMATS = ['us', 'eu'];
	public readonly AVAILABLE_PAIN_SCALES = [5, 10];

	public readonly CURRENT_VERSION = "0.3.7";

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
				// Backups made before the appearance settings existed don't contain them
				if (newSettings.darkMode != null) {
					s.darkMode = newSettings.darkMode;
				}
				if (newSettings.timelineStyle != null) {
					s.timelineStyle = newSettings.timelineStyle;
				}
				if (newSettings.landscapeMode != null) {
					s.landscapeMode = newSettings.landscapeMode;
				}
				if (newSettings.eventColors != null) {
					s.eventColors = completeEventPalettes(newSettings.eventColors);
				}
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

	public setDailyReminder(dailyReminder: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.dailyReminder = dailyReminder;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setLastDailyReminder(lastDailyReminder: number): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.lastDailyReminder = lastDailyReminder;
				// A backup reminder has just been shown: no need for the weekly one too
				s.lastWeeklyReminder = lastDailyReminder;
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

	public setShowAdvancedSettings(show: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.showAdvancedSettings = show;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

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

	public setAutoCalculateOverview(auto: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.autoCalculateOverview = auto;
				this.globalService.autoCalculateOverview = auto;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setAutoOverviewPopupSeen(seen: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.autoOverviewPopupSeen = seen;
				this.globalService.autoOverviewPopupSeen = seen;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setTimePicker(picker: string): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.timePicker = picker;
				this.globalService.timePicker = picker;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setDarkMode(darkMode: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.darkMode = darkMode;
				this.globalService.darkMode = darkMode;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setTimelineStyle(timelineStyle: string): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.timelineStyle = timelineStyle;
				this.globalService.timelineStyle = timelineStyle;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setLandscapeMode(landscapeMode: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.landscapeMode = landscapeMode;
				this.globalService.landscapeMode = landscapeMode;
				return this.dbContext.asObservable(this.dbContext.settingsCollection.put(s)).pipe(
					map(() => s)
				);
			})
		);
	}

	public setEventColors(eventColors: IEventPalettes): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.eventColors = completeEventPalettes(eventColors);
				this.globalService.eventPalettes = s.eventColors;
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
						'painScale': 10, // Default 10 for new users
						'firstStart': true,
						'lastInstall': this.CURRENT_VERSION,
						'lastUpdate': 0,
						// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
						// 'hideDeveloperUpdates': false,
						'showDeveloperMode': false,
						'showAdvancedSettings': false,
						'calendarStartOnSunday': true,
						'calendarBlockView': false,
						'painPalette': '2',
						'weeklyReminder': true,
						'lastWeeklyReminder': 0,
						'dailyReminder': false,
						'lastDailyReminder': 0,
						'autoCalculateOverview': true, // Default ON for new users
						'autoOverviewPopupSeen': false,
						'timePicker': 'material',
						'darkMode': false,
						'landscapeMode': false,
						'timelineStyle': 'modern',
						'eventColors': getDefaultEventPalettes()
					};
					return this.dbContext.asObservable(this.dbContext.settingsCollection.put(settings)).pipe(
						tap(() => {
							this.globalService.painScale = settings.painScale;
							this.globalService.autoCalculateOverview = settings.autoCalculateOverview;
							this.globalService.autoOverviewPopupSeen = settings.autoOverviewPopupSeen;
							this.globalService.timePicker = settings.timePicker;
							this.globalService.darkMode = settings.darkMode;
							this.globalService.landscapeMode = settings.landscapeMode;
							this.globalService.timelineStyle = settings.timelineStyle;
							this.globalService.eventPalettes = settings.eventColors;
						}),
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
					if (s.dailyReminder == null) {
						s.dailyReminder = false;
						changed = true;
					}
					if (s.lastDailyReminder == null) {
						s.lastDailyReminder = 0;
						changed = true;
					}
					if (s.painScale == null) {
						s.painScale = 5; // Sustain 5 for existing users
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
					if (s.showAdvancedSettings == null) {
						s.showAdvancedSettings = false;
						changed = true;
					}
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
					if (s.autoCalculateOverview == null) {
						s.autoCalculateOverview = false; // Default OFF for existing users
						changed = true;
					}
					if (s.autoOverviewPopupSeen == null) {
						s.autoOverviewPopupSeen = false;
						changed = true;
					}

					if (s.timePicker == null) {
						s.timePicker = 'material';
						changed = true;
					}

					if (s.darkMode == null) {
						s.darkMode = false;
						changed = true;
					}

					if (s.timelineStyle == null) {
						s.timelineStyle = 'modern';
						changed = true;
					}

					if (s.landscapeMode == null) {
						s.landscapeMode = false;
						changed = true;
					}

					if (s.eventColors == null) {
						s.eventColors = getDefaultEventPalettes();
						changed = true;
					}

					// Update GlobalService with loaded values
					this.globalService.painScale = s.painScale;
					this.globalService.autoCalculateOverview = s.autoCalculateOverview;
					this.globalService.autoOverviewPopupSeen = s.autoOverviewPopupSeen;
					this.globalService.timePicker = s.timePicker;
					this.globalService.darkMode = s.darkMode;
					this.globalService.landscapeMode = s.landscapeMode;
					this.globalService.timelineStyle = s.timelineStyle;
					this.globalService.eventPalettes = s.eventColors;

					if (changed) {
						this.dbContext.settingsCollection.put(s);
					}
					return of(s);
				}
			})
		);
	}

}
