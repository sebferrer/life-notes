import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface IDialogData {
	key: string;
	label: string;
}

@Component({
	selector: 'app-dialog-delete-symptom',
	templateUrl: 'dialog-delete-symptom.component.html'
})
export class DialogDeleteSymptomComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogDeleteSymptomComponent>,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({
			'answer': 'yes'
		});
	}
}
