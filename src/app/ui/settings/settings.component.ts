import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { GlobalService } from 'src/app/infra/global.service';
import { Observable } from 'rxjs';
import { ISymptom } from 'src/app/models/symptom.model';
import { TranslocoService } from '@ngneat/transloco';
import { ImporterExporterService, SettingsService } from 'src/app/infra';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogImportConfirmComponent } from '../dialog/dialog-import-confirm';
import { DialogSelectBackupComponent } from '../dialog/dialog-select-backup';
import { BackupService } from 'src/app/infra/backup.service';
import { DialogExportConfirmComponent } from '../dialog/dialog-export-confirm';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

	public symptoms$: Observable<ISymptom[]>;
	public selectedSymptom: string;
	public selectedLanguage: string;
	public selectedTimeFormat: string;
	public selectedPainScale: number;
	public hideDeveloperUpdates: boolean;
	public showDeveloperMode: boolean;

	public debug = 'no error';
	public backupData = '';
	public generateData = false;
	@ViewChild('jsonBackupTextArea')
	public jsonBackupTextArea: ElementRef<HTMLTextAreaElement>;
	public showCopySuccessMessage = false;

	constructor(
		private globalService: GlobalService,
		private translocoService: TranslocoService,
		private importerExporterService: ImporterExporterService,
		private backupService: BackupService,
		private settingsService: SettingsService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) { }

	public ngOnInit(): void {
		this.symptoms$ = this.globalService.symptoms$;
		this.selectedSymptom = this.globalService.targetSymptomKey;
		this.selectedLanguage = this.globalService.language;
		this.selectedTimeFormat = this.globalService.timeFormat;
		this.selectedPainScale = this.globalService.painScale;
		this.settingsService.getSettings().subscribe(settings => {
			this.hideDeveloperUpdates = settings.hideDeveloperUpdates;
			this.showDeveloperMode = settings.showDeveloperMode;
		});
	}

	public setActiveLanguage(): void {
		this.translocoService.setActiveLang(this.selectedLanguage);
		this.settingsService.setLanguage(this.selectedLanguage).subscribe();
	}

	public setTimeFormat(): void {
		this.settingsService.setTimeFormat(this.selectedTimeFormat).subscribe();
	}

	public setPainScale(): void {
		this.settingsService.setPainScale(this.selectedPainScale).subscribe();
	}

	public setHideDeveloperUpdates(): void {
		this.settingsService.setHideDeveloperUpdates(this.hideDeveloperUpdates).subscribe();
	}

	public setShowDeveloperMode(): void {
		this.settingsService.setShowDeveloperMode(this.showDeveloperMode).subscribe();
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
			this.snackBar.open(this.translocoService.translate('DATA_IMPORT_SNACKBAR_SUCCESS'),
				this.translocoService.translate('CLOSE'),
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
			this.snackBar.open(this.translocoService.translate('DATA_IMPORT_SNACKBAR_SUCCESS'),
				this.translocoService.translate('CLOSE'),
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
		this.dialog.open(DialogExportConfirmComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox'
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.importerExporterService.exportData();
			this.debug = this.importerExporterService.debug;
			this.snackBar.open(this.translocoService.translate('DATA_EXPORT_SNACKBAR_SUCCESS'),
				this.translocoService.translate('CLOSE'),
				{ duration: 2000 });
		});
	}

	public generateBackupData(): void {
		this.backupService.getBackup().subscribe(backup => {
			backup = this.importerExporterService.cleanBackupData(backup);
			this.backupData = JSON.stringify(backup);
			this.generateData = true;
		});
	}

	public copyToClipboard(): void {
		this.jsonBackupTextArea.nativeElement.hidden = false;
		this.jsonBackupTextArea.nativeElement.select();
		document.execCommand('copy');
		this.showCopySuccessMessage = true;
		setTimeout(() => {
			this.showCopySuccessMessage = false;
		}, 2000);
	}

	public exportHtml(): void {
		this.importerExporterService.exportHtml();
	}

	public showManualBackupDiv() {
		const div: HTMLInputElement = document.getElementById('manual-backup-div') as HTMLInputElement;
		div.style.display = "block"; 
	}

	public getWindowLocationOrigin() {
		return window.location.origin;
	}
}
