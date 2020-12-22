import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'app-dialog-import-confirm',
	templateUrl: 'dialog-import-confirm.component.html'
})
export class DialogImportConfirmComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogImportConfirmComponent>
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({ 'answer': 'yes' });
	}
}
