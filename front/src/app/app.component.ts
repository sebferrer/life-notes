import { Component, OnInit } from '@angular/core';
import { SettingsService } from './infra';
import { Subject } from 'rxjs';
import { ISymptom } from './models/symptom.model';
import { GlobalService } from './infra/global.service';
import { TranslocoService } from '@ngneat/transloco';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public title = 'Life Notes & Stats';
	public symptoms: ISymptom[];
	public symptoms$: Subject<ISymptom[]>;

	constructor(
		public globalService: GlobalService,
		private translocoService: TranslocoService,
		private settingsService: SettingsService
	) {
		this.symptoms = new Array<ISymptom>();
		this.symptoms$ = new Subject<ISymptom[]>();
	}

	public ngOnInit(): void {
		this.updateSymptoms();
		this.settingsService.initSettings().subscribe(res => { }, error => { });
		this.initSettings();
	}

	public updateSymptoms() {
		this.globalService.symptoms$.subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.symptoms$.next(this.symptoms);
		});
	}

	public initSettings() {
		this.initLanguage();
		this.initTargetSymptom();
	}

	public initLanguage() {
		this.settingsService.getSettings().subscribe(
			settings => {
				if (!this.settingsService.AVAILABLE_LANGS.includes(settings.language)) {
					return;
				}
				this.translocoService.setActiveLang(settings.language);
				this.globalService.language = settings.language;
			}
		);
	}

	public initTargetSymptom() {
		this.settingsService.getSettings().subscribe(
			settings => {
				this.globalService.targetSymptomKey = settings.targetSymptomKey;
			}
		);
	}
}
