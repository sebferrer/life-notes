import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DaysService } from 'src/app/infra';

export interface IDialogData {
	date: string;
	type: string;
	time: string;
	key: string;
}

@Component({
	selector: 'app-dialog-delete-event',
	templateUrl: 'dialog-delete-event.component.html'
})
export class DialogDeleteEventComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogDeleteEventComponent>,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData,
		private daysService: DaysService
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({ 'answer': 'yes' });
	}
}
