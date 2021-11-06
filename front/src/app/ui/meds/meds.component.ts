import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../infra';
import { BehaviorSubject } from 'rxjs';
import { MedHistoryViewModel } from 'src/app/models/med-history.view.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IMedHistory } from 'src/app/models/med.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { MedsService } from 'src/app/infra/meds.service';
import { DialogConfirmComponent } from '../dialog/dialog-confirm';
import { getSortOrder } from 'src/app/util/array.utils';

@Component({
	selector: 'app-meds',
	templateUrl: './meds.component.html',
	styleUrls: ['./meds.component.scss']
})
export class MedsComponent implements OnInit {

	public meds: MedHistoryViewModel[];
	public meds$: BehaviorSubject<MedHistoryViewModel[]>;

	public displayedColumns: string[] = ['key', 'quantity', 'occurrences', 'lastEntry'];
	public dataSource: IMedHistory[];

	constructor(
		private translocoService: TranslocoService,
		private globalService: GlobalService,
		private settingsService: SettingsService,
		private medsService: MedsService,
		private dialog: MatDialog,
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
		med.editable = med.editable ? false : true;
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
			this.medsService.refreshMeds().subscribe(meds => {
				this.meds = meds.map(med => new MedHistoryViewModel(med)).sort(getSortOrder("lastEntry", true));
				this.meds$.next(this.meds);
			});
		});
	}

	/*public openDeleteDialog(key: string, label: string): void {
		this.dialog.open(DialogDeleteMedHistoryComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { key, label }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.medsService.deleteSymptom(key).subscribe(() => {
				this.meds = this.meds.filter(med => med.key !== key);
				this.meds$.next(this.meds);
				if (this.globalService.targetSymptomKey === key) {
					this.settingsService.setTargetSymptomKey(null).subscribe(() => {
						this.globalService.targetSymptomKey = null;
					});
				}
				this.globalService.loadSymptoms().subscribe(() => { });
			});
			this.snackBar.open(this.translocoService.translate('DELETE_SYMPTOM_SNACKBAR', { label }),
				this.translocoService.translate('CLOSE'),
				{ duration: 2000 });
		});
	}*/

}
