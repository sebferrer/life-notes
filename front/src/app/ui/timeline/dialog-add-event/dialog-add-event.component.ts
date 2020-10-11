import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DaysService } from 'src/app/infra';
import { ICustomEvent } from 'src/app/models/customEvent.model';

export interface IDialogData {
	date: string;
	typeLabel: string;
	type: string;
	time: string;
	key: string;
	detail: string;
	pain: number;
	quantity: number;
	wakeUp: string;
	goToBed: string;
	customEvent: ICustomEvent;
	edit: boolean;
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
	) {
		if (data.customEvent != null) {
			data.edit = true;
			data.type = data.customEvent.type;
			data.time = data.customEvent.time;
			data.key = data.customEvent.key;
			data.detail = data.customEvent.detail;
			data.pain = data.customEvent.pain;
			data.quantity = data.customEvent.quantity;
		} else {
			data.edit = false;
		}
	}

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		if (this.data.edit) {
			this.daysService.editEvent(
				this.data.date,
				{
					'time': this.data.time,
					'type': this.data.type,
					'key': this.data.key,
					'pain': this.data.pain,
					'detail': this.data.detail,
					'quantity': this.data.quantity
				});
		} else {
			this.daysService.addEvent(
				this.data.date,
				{
					'time': this.data.time,
					'type': this.data.type,
					'key': this.data.key,
					'pain': this.data.pain,
					'detail': this.data.detail,
					'quantity': this.data.quantity
				});
		}
	}
}
