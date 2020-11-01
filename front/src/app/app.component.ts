import { Component, OnInit } from '@angular/core';
import { DaysService, SymptomsService } from './infra';
import { ImporterExporter } from './infra/importer-exporter';
import { Observable } from 'rxjs';
import { ISymptom, ISymptomOverview } from './models/symptom.model';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public title = 'Healthy Day';
	public symptoms$: Observable<ISymptom[]>;
	public symptomMap: Map<string, string>;
	public targetSymptomKey: string;

	constructor(
		private daysService: DaysService,
		private symptomsService: SymptomsService,
		private importerExporter: ImporterExporter
	) {
		this.symptomMap = new Map();
	}

	public ngOnInit(): void {
		this.daysService.createNewDayToday().subscribe(res => { }, error => { });
		this.symptoms$ = this.symptomsService.getSymptoms();
		this.symptoms$.subscribe(s => s.map(x => this.symptomMap.set(x.key, x.label)));
	}

	public setTargetSymptom(key: string): void {
		this.targetSymptomKey = key;
	}

	public fileClickFire(): void {
		const fileInput: HTMLElement = document.getElementById('file-import') as HTMLElement;
		fileInput.click();
	}

	public importData(event: any) {
		this.importerExporter.importData(event);
	}

	public exportData(): void {
		this.importerExporter.exportData();
	}

	public exportHtml(): void {
		this.importerExporter.exportHtml();
	}
}
