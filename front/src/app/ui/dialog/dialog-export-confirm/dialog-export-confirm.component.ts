import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'app-dialog-export-confirm',
	templateUrl: 'dialog-export-confirm.component.html'
})
export class DialogExportConfirmComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogExportConfirmComponent>
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({ 'answer': 'yes' });
	}
}
