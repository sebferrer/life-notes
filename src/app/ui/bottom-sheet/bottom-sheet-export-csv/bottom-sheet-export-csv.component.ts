import { Component, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { TranslocoService } from '@ngneat/transloco';
import { CsvExportService } from 'src/app/infra/csv-export.service';
import { CsvLayout, ICsvData, getCsvDays } from 'src/app/models/csv-export.model';

interface ICsvLayoutChoice {
	layout: CsvLayout;
	icon: string;
	title: string;
	text: string;
}

// The entries as a CSV file for a spreadsheet: one line per day (charts) or per entry (details), then saved or shared
@Component({
	selector: 'app-bottom-sheet-export-csv',
	templateUrl: 'bottom-sheet-export-csv.component.html',
	styleUrls: ['bottom-sheet-export-csv.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class BottomSheetExportCsvComponent {

	public readonly choices: ICsvLayoutChoice[] = [
		{ layout: 'days', icon: 'calendar_view_day', title: 'EXPORT_CSV_DAYS_TITLE', text: 'EXPORT_CSV_DAYS_TEXT' },
		{ layout: 'events', icon: 'format_list_bulleted', title: 'EXPORT_CSV_EVENTS_TITLE', text: 'EXPORT_CSV_EVENTS_TEXT' }
	];
	public selected: CsvLayout = 'days';
	// Read once the sheet opens; null until then
	public data: ICsvData = null;
	public empty = false;
	public busy = false;
	// The layouts saved since the sheet was opened (their button shows it)
	public saved = new Set<CsvLayout>();
	public errorKey: string = null;

	constructor(
		private bottomSheetRef: MatBottomSheetRef<BottomSheetExportCsvComponent>,
		private csvExportService: CsvExportService,
		private translocoService: TranslocoService
	) {
		this.csvExportService.getData().subscribe(data => {
			this.data = data;
			this.empty = getCsvDays(data.days).length === 0;
		}, () => this.errorKey = 'EXPORT_CSV_ERROR');
	}

	public get ready(): boolean {
		return this.data != null && !this.empty && !this.busy;
	}

	public choose(layout: CsvLayout): void {
		this.selected = layout;
		this.errorKey = null;
	}

	public onCloseClick(): void {
		this.bottomSheetRef.dismiss();
	}

	// Done once an app was chosen in the share sheet
	public async onShareClick(): Promise<void> {
		await this.run(async file => {
			if (await this.csvExportService.share(file, this.translocoService.translate('EXPORT_CSV'))) {
				this.bottomSheetRef.dismiss();
			}
		});
	}

	public async onSaveClick(): Promise<void> {
		const layout = this.selected;
		await this.run(async file => {
			if (await this.csvExportService.save(file)) {
				this.saved.add(layout);
			}
		});
	}

	private async run(action: (file: { fileName: string, content: string }) => Promise<void>): Promise<void> {
		if (!this.ready) {
			return;
		}
		this.busy = true;
		this.errorKey = null;
		try {
			await action(this.csvExportService.build(this.selected, this.data));
		} catch (error) {
			console.warn('CSV export', error);
			this.errorKey = 'EXPORT_CSV_ERROR';
		} finally {
			this.busy = false;
		}
	}
}
