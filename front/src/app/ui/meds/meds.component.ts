import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../infra';
import { Subject } from 'rxjs';
import { MedHistoryViewModel } from 'src/app/models/med-history.view.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
// import { DialogAddSymptomComponent } from '../dialog/dialog-add-med';
import * as simplifyString from 'simplify-string';
// import { DialogDeleteSymptomComponent } from '../dialog/dialog-delete-med';IMedHistory
import { IMed, IMedHistory } from 'src/app/models/med.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { MedsService } from 'src/app/infra/meds.service';

@Component({
	selector: 'app-meds',
	templateUrl: './meds.component.html',
	styleUrls: ['./meds.component.scss']
})
export class MedsComponent implements OnInit {

	public meds: MedHistoryViewModel[];
	public meds$: Subject<MedHistoryViewModel[]>;

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
		this.meds$ = new Subject<MedHistoryViewModel[]>();
	}

	public ngOnInit(): void {
		this.medsService.getMeds().subscribe(
			meds => {
				this.dataSource = meds;
				meds.forEach(med => {
					this.meds.push(new MedHistoryViewModel(med));
				});
				this.meds$.next(this.meds);
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
