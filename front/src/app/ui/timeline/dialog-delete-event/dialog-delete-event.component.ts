import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IDetailedDate } from 'src/app/models/detailed.date';

export interface IDialogData {
	date: string;
	detailedDate: IDetailedDate;
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
		@Inject(MAT_DIALOG_DATA) public data: IDialogData
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({
			'answer': 'yes',
			'date': this.data.date,
			'time': this.data.time,
			'type': this.data.type,
			'key': this.data.key
		});
	}
}
