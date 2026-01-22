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

	public readonly CURRENT_VERSION = "0.1.0";

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

	public setBetaInvitationSeen(seen: boolean): Observable<ISettings> {
		const settings = this.getSettings();
		return settings.pipe(
			switchMap(s => {
				s.beta1_0_0_invitation = seen;
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

	public initSettings(): Observable<ISettings> {
		return this.getSettings().pipe(
			switchMap(s => {
				if (s == null) {
					const settings = {
						'_id': KEY,
						'targetSymptomKey': '',
						'language': '',
						'timeFormat': '',
						'firstStart': true,
						'lastInstall': this.CURRENT_VERSION
					};
					return this.dbContext.asObservable(this.dbContext.settingsCollection.put(settings)).pipe(
						map(() => settings)
					);
				}
				else {
					/*if (s.lastInstall == null || s.lastInstall === '') {
						return this.updateLastInstallFromSettings(s);
					}*/
					return of(s);
				}
			})
		);

	}
}
