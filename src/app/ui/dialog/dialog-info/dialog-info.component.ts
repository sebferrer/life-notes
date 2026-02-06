import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface IDialogData {
	title: string;
	content: string[];
	actionButton?: {
		label: string;
		url: string;
	};
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

	public openLink(url: string): void {
		window.open(url, '_system');
	}
}
