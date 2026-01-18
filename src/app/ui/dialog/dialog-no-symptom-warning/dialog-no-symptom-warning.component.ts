import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'app-dialog-no-symptom-warning',
	templateUrl: 'dialog-no-symptom-warning.component.html',
	styles: [`
		.tutorial-hint {
			margin-top: 20px;
			font-weight: 500;
		}
		.tutorial-button-container {
			display: flex;
			justify-content: center;
			margin-top: 10px;
		}
	`]
})
export class DialogNoSymptomWarningComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogNoSymptomWarningComponent>
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({ 'answer': 'yes' });
	}
}
