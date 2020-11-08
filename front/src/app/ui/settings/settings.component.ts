import { Component, OnInit } from '@angular/core';
import { GlobalService } from 'src/app/infra/global.service';
import { Observable } from 'rxjs';
import { ISymptom } from 'src/app/models/symptom.model';
import { TranslocoService } from '@ngneat/transloco';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

	public symptoms$: Observable<ISymptom[]>;
	public selectedSymptom: string;
	public selectedLanguage: string;

	constructor(
		private globalService: GlobalService,
		private translocoService: TranslocoService
	) { }

	public ngOnInit(): void {
		this.symptoms$ = this.globalService.symptoms$;
	}

	public setActiveLanguage(): void {
		this.translocoService.setActiveLang(this.selectedLanguage);
	}

}
