import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../infra';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IMedHistory } from 'src/app/models/med.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { LogsService } from 'src/app/infra/logs.service';
import { DialogConfirmComponent } from '../dialog/dialog-confirm';

import { getSortOrder } from 'src/app/util/array.utils';
import { LogHistoryViewModel } from 'src/app/models/log-history.view.model';
import { DialogOccurrenceHistoryComponent } from '../dialog/dialog-occurrence-history';
import { BottomSheetEditLogComponent } from '../bottom-sheet/bottom-sheet-edit-log';
import { BottomSheetDeleteOverviewComponent } from '../bottom-sheet/bottom-sheet-delete-overview';

@Component({
	selector: 'app-logs',
	templateUrl: './logs.component.html',
	styleUrls: ['./logs.component.scss']
})
export class LogsComponent implements OnInit {

	public logs: LogHistoryViewModel[];
	public logs$: BehaviorSubject<LogHistoryViewModel[]>;

	public displayedColumns: string[] = ['key', 'occurrences', 'actions'];
	public dataSource: IMedHistory[];

	constructor(
		private translocoService: TranslocoService,
		private globalService: GlobalService,
		private settingsService: SettingsService,
		private logsService: LogsService,
		private dialog: MatDialog,
		private bottomSheet: MatBottomSheet,
		private snackBar: MatSnackBar
	) {
		this.logs = new Array<LogHistoryViewModel>();
		this.logs$ = new BehaviorSubject<LogHistoryViewModel[]>(new Array<LogHistoryViewModel>());
	}

	public ngOnInit(): void {
		this.logsService.getLogs().subscribe(
			logs => {
				logs.forEach(log => {
					this.logs.push(new LogHistoryViewModel(log));
				});
				this.logs$.next(this.logs.sort(getSortOrder("lastEntry", true)));
			});
	}

	public toggleEditable(meds: LogHistoryViewModel[], med: LogHistoryViewModel): void {
		for (const s of meds) {
			if (s.key !== med.key) {
				s.editable = false;
			}
		}
		med.editable = !med.editable;
	}

	public openEditDialog(log: LogHistoryViewModel): void {
		this.bottomSheet.open(BottomSheetEditLogComponent, {
			panelClass: 'event-bottom-sheet',
			data: {
				key: log.key
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.logsService.editLogEntry(log.key, response.key).subscribe(logs => {
				this.logs = logs.map(l => new LogHistoryViewModel(l)).sort(getSortOrder("lastEntry", true));
				this.logs$.next(this.logs);
			});
		});
	}

	public openDeleteDialog(log: LogHistoryViewModel): void {
		this.bottomSheet.open(BottomSheetDeleteOverviewComponent, {
			panelClass: 'event-bottom-sheet',
			data: {
				title: 'DELETE_LOG_DIALOG_TITLE',
				content: ['DELETE_LOG_DIALOG_CONTENT_1', 'DELETE_LOG_DIALOG_CONTENT_2']
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.logsService.deleteLogEntry(log.key).subscribe(logs => {
				this.logs = logs.map(l => new LogHistoryViewModel(l)).sort(getSortOrder("lastEntry", true));
				this.logs$.next(this.logs);
			});
		});
	}

	public openOccurrenceHistory(log: LogHistoryViewModel): void {
		this.logsService.getLogOccurrences(log.key).subscribe(occurrences => {
			const ref = this.bottomSheet.open(DialogOccurrenceHistoryComponent, {
				panelClass: 'event-bottom-sheet',
				disableClose: true,
				data: {
					title: log.key,
					type: 'log',
					key: log.key,
					occurrences: occurrences.map(o => ({
						date: o.date,
						time: o.time,
						detail: o.detail
					}))
				}
			});
			ref.afterDismissed().subscribe(result => {
				if (result?.hasChanges) {
					this.refreshLogsList();
				}
				if (result?.reopen) {
					this.openOccurrenceHistory(log);
				}
			});
		});
	}

	public openRefreshDialog(): void {
		this.dialog.open(DialogConfirmComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'LOGS_REFRESH_DIALOG_TITLE',
				content: ['LOGS_REFRESH_DIALOG_CONTENT_1', 'LOGS_REFRESH_DIALOG_CONTENT_2']
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.refreshLogsList();
		});
	}

	private refreshLogsList(): void {
		this.logsService.refreshLogs().subscribe(logs => {
			this.logs = logs.map(l => new LogHistoryViewModel(l)).sort(getSortOrder("lastEntry", true));
			this.logs$.next(this.logs);
		});
	}
}
