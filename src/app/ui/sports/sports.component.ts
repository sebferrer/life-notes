import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { SportsService } from 'src/app/infra/sports.service';
import { DialogConfirmComponent } from '../dialog/dialog-confirm';

import { getSortOrder } from 'src/app/util/array.utils';
import { SportHistoryViewModel } from 'src/app/models/sport-history.view.model';
import { ISportHistory } from 'src/app/models/sport.model';
import { DialogOccurrenceHistoryComponent } from '../dialog/dialog-occurrence-history';
import { BottomSheetEditLogComponent } from '../bottom-sheet/bottom-sheet-edit-log';
import { BottomSheetDeleteOverviewComponent } from '../bottom-sheet/bottom-sheet-delete-overview';

@Component({
	selector: 'app-sports',
	templateUrl: './sports.component.html',
	styleUrls: ['../manage/manage-list.scss']
})
export class SportsComponent implements OnInit {

	public sports: SportHistoryViewModel[];
	public sports$: BehaviorSubject<SportHistoryViewModel[]>;


	constructor(
		private sportsService: SportsService,
		private dialog: MatDialog,
		private bottomSheet: MatBottomSheet
	) {
		this.sports = new Array<SportHistoryViewModel>();
		this.sports$ = new BehaviorSubject<SportHistoryViewModel[]>(new Array<SportHistoryViewModel>());
	}

	public ngOnInit(): void {
		this.sportsService.getSports().subscribe(
			sports => {
				sports.forEach(sport => {
					this.sports.push(new SportHistoryViewModel(sport));
				});
				this.sports$.next(this.sports.sort(getSortOrder("lastEntry", true)));
			});
	}

	public openEditDialog(sport: SportHistoryViewModel): void {
		this.bottomSheet.open(BottomSheetEditLogComponent, {
			panelClass: 'event-bottom-sheet',
			// Only the close button can dismiss it, to avoid losing an ongoing edition
			disableClose: true,
			data: {
				key: sport.key,
				title: 'EDIT_SPORT_TITLE',
				label: 'TABLE_SPORT',
				warning: 'EDIT_SPORT_WARNING'
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.sportsService.editSportEntry(sport.key, response.key).subscribe(sports => {
				this.updateSportsList(sports);
			});
		});
	}

	public openDeleteDialog(sport: SportHistoryViewModel): void {
		this.bottomSheet.open(BottomSheetDeleteOverviewComponent, {
			panelClass: 'event-bottom-sheet',
			data: {
				title: 'DELETE_SPORT_DIALOG_TITLE',
				content: ['DELETE_SPORT_DIALOG_CONTENT_1', 'DELETE_SPORT_DIALOG_CONTENT_2']
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.sportsService.deleteSportEntry(sport.key).subscribe(sports => {
				this.updateSportsList(sports);
			});
		});
	}

	// The history after a deletion, else the default tab of the version of the interface
	public openOccurrenceHistory(sport: SportHistoryViewModel, tab?: 'stats' | 'history'): void {
		this.sportsService.getSportOccurrences(sport.key).subscribe(occurrences => {
			const ref = this.bottomSheet.open(DialogOccurrenceHistoryComponent, {
				panelClass: ['event-bottom-sheet', 'occurrence-history-panel'],
				disableClose: true,
				data: {
					tab,
					title: sport.key,
					type: 'sport',
					key: sport.key,
					occurrences: occurrences.map(o => ({
						date: o.date,
						time: o.time,
						detail: o.detail
					}))
				}
			});
			ref.afterDismissed().subscribe(result => {
				if (result?.hasChanges) {
					this.refreshSportsList();
				}
				if (result?.reopen) {
					this.openOccurrenceHistory(sport, 'history');
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
				title: 'SPORTS_REFRESH_DIALOG_TITLE',
				content: ['SPORTS_REFRESH_DIALOG_CONTENT_1', 'SPORTS_REFRESH_DIALOG_CONTENT_2']
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.refreshSportsList();
		});
	}

	private refreshSportsList(): void {
		this.sportsService.refreshSports().subscribe(sports => {
			this.updateSportsList(sports);
		});
	}

	private updateSportsList(sports: ISportHistory[]): void {
		this.sports = sports.map(s => new SportHistoryViewModel(s)).sort(getSortOrder("lastEntry", true));
		this.sports$.next(this.sports);
	}
}
