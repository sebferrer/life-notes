import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ISymptom } from 'src/app/models/symptom.model';

export interface IDialogData {
	symptoms: ISymptom[];
}

@Component({
	selector: 'app-select-symptom',
	templateUrl: 'dialog-select-symptom.component.html'
})
export class DialogSelectSymptomComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogSelectSymptomComponent>,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData
	) { }

	public selectSymptom(symptomKey: string): void {
		this.dialogRef.close({ 'answer': symptomKey });
	}

}
