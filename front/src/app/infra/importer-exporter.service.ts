import { Injectable } from '@angular/core';
import { DaysService } from './days.service';
import { IDay } from '../models';
import { getDateFromString, getDetailedDate, getFormattedDate } from 'src/app/util/date.utils';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { File as IonicFile } from '@ionic-native/file/ngx';
import { saveAs } from 'file-saver';
import { BackupService } from './backup.service';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';

@Injectable({
	providedIn: 'root'
})
export class ImporterExporterService {

	private readonly EXTERNAL_ROOT_DIRECTORY = this.file.externalRootDirectory;
	private readonly APP_DIRECTORY = 'life-notes/';
	private readonly APP_DIRECTORY_FULL_PATH = this.EXTERNAL_ROOT_DIRECTORY + this.APP_DIRECTORY;
	private readonly BACKUP_FILE = getFormattedDate(new Date()) + '.lifenotesbackup';
	private readonly CREATE_ERROR_FILE = 'create-file-error.txt';

	constructor(
		private daysService: DaysService,
		private symptomsService: SymptomsService,
		private settingsService: SettingsService,
		private backupService: BackupService,
		private file: IonicFile
	) { }

	public importData(event: any): Observable<null> {
		const selectedFile = event.target.files[0];
		const reader = new FileReader();

		reader.onload = (readerLoadEvent: any) => {
			const fileContent = readerLoadEvent.target.result;

			const backupJsonObj = JSON.parse(fileContent);
			const daysJsonArr = backupJsonObj.days;
			const symptomsJsonArr = backupJsonObj.symptoms;
			const settingsJsonOnj = backupJsonObj.settings;

			daysJsonArr.map(day => day.detailedDate = getDetailedDate(getDateFromString(day.date)));
			this.daysService.addDays(daysJsonArr);
			this.symptomsService.addSymptoms(symptomsJsonArr);
			this.settingsService.setLanguage(settingsJsonOnj.language);
			this.settingsService.setTargetSymptomKey(settingsJsonOnj.targetSymptomKey);
		};

		return this.daysService.reset().pipe(
			tap(() => {
				reader.readAsText(selectedFile);
			}),
			map(() => null)
		);
	}

	public exportData(): void {
		this.backupService.getBackup().subscribe(backup => {
			backup.days.map(day => {
				delete day['_rev'];
				delete day['detailedDate'];
			});
			backup.symptoms.map(symptom => {
				delete symptom['_rev'];
			});
			delete backup.settings['_rev'];

			const jsonBackup = JSON.stringify(backup);

			const file = new File([jsonBackup], 'calendar.json', { type: 'application/json;charset=utf-8' });
			saveAs(file);
		})
	}

	private saveBackup(backup: string): void {
		this.file.createFile(this.APP_DIRECTORY_FULL_PATH, this.BACKUP_FILE, true)
			.then(() => this.file.writeExistingFile(this.APP_DIRECTORY_FULL_PATH, this.BACKUP_FILE, backup))
			.catch(
				error => {
					this.file.createFile(this.EXTERNAL_ROOT_DIRECTORY, this.CREATE_ERROR_FILE, true)
						.then(() => this.file.writeExistingFile(this.EXTERNAL_ROOT_DIRECTORY, this.CREATE_ERROR_FILE, error))
				})
	}

	public exportHtml(): void {
	}

}
