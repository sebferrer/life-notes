import { Injectable } from '@angular/core';
import { DaysService } from './days.service';
import { getDetailedDate } from 'src/app/util/date.utils';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { File as IonicFile } from '@ionic-native/file/ngx';
import { BackupService } from './backup.service';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';
import { IBackup } from '../models/backup.model';
import { GlobalService } from './global.service';
import { TranslocoService } from '@ngneat/transloco';
import * as moment from 'moment';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
	providedIn: 'root'
})
export class ImporterExporterService {

	private readonly APP_DIRECTORY = 'Download/life-notes/';
	private readonly BACKUP_FILE = 'backup.json';
	private readonly AUTO_BACKUP_FILE = 'autobackup.json';
	private readonly MAX_SAVE_TRIES = 3;

	private nbSaveRetries = 0;

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

	private getExternalApplicationStorageDirectory(): string {
		return this.file.externalDataDirectory;
	}

	private getDocumentsDirectoryFullPath(): string {
		return this.file.externalRootDirectory;
	}

	private getBackupFile(isAuto: boolean): Observable<string> {
		const fileName = isAuto ? this.AUTO_BACKUP_FILE : this.BACKUP_FILE;
		return this.settingsService.getSettings().pipe(
			map(settings => fileName.replace('.json', settings.lastInstall + '.json'))
		);
	}

	public loadContent(content: string): void {
		const backupJsonObj = JSON.parse(content);
		const daysJsonArr = backupJsonObj.days;
		const symptomsJsonArr = backupJsonObj.symptoms;
		const settingsJsonOnj = backupJsonObj.settings;

		daysJsonArr.map(day => day.detailedDate = getDetailedDate(moment(day.date).format('YYYY-MM-DD')));
		this.daysService.addDays(daysJsonArr).subscribe(() => { });
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

			if (fileContent == null || fileContent == '') {
				this.debug += 'IMPORT DATA NATIVE MANUAL --> Wrong data format';
				return of(null)
			}

			this.daysService.reset().subscribe(
				() => {
					this.loadContent(fileContent);
				},
				error => {
					this.debug += 'IMPORT DATA MANUAL' + error + ' --> ' + error.message;
					return of(null);
				}
			);
		};

		reader.readAsText(selectedFile);

		return of(null);
	}

	public importDataNative(isAuto?: boolean): Observable<null> {
		isAuto = isAuto || false;
		const fileName = isAuto ? this.AUTO_BACKUP_FILE : this.BACKUP_FILE;

		this.file.readAsText(this.getExternalApplicationStorageDirectory(), fileName).then(
			fileContent => {

				if (fileContent == null || fileContent == '') {
					this.debug += 'IMPORT DATA NATIVE ERROR --> Wrong data format';
					return of(null)
				}

				this.daysService.reset().subscribe(
					() => {
						this.loadContent(fileContent);
					},
					error => {
						this.debug += 'IMPORT DATA NATIVE ERROR --> Reset error -->' + error + ' --> ' + error.message + ' ---- ' + this.getExternalApplicationStorageDirectory() + fileName;
					}
				);

			})
			.catch((error) => {
				this.debug += 'IMPORT DATA NATIVE ERROR --> Read error --> ' + error + ' --> ' + error.message + ' ---- ' + this.getExternalApplicationStorageDirectory() + fileName;
			})

		return of(null)
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

			this.saveBackup(jsonBackup, isAuto);
		})
	}

	private emptyBackup(backup: IBackup): boolean {
		return backup.days.length === 0;
	}

	private saveBackup(jsonBackup: string, isAuto?: boolean): void {
		isAuto = isAuto || false;
		const fileName = isAuto ? this.AUTO_BACKUP_FILE : this.BACKUP_FILE;

		this.saveBackupToDirectoryOrCreateDirectory(jsonBackup, this.getExternalApplicationStorageDirectory(), '', fileName);

		this.getBackupFile(isAuto).subscribe(
			lastBackupFileName => {
				this.saveBackupToDirectoryOrCreateDirectory(jsonBackup, this.getDocumentsDirectoryFullPath(), this.APP_DIRECTORY, lastBackupFileName);
			}
		);
	}

	private saveBackupToDirectoryOrCreateDirectory(jsonBackup: string, directoryPath: string, filesDirectory: string, fileName: string): void {

		if (filesDirectory != '') {
			this.file.checkDir(directoryPath, filesDirectory).then(
				() => {
					this.saveBackupToDirectory(jsonBackup, directoryPath + filesDirectory, fileName)
				})
				.catch((checkError) => {
					this.debug += 'checkDir => ' + directoryPath + filesDirectory + ' not exists: ' + checkError + ' --> ' + checkError.message;
					this.file.createDir(directoryPath, filesDirectory, false)
						.then(
							() =>
								this.saveBackupToDirectory(jsonBackup, directoryPath + filesDirectory, fileName)
						)
						.catch(
							createError => {
								this.debug += '\ncreateDir => ' + createError + ' --> ' + createError.message + ' ---- ' + directoryPath + filesDirectory;
							})
				})
		} else {
			this.saveBackupToDirectory(jsonBackup, directoryPath + filesDirectory, fileName)
		}
	}

	private saveBackupToDirectory(jsonBackup: string, directoryFullPath: string, fileName: string): void {
		this.file.createFile(directoryFullPath, fileName, true)
			.then(() => this.file.writeExistingFile(directoryFullPath, fileName, jsonBackup)
				.catch(
					error => {
						this.debug += 'writeExistingFile => ' + error + ' --> ' + error.message + + ' ---- ' + directoryFullPath;
						this.retrySaveBackupToDirectory(jsonBackup, directoryFullPath, fileName);
					})
			)
			.catch(
				error => {
					this.debug += 'createFile => ' + error + ' --> ' + error.message + + ' ---- ' + directoryFullPath;
				})
	}

	private retrySaveBackupToDirectory(jsonBackup: string, directoryFullPath: string, fileName: string) {
		if (this.nbSaveRetries > this.MAX_SAVE_TRIES) {
			return;
		}
		this.settingsService.updateLastInstall().subscribe(
			settings => {
				this.saveBackupToDirectory(jsonBackup, directoryFullPath, fileName.replace('.json', settings.lastInstall + '.json'));
			}
		).add(() => {
			this.nbSaveRetries++;
		});
	}

	public htmltoPDF(body: any) {
		// parentdiv is the html element which has to be converted to PDF
		html2canvas(body, {
			height: 300 * 2,
			windowHeight: 300 * 2
		}).then(canvas => {
			console.log(canvas.height + '-' + canvas.width);
			let pdf = new jspdf('p', 'pt', [canvas.width, canvas.height]);

			let imgData = canvas.toDataURL("image/png", 1.0);
			pdf.addImage(imgData, 0, 0, canvas.width, canvas.height);
			// pdf.save('converteddoc.pdf');

			let pdfOutput = pdf.output();

			let buffer = new ArrayBuffer(pdfOutput.length);

			let array = new Uint8Array(buffer);

			for (var i = 0; i < pdfOutput.length; i++) {
				array[i] = pdfOutput.charCodeAt(i);
			}

			// const directory = this.file.externalApplicationStorageDirectory;
			const directory = this.file.externalRootDirectory + 'life-notes/';

			const fileName = "Test.pdf";

			this.file.writeFile(directory, fileName, buffer)
				.then((success) => this.debug += "File created Succesfully" + JSON.stringify(success))
				.catch((error) => this.debug += "Cannot Create File " + JSON.stringify(error));
		});
	}

	public exportHtml(): void {
	}
}
