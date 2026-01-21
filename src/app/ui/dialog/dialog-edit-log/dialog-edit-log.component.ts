import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogEditLogData {
	key: string;
}

@Component({
	selector: 'app-dialog-edit-log',
	templateUrl: 'dialog-edit-log.component.html',
    styleUrls: ['./dialog-edit-log.component.scss']
})
export class DialogEditLogComponent {

	constructor(
		public dialogRef: MatDialogRef<DialogEditLogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: DialogEditLogData
	) { }

	public onNoClick(): void {
		this.dialogRef.close();
	}

	public onYesClick(): void {
		this.dialogRef.close({
			'answer': 'yes',
			'key': this.data.key
		});
	}

    public isValid(): boolean {
        return this.data.key != null && this.data.key !== '';
    }
}
