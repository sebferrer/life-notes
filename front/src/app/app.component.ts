import { Component, OnInit } from '@angular/core';
import { DaysService, SymptomsService, ImporterExporterService } from './infra';
import { Observable } from 'rxjs';
import { ISymptom } from './models/symptom.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogImportConfirmComponent } from './ui/dialog-import-confirm';

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
		private importerExporterService: ImporterExporterService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
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
		this.dialog.open(DialogImportConfirmComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox'
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.importerExporterService.importData(event).subscribe(() => { });
			this.snackBar.open(`The data has been successfully imported`, 'Close');
		});
	}

	public exportData(): void {
		this.importerExporterService.exportData();
	}

	public exportHtml(): void {
		this.importerExporterService.exportHtml();
	}
}
