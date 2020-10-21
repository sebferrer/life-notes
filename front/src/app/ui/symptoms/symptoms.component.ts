import { Component, OnInit } from '@angular/core';
import { SymptomsService } from '../../infra';
import { Observable } from 'rxjs';
import { SymptomViewModel } from 'src/app/models/symptom.view.model';
import { map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogAddSymptomComponent } from './dialog-add-symptom';
import * as simplifyString from 'simplify-string';
import { DialogDeleteSymptomComponent } from './dialog-delete-symptom';
import { ISymptom } from 'src/app/models/symptom.model';

@Component({
	selector: 'app-symptoms',
	templateUrl: './symptoms.component.html',
	styleUrls: ['./symptoms.component.scss']
})
export class SymptomsComponent implements OnInit {

	public symptoms$: Observable<SymptomViewModel[]>;

	constructor(
		private symptomsService: SymptomsService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) { }

	public ngOnInit(): void {
		this.symptoms$ = this.symptomsService.getSymptoms().pipe(
			map(symptoms => symptoms.map(symptom => new SymptomViewModel(symptom)))
		);
	}

	public toggleEditable(symptoms: SymptomViewModel[], symptom: SymptomViewModel): void {
		for (const s of symptoms) {
			if (s.key !== symptom.key) {
				s.editable = false;
			}
		}
		symptom.editable = symptom.editable ? false : true;
	}

	public openAddDialog(symptom?: ISymptom): void {
		symptom = symptom == null ? { 'type': 'symptom', 'key': null } : symptom;
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
			const action = response.edit ? 'updated' : 'added';
			this.snackBar.open(`The symptom was successfully ${action}`, 'Close');
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
			this.symptomsService.deleteSymptom(key).subscribe(() => { this.ngOnInit(); });
			this.snackBar.open(`The symptom ${label} was successfully deleted`, 'Close');
		});
	}

	public addSymptom(label: string): void {
		const key = simplifyString(label);
		this.symptomsService.createNewSymptom(key, label).subscribe(() => { this.ngOnInit(); });
	}

	public editSymptom(key: string, label: string): void {
		this.symptomsService.editSymptom(key, label).subscribe(() => { this.ngOnInit(); });
	}

}
