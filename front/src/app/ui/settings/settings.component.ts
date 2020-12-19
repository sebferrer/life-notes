import { Component, OnInit } from '@angular/core';
import { GlobalService } from 'src/app/infra/global.service';
import { Observable } from 'rxjs';
import { ISymptom } from 'src/app/models/symptom.model';
import { TranslocoService } from '@ngneat/transloco';
import { ImporterExporterService, SettingsService } from 'src/app/infra';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogImportConfirmComponent } from '../dialog-import-confirm';
import { DialogSelectBackupComponent } from '../dialog-select-backup';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

	public symptoms$: Observable<ISymptom[]>;
	public selectedSymptom: string;
	public selectedLanguage: string;

	public debug = 'no error';

	constructor(
		private globalService: GlobalService,
		private translocoService: TranslocoService,
		private importerExporterService: ImporterExporterService,
		private settingsService: SettingsService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) { }

	public ngOnInit(): void {
		this.symptoms$ = this.globalService.symptoms$;
		this.selectedSymptom = this.globalService.targetSymptomKey;
		this.selectedLanguage = this.globalService.language;
	}

	public setActiveLanguage(): void {
		this.translocoService.setActiveLang(this.selectedLanguage);
		this.settingsService.setLanguage(this.selectedLanguage).subscribe();
	}

	public setTargetSymptom(): void {
		this.settingsService.setTargetSymptomKey(this.selectedSymptom).subscribe();
		this.globalService.targetSymptomKey = this.selectedSymptom;
	}

	public fileClickFire(): void {
		const fileInput: HTMLInputElement = document.getElementById('file-import') as HTMLInputElement;
		fileInput.value = '';
		fileInput.click();
	}

	public importDataWeb(event: any): void {
		this.dialog.open(DialogImportConfirmComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox'
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.importerExporterService.importDataWeb(event).subscribe(() => { });
			this.debug = this.importerExporterService.debug;
			this.snackBar.open(this.translocoService.translate('DATA_IMPORT_SNACKBAR_SUCCESS'), 'Close',
				{ duration: 2000 });
		});
	}

	public importDataNative(auto?: boolean): void {
		auto = auto || false;
		this.dialog.open(DialogImportConfirmComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox'
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.importerExporterService.importDataNative(auto).subscribe(() => { });
			this.debug = this.importerExporterService.debug;
			this.snackBar.open(this.translocoService.translate('DATA_IMPORT_SNACKBAR_SUCCESS'), 'Close',
				{ duration: 2000 });
		});
	}

	public importData(): void {
		this.dialog.open(DialogSelectBackupComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox'
		}).afterClosed().subscribe(response => {
			if (response == null) {
				return;
			}
			if (response.answer === 'auto') {
				this.importDataNative(true);
			} else if (response.answer === 'manual') {
				this.importDataNative();
			} else if (response.answer === 'web') {
				this.fileClickFire();
			}
		});
	}

	public exportData(): void {
		this.importerExporterService.exportData();
		this.debug = this.importerExporterService.debug;
		this.snackBar.open(this.translocoService.translate('DATA_EXPORT_SNACKBAR_SUCCESS'), 'Close',
			{ duration: 2000 });
	}

	public exportHtml(): void {
		this.importerExporterService.exportHtml();
	}

}
