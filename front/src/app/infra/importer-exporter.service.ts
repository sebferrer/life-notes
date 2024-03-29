import { Injectable } from '@angular/core';
import { DaysService } from './days.service';
import { getDateFromString, getDetailedDate } from 'src/app/util/date.utils';
import { Observable, from, empty, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { File as IonicFile } from '@ionic-native/file/ngx';
import { saveAs } from 'file-saver';
import { BackupService } from './backup.service';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';
import { IBackup } from '../models/backup.model';
import { GlobalService } from './global.service';
import { TranslocoService } from '@ngneat/transloco';
import * as moment from 'moment';

@Injectable({
	providedIn: 'root'
})
export class ImporterExporterService {

	private readonly APP_DIRECTORY = 'life-notes/';
	private readonly BACKUP_FILE = 'backup.json';
	private readonly AUTO_BACKUP_FILE = 'autobackup.json';

	public debug = 'no error';

	constructor(
		private globalService: GlobalService,
		private daysService: DaysService,
		private symptomsService: SymptomsService,
		private settingsService: SettingsService,
		private backupService: BackupService,
		private translocoService: TranslocoService,
		private file: IonicFile
	) { }

	private getDirectoryFullPath(): string {
		return this.file.externalRootDirectory + this.APP_DIRECTORY;
	}

	public loadContent(content: string): void {
		const backupJsonObj = JSON.parse(content);
		const daysJsonArr = backupJsonObj.days;
		const symptomsJsonArr = backupJsonObj.symptoms;
		const settingsJsonOnj = backupJsonObj.settings;

		daysJsonArr.map(day => day.detailedDate = getDetailedDate(moment(day.date).format('YYYY-MM-DD')));
		this.daysService.addDays(daysJsonArr).subscribe(() => {});
		this.symptomsService.addSymptoms(symptomsJsonArr).subscribe(() => {
			this.globalService.loadSymptoms().subscribe(() => { });
		});
		this.settingsService.editSettings(settingsJsonOnj).subscribe(() => {
			this.globalService.language = settingsJsonOnj.language;
			this.globalService.targetSymptomKey = settingsJsonOnj.targetSymptomKey;
			this.translocoService.setActiveLang(settingsJsonOnj.language);
		});
	}

	public importDataWeb(event: any): Observable<null> {
		const selectedFile = event.target.files[0];
		const reader = new FileReader();

		reader.onload = (readerLoadEvent: any) => {
			const fileContent = readerLoadEvent.target.result;
			this.loadContent(fileContent);
		};

		return this.daysService.reset().pipe(
			tap(() => {
				reader.readAsText(selectedFile);
			}),
			catchError(error => {
				this.debug = error + ' --> ' + error.message;
				return null;
			}),
			map(() => null)
		);
	}

	public importDataNative(isAuto?: boolean): Observable<null> {
		isAuto = isAuto || false;
		const fileName = isAuto ? this.AUTO_BACKUP_FILE : this.BACKUP_FILE;

		return this.daysService.reset().pipe(
			tap(() => {
				this.file.readAsText(this.getDirectoryFullPath(), fileName).then(
					fileContent => {
						this.debug = 'fileContent --> ' + fileContent;
						this.loadContent(fileContent);
					})
					.catch((error) => {
						this.debug = error + ' --> ' + error.message;
					})
			}),
			map(() => null)
		);
	}

	public cleanBackupData(backup: IBackup): IBackup {
		backup.days.map(day => {
			delete day['_rev'];
			delete day['detailedDate'];
		});
		backup.symptoms.map(symptom => {
			delete symptom['_rev'];
		});
		delete backup.settings['_rev'];

		return backup;
	}

	public exportData(isAuto?: boolean): void {
		isAuto = isAuto || false;
		this.backupService.getBackup().subscribe(backup => {
			backup = this.cleanBackupData(backup);
			const jsonBackup = JSON.stringify(backup);

			// const file = new File([jsonBackup], 'calendar.json', { type: 'application/json;charset=utf-8' });
			// saveAs(file);

			if (this.emptyBackup(backup)) {
				return;
			}

			this.file.checkDir(this.file.externalRootDirectory, this.APP_DIRECTORY).then(
				() => {
					this.saveBackup(jsonBackup, isAuto)
				})
				.catch((checkError) => {
					this.debug = 'checkDir => ' + this.file.externalRootDirectory + this.APP_DIRECTORY + ' not exists: ' + checkError + ' --> ' + checkError.message;
					this.file.createDir(this.file.externalRootDirectory, this.APP_DIRECTORY, false)
						.then(() => this.saveBackup(jsonBackup, isAuto))
						.catch(createError => { this.debug += '\ncreateDir => ' + createError + ' --> ' + createError.message; })
				})
		})
	}

	private emptyBackup(backup: IBackup): boolean {
		return backup.days.length === 0;
	}

	private saveBackup(backup: string, isAuto?: boolean): void {
		isAuto = isAuto || false;
		const fileName = isAuto ? this.AUTO_BACKUP_FILE : this.BACKUP_FILE;
		this.file.createFile(this.getDirectoryFullPath(), fileName, true)
			.then(() => this.file.writeExistingFile(this.getDirectoryFullPath(), fileName, backup))
			.catch(
				error => {
					this.debug = 'createFile => ' + error + ' --> ' + error.message;
				})
	}

	public exportHtml(): void {
	}

}
