import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { TranslocoService } from '@ngneat/transloco';
import { saveAs } from 'file-saver';
import FileSaver from './file-saver-plugin';
import { BackupService } from './backup.service';
import { GlobalService } from './global.service';
import { CsvLayout, ICsvData, buildCsv, getCsvFileName } from '../models/csv-export.model';
import { getLanguageLocale } from '../models/language.model';

const CSV_TYPE = 'text/csv';

// The entries as a CSV file for a spreadsheet (see csv-export.model.ts), saved or shared as the backups
@Injectable({
	providedIn: 'root'
})
export class CsvExportService {

	constructor(
		private backupService: BackupService,
		private globalService: GlobalService,
		private translocoService: TranslocoService
	) { }

	// Every day, symptom and type of the user (the same reading as a backup)
	public getData(): Observable<ICsvData> {
		return this.backupService.getBackup().pipe(
			map(backup => ({ days: backup.days, symptoms: backup.symptoms, customTypes: backup.customTypes || [] }))
		);
	}

	// In the language and on the intensity scale of the app
	public build(layout: CsvLayout, data: ICsvData): { fileName: string, content: string } {
		const content = buildCsv(layout, data, {
			painScale: this.globalService.painScale,
			locale: getLanguageLocale(this.translocoService.getActiveLang()),
			translate: (key, params) => this.translocoService.translate(key, params)
		});
		return { fileName: getCsvFileName(layout, new Date()), content };
	}

	// Android: the "Save as" of the system, where the user chooses the folder, from a copy in the cache. Web: download.
	// False when the "Save as" was left without saving.
	public async save(file: { fileName: string, content: string }): Promise<boolean> {
		if (Capacitor.isNativePlatform()) {
			const uri = await this.writeInCache(file);
			return this.unlessCancelled(() => FileSaver.saveFile({ path: uri, filename: file.fileName, contentType: CSV_TYPE }));
		}
		saveAs(this.toBlob(file), file.fileName);
		return true;
	}

	// Android: the share sheet (mail, messaging, Drive...). Web: share sheet of the browser when it can share files,
	// download otherwise. False when the share sheet was left without choosing an app.
	public async share(file: { fileName: string, content: string }, title: string): Promise<boolean> {
		if (Capacitor.isNativePlatform()) {
			const uri = await this.writeInCache(file);
			return this.unlessCancelled(() => Share.share({ title, files: [uri], dialogTitle: title }));
		}
		const nav = navigator as any;
		const shared = new File([this.toBlob(file)], file.fileName, { type: CSV_TYPE });
		if (nav.canShare && nav.canShare({ files: [shared] })) {
			try {
				await nav.share({ files: [shared], title });
			} catch (error) {
				if (error?.name === 'AbortError') {
					return false;
				}
				throw error;
			}
			return true;
		}
		saveAs(this.toBlob(file), file.fileName);
		return true;
	}

	private toBlob(file: { content: string }): Blob {
		return new Blob([file.content], { type: CSV_TYPE + ';charset=utf-8' });
	}

	private async writeInCache(file: { fileName: string, content: string }): Promise<string> {
		const written = await Filesystem.writeFile({
			path: file.fileName,
			data: file.content,
			directory: Directory.Cache,
			encoding: Encoding.UTF8
		});
		return written.uri;
	}

	// True once done, false when the user left the window of the system ("Share canceled", "User cancelled")
	private async unlessCancelled(action: () => Promise<any>): Promise<boolean> {
		try {
			await action();
		} catch (error) {
			if (/cancel/i.test(error?.message || '')) {
				return false;
			}
			throw error;
		}
		return true;
	}
}
