import { Component, OnInit } from '@angular/core';
import { SymptomsService, SettingsService } from '../../infra';
import { Subject } from 'rxjs';
import { SymptomViewModel } from 'src/app/models/symptom.view.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogAddSymptomComponent } from '../dialog/dialog-add-symptom';
import * as simplifyString from 'simplify-string';
import { DialogDeleteSymptomComponent } from '../dialog/dialog-delete-symptom';
import { ISymptom } from 'src/app/models/symptom.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';

@Component({
	selector: 'app-symptoms',
	templateUrl: './symptoms.component.html',
	styleUrls: ['./symptoms.component.scss']
})
export class SymptomsComponent implements OnInit {

	public symptoms: SymptomViewModel[];
	public symptoms$: Subject<SymptomViewModel[]>;

	constructor(
		private translocoService: TranslocoService,
		private globalService: GlobalService,
		private settingsService: SettingsService,
		private symptomsService: SymptomsService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) {
		this.symptoms = new Array<SymptomViewModel>();
		this.symptoms$ = new Subject<SymptomViewModel[]>();
	}

	public ngOnInit(): void {
		this.symptomsService.getSymptoms().subscribe(
			symptoms => {
				symptoms.forEach(symptom => {
					this.symptoms.push(new SymptomViewModel(symptom));
				});
				this.symptoms$.next(this.symptoms);
			});
	}

	public openAddDialog(symptom?: ISymptom): void {
		symptom = symptom == null ? { 'type': null, 'key': null } : symptom;
		this.dialog.open(DialogAddSymptomComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { symptom }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			if (response.edit) {
				this.editSymptom(response.key, response.label);
			} else {
				this.addSymptom(response.label);
			}
			const action = response.edit ? 'UPDATED' : 'ADDED';
			this.snackBar.open(this.translocoService.translate('ADD_SYMPTOM_SNACKBAR',
				{ action: this.translocoService.translate(action) }), this.translocoService.translate('CLOSE'),
				{ duration: 2000 });
		});
	}

	public openDeleteDialog(key: string, label: string): void {
		this.dialog.open(DialogDeleteSymptomComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { key, label }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.symptomsService.deleteSymptom(key).subscribe(() => {
				this.symptoms = this.symptoms.filter(symptom => symptom.key !== key);
				this.symptoms$.next(this.symptoms);
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
	}

	public addSymptom(label: string): void {
		const key: string = simplifyString(label);
		this.symptomsService.createNewSymptom(key, label).subscribe(() => {
			this.symptoms.push(new SymptomViewModel({ type: null, key, label }));
			this.symptoms$.next(this.symptoms);
			this.globalService.loadSymptoms().subscribe(() => { });

			if (!this.globalService.targetSymptomKey) {
				this.settingsService.setTargetSymptomKey(key).subscribe(() => {
					this.globalService.targetSymptomKey = key;
				});
			}
		});
	}

	public editSymptom(key: string, label: string): void {
		this.symptomsService.editSymptom(key, label).subscribe(symptom => {
			this.symptoms = this.symptoms.filter(s => s.key !== key);
			this.symptoms.push(new SymptomViewModel(symptom));
			this.symptoms$.next(this.symptoms);
			this.globalService.loadSymptoms().subscribe(() => { });
		});
	}

}
