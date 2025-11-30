import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ISymptom } from 'src/app/models/symptom.model';

export interface IDialogData {
	symptom: ISymptom;
	edit: boolean;
}

@Component({
	selector: 'app-dialog-add-symptom',
	templateUrl: 'dialog-add-symptom.component.html'
})
export class DialogAddSymptomComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogAddSymptomComponent>,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData
	) {
		data.edit = data.symptom.key == null ? false : true;
	}

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({
			'answer': 'yes',
			'edit': this.data.edit,
			'key': this.data.symptom.key,
			'label': this.data.symptom.label,
		});
	}
}
