import { Injectable } from '@angular/core';
import { DaysService } from './days.service';
import { getDetailedDate } from 'src/app/util/date.utils';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import FileSaver from './file-saver-plugin';
import { BackupService } from './backup.service';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';
import { IBackup } from '../models/backup.model';
import { GlobalService } from './global.service';
import { TranslocoService } from '@ngneat/transloco';
import * as moment from 'moment';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
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

	public shareBackup(): void {
		this.backupService.getBackup().subscribe(async backup => {
			backup = this.cleanBackupData(backup);
			const jsonBackup = JSON.stringify(backup);

			if (this.emptyBackup(backup)) {
				return;
			}

			const fileName = this.generateBackupFileName();

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
					dialogTitle: 'Share Backup'
				});
			} catch (error) {
				this.debug += 'SHARE ERROR: ' + error;
			}
		});
	}

	public saveBackup(): Promise<string> {
		return new Promise((resolve, reject) => {
			this.backupService.getBackup().subscribe(async backup => {
				backup = this.cleanBackupData(backup);
				const jsonBackup = JSON.stringify(backup);

				if (this.emptyBackup(backup)) {
					reject('Empty backup');
					return;
				}

				const fileName = this.generateBackupFileName();

				if (Capacitor.isNativePlatform()) {
					try {
						const base64 = btoa(unescape(encodeURIComponent(jsonBackup)));
						const result = await FileSaver.saveFile({
							base64Data: base64,
							filename: fileName,
							contentType: 'application/json'
						});
						resolve(result.uri);
					} catch (error) {
						reject(error);
					}
				} else {
					const blob = new Blob([jsonBackup], { type: 'application/json' });
					saveAs(blob, fileName);
					resolve('download');
				}
			});
		});
	}

	private generateBackupFileName(): string {
		const now = new Date();
		const yyyy = now.getFullYear();
		const mm = String(now.getMonth() + 1).padStart(2, "0");
		const dd = String(now.getDate()).padStart(2, "0");
		const hh = String(now.getHours()).padStart(2, "0");
		const min = String(now.getMinutes()).padStart(2, "0");

		return `life-notes-save-${yyyy}${mm}${dd}${hh}${min}.json`;
	}

	private emptyBackup(backup: IBackup): boolean {
		return backup.days.length === 0;
	}

	public async htmltoPDF(element: HTMLElement, fileName: string = 'LifeNotes_Report.pdf', action: 'save' | 'share' = 'save'): Promise<void> {
		let clone: HTMLElement | null = null;
		try {
			// Manual Cloning Strategy
			clone = element.cloneNode(true) as HTMLElement;

			// Setup Container for Clone
			clone.style.width = '800px'; // Fixed width
			clone.style.position = 'absolute';
			clone.style.top = '0';
			clone.style.left = '0';
			clone.style.zIndex = '-9999'; // Hide behind
			clone.style.background = 'white';
			clone.style.height = 'auto';
			clone.style.overflow = 'visible';

			// Fix specific child elements in the clone
			const contentElement = clone.querySelector('.content') as HTMLElement;
			if (contentElement) {
				contentElement.style.height = 'auto';
				contentElement.style.overflow = 'visible';
				contentElement.style.position = 'static';
				contentElement.style.marginTop = '2rem';   // Space between header and first symptom
			}

			const calendarHeader = clone.querySelector('.calendar-header') as HTMLElement;
			if (calendarHeader) {
				calendarHeader.style.position = 'static';
				calendarHeader.style.height = '3.5rem';
				calendarHeader.style.width = '100%';
			}

			const calendarContainer = clone.id === 'calendar-container' ? clone : clone.querySelector('#calendar-container') as HTMLElement;
			if (calendarContainer) {
				calendarContainer.style.height = 'auto';
				calendarContainer.style.overflow = 'visible';
				calendarContainer.style.position = 'relative';
			}

			// Spacing for every 4th symptom to avoid cut on page break
			const symptomContainers = clone.querySelectorAll('.sympmtom-container');
			if (symptomContainers) {
				symptomContainers.forEach((container, index) => {
					if ((index + 1) % 4 === 0) {
						(container as HTMLElement).style.marginBottom = '6rem';
					}
				});
			}

			// Copy Canvas Content (Pie Charts)
			const originalCanvases = element.querySelectorAll('canvas');
			const clonedCanvases = clone.querySelectorAll('canvas');
			originalCanvases.forEach((orig, index) => {
				if (clonedCanvases[index]) {
					const ctx = clonedCanvases[index].getContext('2d');
					if (ctx) {
						ctx.drawImage(orig, 0, 0);
					}
				}
			});

			document.body.appendChild(clone);

			// Wait a tick for rendering
			await new Promise(resolve => setTimeout(resolve, 200));

			const canvas = await html2canvas(clone, {
				scale: 2,
				useCORS: true,
				logging: false, // Turn off logging if fixed
				allowTaint: true,
				scrollY: 0,
				windowWidth: 800
			});

			const imgData = canvas.toDataURL('image/jpeg', 0.95);
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			if (canvas.width === 0 || canvas.height === 0) {
				throw new Error(`Canvas has 0 dimensions: ${canvas.width}x${canvas.height}`);
			}

			const imgHeight = (canvas.height * pdfWidth) / canvas.width;

			let heightLeft = imgHeight;
			let position = 0;

			pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
			heightLeft -= pdfHeight;

			while (heightLeft > 0) {
				position = position - pdfHeight;
				pdf.addPage();
				pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
				heightLeft -= pdfHeight;
			}

			// Web: Download
			if (!Capacitor.isNativePlatform()) {
				pdf.save(fileName);
			} else {
				// Native: Save or Share
				console.log('PDF Export Action:', action);
				console.log('Is Native:', Capacitor.isNativePlatform());

				const pdfOutput = pdf.output('datauristring');
				const base64Data = pdfOutput.split(',')[1];

				try {
					// 1. Write to temp file in cache (needed for both operations)
					const tempFileName = `temp_${fileName}`;
					const writeResult = await Filesystem.writeFile({
						path: tempFileName,
						data: base64Data,
						directory: Directory.Cache
					});

					if (action === 'save') {
						// 2a. Pass path to FileSaver
						await FileSaver.saveFile({
							path: writeResult.uri,
							filename: fileName,
							contentType: 'application/pdf'
						});

						// 3. Clean up temp file
						await Filesystem.deleteFile({
							path: tempFileName,
							directory: Directory.Cache
						});
					} else {
						// 2b. Share the temp file
						await Share.share({
							title: 'Life Notes Report',
							url: writeResult.uri,
							dialogTitle: 'Share PDF'
						});
						// Do NOT delete immediately as share intent might need it
					}

					// Optional: Toast or feedback?
				} catch (error) {
					console.error("Export Error", error);
					throw error;
				}
			}

		} catch (error) {
			this.debug += ' PDF Export Error: ' + JSON.stringify(error);
			console.error('PDF Export Error', error);
			throw error;
		} finally {
			if (clone && document.body.contains(clone)) {
				document.body.removeChild(clone);
			}
		}
	}

	public exportHtml(): void {
	}
}
