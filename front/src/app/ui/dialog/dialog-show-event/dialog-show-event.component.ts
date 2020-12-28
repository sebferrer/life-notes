import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ICustomEvent } from 'src/app/models/customEvent.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { GlobalService } from 'src/app/infra/global.service';

export interface IDialogData {
	date: string;
	detailedDate: IDetailedDate;
	customEvent: ICustomEvent;
}

@Component({
	selector: 'app-dialog-show-event',
	templateUrl: 'dialog-show-event.component.html'
})
export class DialogShowEventComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogShowEventComponent>,
		public globalService: GlobalService,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData
	) { }

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no', 'type': this.data.customEvent.type });
	}

	public onYesClick(): void {
		this.dialogRef.close({ 'answer': 'yes', 'type': this.data.customEvent.type });
	}
}
