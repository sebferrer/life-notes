import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DaysService } from 'src/app/infra';

export interface IDialogData {
	date: string;
	type: string;
	key: string;
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
		/*this.daysService.add(this.data.date).subscribe(() => {
			this.dialogRef.close({ 'answer': 'yes' });
		});*/
	}
}
