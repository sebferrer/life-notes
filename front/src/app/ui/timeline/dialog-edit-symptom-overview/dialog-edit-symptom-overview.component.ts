import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ISymptomOverview } from 'src/app/models/symptom.model';

export interface IDialogData {
	date: string;
	symptomOverview: ISymptomOverview;
}

@Component({
	selector: 'app-dialog-edit-symptom-overview',
	templateUrl: 'dialog-edit-symptom-overview.component.html'
})
export class DialogEditSymptomOverviewComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogEditSymptomOverviewComponent>,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({
			'answer': 'yes',
			'data': this.data.date,
			'key': this.data.symptomOverview.key,
			'pain': this.data.symptomOverview.pain,
		});
	}
}
