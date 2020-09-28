import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DaysService } from 'src/app/infra';

export interface IDialogData {
	date: string;
	type: string;
	typeLabel: string;
	time: string;
	key: string;
	pain: number;
	detail: string;
	quantity: string;
}

@Component({
	selector: 'app-dialog-add-event',
	templateUrl: 'dialog-add-event.component.html'
})
export class DialogAddEventComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogAddEventComponent>,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData,
		private daysService: DaysService
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.daysService.addEvent(this.data.date,
			this.data.time,
			this.data.type,
			this.data.key,
			this.data.pain,
			this.data.detail,
			this.data.quantity);
	}
}
