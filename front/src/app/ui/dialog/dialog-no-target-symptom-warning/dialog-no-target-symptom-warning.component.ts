import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'app-dialog-no-target-symptom-warning',
	templateUrl: 'dialog-no-target-symptom-warning.component.html'
})
export class DialogNoTargetSymptomWarningComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogNoTargetSymptomWarningComponent>
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}
}
