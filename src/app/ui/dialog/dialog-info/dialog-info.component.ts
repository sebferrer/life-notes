import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface IDialogData {
	title: string;
	content: string[];
	contactEmail?: string;
}

@Component({
	selector: 'app-dialog-info',
	templateUrl: 'dialog-info.component.html'
})
export class DialogInfoComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogInfoComponent>,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData
	) { }

	public onCloseClick(): void {
		this.dialogRef.close({ 'answer': 'close' });
	}

	public onEmailClick(): void {
		window.location.href = `mailto:${this.data.contactEmail}`;
	}
}
