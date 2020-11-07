import { Component, OnInit } from '@angular/core';
import { DaysService, ImporterExporterService } from './infra';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogImportConfirmComponent } from './ui/dialog-import-confirm';
import { Observable } from 'rxjs';
import { ISymptom } from './models/symptom.model';
import { GlobalService } from './infra/global.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public title = 'Healthy Day';
	public symptoms$: Observable<ISymptom[]>;

	constructor(
		private globalService: GlobalService,
		private daysService: DaysService,
		private importerExporterService: ImporterExporterService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) { }

	public ngOnInit(): void {
		this.daysService.createNewDayToday().subscribe(res => { }, error => { });
		this.symptoms$ = this.globalService.symptoms$;
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
