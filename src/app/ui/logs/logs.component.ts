import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../infra';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IMedHistory } from 'src/app/models/med.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { LogsService } from 'src/app/infra/logs.service';
import { DialogConfirmComponent } from '../dialog/dialog-confirm';
import { DialogEditLogComponent } from '../dialog/dialog-edit-log/dialog-edit-log.component';
import { getSortOrder } from 'src/app/util/array.utils';
import { LogHistoryViewModel } from 'src/app/models/log-history.view.model';

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
		med.editable = med.editable ? false : true;
	}

	public openEditDialog(log: LogHistoryViewModel): void {
		this.dialog.open(DialogEditLogComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				key: log.key
			}
		}).afterClosed().subscribe(response => {
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
		this.dialog.open(DialogConfirmComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'DELETE_LOG_DIALOG_TITLE',
				content: ['DELETE_LOG_DIALOG_CONTENT_1', 'DELETE_LOG_DIALOG_CONTENT_2']
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.logsService.deleteLogEntry(log.key).subscribe(logs => {
				this.logs = logs.map(l => new LogHistoryViewModel(l)).sort(getSortOrder("lastEntry", true));
				this.logs$.next(this.logs);
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
			this.logsService.refreshLogs().subscribe(meds => {
				this.logs = meds.map(log => new LogHistoryViewModel(log)).sort(getSortOrder("lastEntry", true));
				this.logs$.next(this.logs);
			});
		});
	}

}
