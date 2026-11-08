import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SettingsService, ImporterExporterService, DaysService } from './infra';
import { Subject, Observable } from 'rxjs';
import { ISymptom } from './models/symptom.model';
import { GlobalService } from './infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { MatDialog } from '@angular/material/dialog';
import { DialogNoSymptomWarningComponent } from './ui/dialog/dialog-no-symptom-warning';
import { ISettings } from './models/settings.model';
import { DialogSelectLanguageComponent } from './ui/dialog/dialog-select-language';
import { DialogInfoComponent } from './ui/dialog/dialog-info';
import { UpdatesService } from './infra/updates.service';
import { DialogUpdatesComponent } from './ui/dialog/dialog-updates';
import { DialogTutorialNoticeComponent } from './ui/dialog/dialog-tutorial-notice';
import { DialogNewUiComponent } from './ui/dialog/dialog-new-ui';
import { CustomTypesService } from './infra/custom-types.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public title = 'Life Notes - Symptom Tracking';
	public symptoms: ISymptom[];
	public symptoms$: Subject<ISymptom[]>;
	// Toolbar entry of the current page, highlighted in the toolbar
	public activeSection: string;
	// The pages are drawn once the settings are known: nothing is shown with the default ones
	// (e.g. the other timeline design) before
	public settingsLoaded = false;
	// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
	// public updatesCount: number = 0;
	// private lastUpdate: number = 0;

	constructor(
		public globalService: GlobalService,
		private translocoService: TranslocoService,
		private settingsService: SettingsService,
		private importerExporterService: ImporterExporterService,
		private dialog: MatDialog,
		private updatesService: UpdatesService,
		private customTypesService: CustomTypesService,
		private router: Router
	) {
		/*this.symptoms = new Array<ISymptom>();
		this.symptoms$ = new Subject<ISymptom[]>();*/
	}

	public ngOnInit(): void {
		this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
			this.activeSection = this.getSection(event.urlAfterRedirects);
		});
		// this.updateSymptoms();
		this.customTypesService.loadCustomTypes().subscribe();
		this.settingsService.initSettings().subscribe(settings => {
			this.initSettings(settings);
			// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
			// this.lastUpdate = settings.lastUpdate;
			// this.checkUpdates();
			this.checkBackupReminders(settings);
		});
		// this.daysService.reset().subscribe(() => {});
	}

	// Sub pages highlight their parent entry, the day view highlights none
	private getSection(url: string): string {
		const page = url.split(/[/?#]/).filter(part => part.length > 0)[0] || '';
		if (page === '' || page === 'timeline') {
			return 'timeline';
		}
		if (page === 'calendar' || page === 'monthlyreport' || page === 'yearinpixels') {
			return 'calendar';
		}
		if (['manage', 'symptoms', 'meals', 'meds', 'logs', 'sports', 'custom'].includes(page)) {
			return 'manage';
		}
		if (['settings', 'about', 'tutorial'].includes(page)) {
			return 'settings';
		}
		return null;
	}

	// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
	// public checkUpdates(): void {
	// 	this.updatesService.getUpdates().subscribe(updates => {
	// 		if (updates && updates.length > 0) {
	// 			const newUpdates = updates.filter(u => u.id > this.lastUpdate);
	// 			this.updatesCount = newUpdates.length;
	// 		}
	// 	});
	// }

	public checkBackupReminders(settings: ISettings): void {
		// The first launch belongs to the language choice and the welcome dialogs
		if (settings.firstStart) {
			return;
		}
		const now = Date.now();
		const oneDay = 24 * 60 * 60 * 1000;
		// The daily reminder takes precedence, so both are never shown on the same day
		if (settings.dailyReminder && now - settings.lastDailyReminder > oneDay) {
			this.openBackupReminderDialog('DAILY_REMINDER_CONTENT_1');
			this.settingsService.setLastDailyReminder(now).subscribe();
		} else if (settings.weeklyReminder && now - settings.lastWeeklyReminder > 7 * oneDay) {
			this.openBackupReminderDialog('WEEKLY_REMINDER_CONTENT_1');
			this.settingsService.setLastWeeklyReminder(now).subscribe();
		}
	}

	public openBackupReminderDialog(firstContentKey: string) {
		this.dialog.open(DialogInfoComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'WEEKLY_REMINDER_TITLE',
				content: [
					firstContentKey,
					'WEEKLY_REMINDER_CONTENT_2',
					'WEEKLY_REMINDER_CONTENT_3',
					'WEEKLY_REMINDER_CONTENT_4',
					'WEEKLY_REMINDER_CONTENT_5'
				]
			}
		});
	}

	// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
	// public openUpdates(): void {
	// 	this.dialog.open(DialogUpdatesComponent, {
	// 		autoFocus: false,
	// 		width: '90%',
	// 		height: '90%',
	// 		maxWidth: '100vw',
	// 		maxHeight: '100vh',
	// 		panelClass: 'custom-modalbox',
	// 		data: { lastUpdate: this.lastUpdate }
	// 	}).afterClosed().subscribe(() => {
	// 		this.updatesCount = 0;
	// 		this.settingsService.getSettings().subscribe(s => this.lastUpdate = s.lastUpdate);
	// 	});
	// }



	public getSymptoms$(): Observable<ISymptom[]> {
		return this.globalService.symptoms$;
	}

	public getTargetSymptomKey(): string {
		return this.globalService.targetSymptomKey;
	}

	/*public updateSymptoms(): void {
		this.globalService.symptoms$.subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.symptoms$.next(this.symptoms);
		});
	}*/

	public initSettings(settings: ISettings): void {
		this.initTimeFormat(settings);
		this.initPainScale(settings);
		this.initTargetSymptom(settings);
		// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
		// this.globalService.hideDeveloperUpdates = settings.hideDeveloperUpdates;
		this.globalService.calendarStartOnSunday = settings.calendarStartOnSunday;
		this.globalService.calendarBlockView = settings.calendarBlockView;
		this.globalService.painPalette = settings.painPalette;
		if (settings != null && settings.firstStart) {
			this.selectLanguageOpenDialog();
		} else {
			this.initLanguage(settings.language);
		}
		this.settingsLoaded = true;

		// Users of the former versions kept the V1: they are told once about the V2
		const newUiNotice = settings != null && !settings.firstStart && !settings.newUiPopupSeen
			&& settings.uiVersion === 'v1' ? () => this.newUiOpenDialog() : null;
		this.settingsService.getSettingsCurrentVersion().subscribe(settingsVersion => {
			this.settingsService.getCurrentVersion().subscribe(currentVersion => {
				if (typeof settingsVersion === 'string' && settingsVersion.startsWith('0.')) {
					if (settingsVersion < currentVersion) {
						this.updateInfoOpenDialog(newUiNotice);
						this.settingsService.setCurrentVersion().subscribe();
					} else if (newUiNotice) {
						newUiNotice();
					}
				} else {
					this.updateInfoOpenDialog(newUiNotice);
					this.settingsService.setCurrentVersion().subscribe();
				}
			});
		});
	}

	public selectLanguageOpenDialog() {
		this.dialog.open(DialogSelectLanguageComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox'
		}).afterClosed().subscribe(response => {
			if (response == null) {
				return;
			}
			this.settingsService.setLanguage(response.answer).subscribe(
				settings => {
					this.initLanguage(settings.language);
					this.startInfoOpenDialog();
				}
			);
		});
	}

	public startInfoOpenDialog() {
		this.dialog.open(DialogInfoComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'START_TITLE',
				content: ['START_CONTENT_1', 'START_CONTENT_2', 'START_CONTENT_3',
					'START_CONTENT_4', 'START_CONTENT_5', 'START_CONTENT_6',
					'START_CONTENT_7']
			}
		}).afterClosed().subscribe(_ => {
			this.settingsService.setFirstStart(false).subscribe(() => {
				this.updateInfoOpenDialog(() => this.tutorialNoticeOpenDialog());
			});
		});
	}

	public newUiOpenDialog() {
		this.settingsService.setNewUiPopupSeen(true).subscribe();
		this.dialog.open(DialogNewUiComponent, {
			autoFocus: false,
			width: '22rem',
			maxWidth: '92vw',
			panelClass: ['custom-modalbox', 'new-ui-dialog']
		});
	}

	public tutorialNoticeOpenDialog() {
		this.dialog.open(DialogTutorialNoticeComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox'
		});
	}

	public updateInfoOpenDialog(next?: () => void) {
		this.dialog.open(DialogInfoComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'UPDATE_NOTIFICATION_TITLE',
				content: ['UPDATE_NOTIFICATION_CONTENT_1', 'UPDATE_NOTIFICATION_CONTENT_2'],
				actionButton: {
					label: 'CHECK_UPDATE_NOTES',
					url: 'https://life-notes.fr/updates'
				}
			}
		}).afterClosed().subscribe(_ => {
			this.settingsService.setCurrentVersion().subscribe();
			if (next) {
				next();
			}
		});
	}

	public initLanguage(language: string): void {
		if (!this.settingsService.AVAILABLE_LANGS.includes(language)) {
			return;
		}
		this.translocoService.setActiveLang(language);
		this.globalService.language = language;
	}

	public initTimeFormat(settings: ISettings): void {
		if (!this.settingsService.AVAILABLE_TIME_FORMATS.includes(settings.timeFormat)) {
			this.settingsService.setTimeFormat('eu').subscribe(
				newSettings => {
					this.globalService.timeFormat = newSettings.timeFormat;
				}
			);
		} else {
			this.globalService.timeFormat = settings.timeFormat;
		}
	}

	public initPainScale(settings: ISettings): void {
		if (!this.settingsService.AVAILABLE_PAIN_SCALES.includes(settings.painScale)) {
			this.settingsService.setPainScale(5).subscribe(
				newSettings => {
					this.globalService.painScale = newSettings.painScale;
				}
			);
		} else {
			this.globalService.painScale = settings.painScale;
		}
	}

	public initTargetSymptom(settings: ISettings): void {
		this.globalService.targetSymptomKey = settings.targetSymptomKey;
	}

	/*public selectSymptom(): void {
		this.globalService.loadSymptoms().subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.symptoms$.next(this.symptoms);

			if (this.symptoms.length === 0) {
				this.noSymptomWarning();
			} else {
				this.openSelectSymptom(this.symptoms);
			}
		});
	}

	public openSelectSymptom(symptoms: ISymptom[]): void {
		this.dialog.open(DialogSelectSymptomComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { symptoms }
		}).afterClosed().subscribe(response => {
			if (response == null) {
				return;
			}
			this.globalService.targetSymptomKey = response.answer;
		});
	}*/

	public noSymptomWarning(): void {
		this.dialog.open(DialogNoSymptomWarningComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox'
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
		});
	}
}
