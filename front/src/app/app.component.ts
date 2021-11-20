import { Component, OnInit } from '@angular/core';
import { SettingsService, ImporterExporterService, DaysService } from './infra';
import { Subject, Observable } from 'rxjs';
import { ISymptom } from './models/symptom.model';
import { GlobalService } from './infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { MatDialog } from '@angular/material/dialog';
import { DialogNoSymptomWarningComponent } from './ui/dialog/dialog-no-symptom-warning';
import { ISettings } from './models/settings.model';
import { DialogSelectLanguageComponent } from './ui/dialog/dialog-select-language';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public title = 'Life Notes - Symptom Tracking';
	public symptoms: ISymptom[];
	public symptoms$: Subject<ISymptom[]>;

	constructor(
		public globalService: GlobalService,
		private translocoService: TranslocoService,
		private settingsService: SettingsService,
		private importerExporterService: ImporterExporterService,
		private dialog: MatDialog
	) {
		/*this.symptoms = new Array<ISymptom>();
		this.symptoms$ = new Subject<ISymptom[]>();*/
	}

	public ngOnInit(): void {
		// this.updateSymptoms();
		this.settingsService.initSettings().subscribe(_ => {
			this.initSettings();
			this.autoBackup();
		}, _ => {
			this.autoBackup();
		});

		// this.daysService.reset().subscribe(() => {});
	}

	public autoBackup(): void {
		this.importerExporterService.exportData(true);
	}

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

	public initSettings(): void {
		this.settingsService.getSettings().subscribe(
			settings => {
				this.initTimeFormat(settings);
				this.initTargetSymptom(settings);
				if (settings.firstStart) {
					this.selectLanguageOpenDialog();
				} else {
					this.initLanguage(settings.language);
				}
			}
		);
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
			console.log(response.answer);
			this.initLanguage(response.answer);
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
