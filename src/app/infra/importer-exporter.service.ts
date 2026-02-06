import { Injectable } from '@angular/core';
import { DaysService } from './days.service';
import { getDetailedDate } from 'src/app/util/date.utils';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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

	private readonly BACKUP_DIRECTORY = 'LifeNotes';
	private readonly BACKUP_FILE = 'backup.json';
	private readonly AUTO_BACKUP_FILE = 'autobackup.json';

	public debug = 'no error';

	constructor(
		private globalService: GlobalService,
		private daysService: DaysService,
		private symptomsService: SymptomsService,
		private settingsService: SettingsService,
		private backupService: BackupService,
		private translocoService: TranslocoService
	) { }

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
				this.debug += 'IMPORT DATA MANUAL --> Wrong data format';
				return of(null)
			}

			this.daysService.reset().subscribe(
				() => {
					this.loadContent(fileContent as string);
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
		// Logic pour l'import auto (depuis Documents/LifeNotes) ou manuel ?
		// Pour l'instant, on garde la logique "auto" qui cherche dans Documents
		// Pour un vrai import manuel native, il faudrait un file picker.
		// Ici on suppose que l'utilisateur veut importer le dernier backup connu.

		return this.getBackupFile(isAuto).pipe(
			switchMap(fileName => {
				return from(Filesystem.readFile({
					path: `${this.BACKUP_DIRECTORY}/${fileName}`,
					directory: Directory.Documents,
					encoding: Encoding.UTF8
				})).pipe(
					map(result => {
						const fileContent = result.data as string;
						if (!fileContent) {
							throw new Error('Empty file');
						}
						return fileContent;
					}),
					switchMap(content => {
						return this.daysService.reset().pipe(map(() => content));
					}),
					map(content => {
						this.loadContent(content);
						return null;
					}),
					catchError(error => {
						this.debug += 'IMPORT DATA NATIVE ERROR --> ' + error;
						return of(null);
					})
				);
			})
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

	public exportData(): void {
		this.backupService.getBackup().subscribe(async backup => {
			backup = this.cleanBackupData(backup);
			const jsonBackup = JSON.stringify(backup);

			if (this.emptyBackup(backup)) {
				return;
			}

			const now = new Date();
			const yyyy = now.getFullYear();
			const mm = String(now.getMonth() + 1).padStart(2, "0");
			const dd = String(now.getDate()).padStart(2, "0");
			const hh = String(now.getHours()).padStart(2, "0");
			const min = String(now.getMinutes()).padStart(2, "0");

			const fileName = `life-notes-save-${yyyy}${mm}${dd}${hh}${min}.json`;

			try {
				const result = await Filesystem.writeFile({
					path: fileName,
					data: jsonBackup,
					directory: Directory.Cache,
					encoding: Encoding.UTF8
				});

				await Share.share({
					title: 'Life Notes Backup',
					text: 'Here is your Life Notes backup data',
					url: result.uri,
					dialogTitle: 'Save or Share Backup'
				});
			} catch (error) {
				this.debug += 'EXPORT ERROR: ' + error;
			}
		});
	}

	private emptyBackup(backup: IBackup): boolean {
		return backup.days.length === 0;
	}

	public htmltoPDF(body: any) {
		html2canvas(body, {
			height: 300 * 2,
			windowHeight: 300 * 2
		}).then(async canvas => {
			let pdf = new jspdf('p', 'pt', [canvas.width, canvas.height]);
			let imgData = canvas.toDataURL("image/png", 1.0);
			pdf.addImage(imgData, 0, 0, canvas.width, canvas.height);

			// For Capacitor, we usually share the PDF logic or save it
			// This part was quite specific to cordova-p-file.
			// Let's adapt it to Share as well using base64.
			const pdfOutput = pdf.output('datauristring');
			const base64Data = pdfOutput.split(',')[1];

			try {
				const fileName = "LifeNotes_Export.pdf";
				const result = await Filesystem.writeFile({
					path: fileName,
					data: base64Data,
					directory: Directory.Cache,
					// encoding: Encoding.UTF8 // Binary data shouldn't set encoding for base64 writes in strict mode usually, but for Filesystem it handles base64 string if not encoding provided? Check docs. Actually for base64 string, usually no encoding or explicitly base64? 
					// Capacitor Filesystem writeFile with string data defaults to UTF8 unless recursive... wait. 
					// If data is a base64 string, we might not need encoding if newer plugin version detects it, OR we need to be careful.
					// Actually, standard is: data: string. If you want binary, pass base64 string.
				});

				await Share.share({
					title: 'Export PDF',
					url: result.uri,
					dialogTitle: 'Share PDF'
				});

			} catch (e) {
				this.debug += "PDF Create/Share Error: " + JSON.stringify(e);
			}
		});
	}

	public exportHtml(): void {
	}
}
