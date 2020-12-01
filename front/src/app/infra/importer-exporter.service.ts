import { Injectable } from '@angular/core';
import { DaysService } from './days.service';
import { IDay } from '../models';
import { getDateFromString, getDetailedDate, getFormattedDate } from 'src/app/util/date.utils';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { File as IonicFile } from '@ionic-native/file/ngx';

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
		private file: IonicFile
	) { }

	public importData(event: any): Observable<null> {
		const selectedFile = event.target.files[0];
		const reader = new FileReader();

		reader.onload = (readerLoadEvent: any) => {
			const fileContent = readerLoadEvent.target.result;
			const jsonArr = JSON.parse(fileContent);
			for (const jsonObj of jsonArr) {
				const day: IDay = jsonObj;
				day.detailedDate = getDetailedDate(getDateFromString(day.date));
				this.daysService.addDay(day);
			}
		};

		return this.daysService.reset().pipe(
			tap(() => {
				reader.readAsText(selectedFile);
			}),
			map(() => null)
		);
	}

	public exportData(): void {
		this.daysService.getDays().subscribe(days => {
			const fileContent = JSON.stringify(days);
			const newDays: IDay[] = JSON.parse(fileContent);
			newDays.map(day => {
				delete day['_rev'];
				delete day['detailedDate'];
			});
			const jsonBackup = JSON.stringify(newDays);
			// const file = new File([JSON.stringify(newDays)], 'calendar.json', { type: 'application/json;charset=utf-8' });
			// saveAs(file);

			this.file.checkDir(this.EXTERNAL_ROOT_DIRECTORY, this.APP_DIRECTORY).then(
				() => {
					this.saveBackup(jsonBackup)
				})
				.catch(() => {
					this.file.createDir(this.EXTERNAL_ROOT_DIRECTORY, this.APP_DIRECTORY, false)
						.then(() => this.saveBackup(jsonBackup))
				})
		});
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
