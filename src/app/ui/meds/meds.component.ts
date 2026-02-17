import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../infra';
import { BehaviorSubject } from 'rxjs';
import { MedHistoryViewModel } from 'src/app/models/med-history.view.model';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IMedHistory } from 'src/app/models/med.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { MedsService } from 'src/app/infra/meds.service';
import { DialogConfirmComponent } from '../dialog/dialog-confirm';
import { DialogEditMedComponent } from '../dialog/dialog-edit-med/dialog-edit-med.component';
import { getSortOrder } from 'src/app/util/array.utils';
import { DialogOccurrenceHistoryComponent } from '../dialog/dialog-occurrence-history';

@Component({
	selector: 'app-meds',
	templateUrl: './meds.component.html',
	styleUrls: ['./meds.component.scss']
})
export class MedsComponent implements OnInit {

	public meds: MedHistoryViewModel[];
	public meds$: BehaviorSubject<MedHistoryViewModel[]>;

	public displayedColumns: string[] = ['key', 'quantity', 'occurrences', 'actions'];
	public dataSource: IMedHistory[];

	constructor(
		private translocoService: TranslocoService,
		private globalService: GlobalService,
		private settingsService: SettingsService,
		private medsService: MedsService,
		private dialog: MatDialog,
		private bottomSheet: MatBottomSheet,
		private snackBar: MatSnackBar
	) {
		this.meds = new Array<MedHistoryViewModel>();
		this.meds$ = new BehaviorSubject<MedHistoryViewModel[]>(new Array<MedHistoryViewModel>());
	}

	public ngOnInit(): void {
		this.medsService.getMeds().subscribe(
			meds => {
				meds.forEach(med => {
					this.meds.push(new MedHistoryViewModel(med));
				});
				this.meds$.next(this.meds.sort(getSortOrder("lastEntry", true)));
			});
	}

	public toggleEditable(meds: MedHistoryViewModel[], med: MedHistoryViewModel): void {
		for (const s of meds) {
			if (s.key !== med.key) {
				s.editable = false;
			}
		}
		med.editable = !med.editable;
	}

	public openEditDialog(med: MedHistoryViewModel): void {
		this.dialog.open(DialogEditMedComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				key: med.key,
				quantity: med.quantity
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.medsService.editMedication(med.key, med.quantity, response.key, response.quantity).subscribe(meds => {
				this.meds = meds.map(m => new MedHistoryViewModel(m)).sort(getSortOrder("lastEntry", true));
				this.meds$.next(this.meds);
			});
		});
	}

	public openDeleteDialog(med: MedHistoryViewModel): void {
		this.dialog.open(DialogConfirmComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'DELETE_MED_DIALOG_TITLE',
				content: ['DELETE_MED_DIALOG_CONTENT_1', 'DELETE_MED_DIALOG_CONTENT_2']
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.medsService.deleteMedication(med.key, med.quantity).subscribe(meds => {
				this.meds = meds.map(m => new MedHistoryViewModel(m)).sort(getSortOrder("lastEntry", true));
				this.meds$.next(this.meds);
			});
		});
	}

	public openOccurrenceHistory(med: MedHistoryViewModel): void {
		this.medsService.getMedOccurrences(med.key, med.quantity).subscribe(occurrences => {
			const title = med.key + (med.quantity ? ' ' + med.quantity + ' mg' : '');
			const ref = this.bottomSheet.open(DialogOccurrenceHistoryComponent, {
				panelClass: 'event-bottom-sheet',
				disableClose: true,
				data: {
					title,
					type: 'med',
					key: med.key,
					quantity: med.quantity,
					occurrences: occurrences.map(o => ({
						date: o.date,
						time: o.time,
						quantity: o.quantity
					}))
				}
			});
			ref.afterDismissed().subscribe(result => {
				if (result?.hasChanges) {
					this.refreshMedsList();
				}
				if (result?.reopen) {
					this.openOccurrenceHistory(med);
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
				title: 'MEDS_REFRESH_DIALOG_TITLE',
				content: ['MEDS_REFRESH_DIALOG_CONTENT_1', 'MEDS_REFRESH_DIALOG_CONTENT_2']
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.refreshMedsList();
		});
	}

	private refreshMedsList(): void {
		this.medsService.refreshMeds().subscribe(meds => {
			this.meds = meds.map(m => new MedHistoryViewModel(m)).sort(getSortOrder("lastEntry", true));
			this.meds$.next(this.meds);
		});
	}
}
