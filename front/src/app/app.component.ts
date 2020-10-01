import { Component, OnInit } from '@angular/core';
import { DaysService } from './infra';
import { ImporterExporter } from './infra/importer-exporter';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public title = 'Healthy Day';

	constructor(
		private daysService: DaysService,
		private importerExporter: ImporterExporter
	) { }

	public ngOnInit(): void {
		this.daysService.createNewDayToday();
	}

	public fileClickFire(): void {
		const fileInput: HTMLElement = document.getElementById('file-import') as HTMLElement;
		fileInput.click();
	}

	public importData(event) {
		this.importerExporter.importData(event);
	}

	public exportData(): void {
		this.importerExporter.exportData();
	}

	public exportHtml(): void {
		this.importerExporter.exportHtml();
	}
}
