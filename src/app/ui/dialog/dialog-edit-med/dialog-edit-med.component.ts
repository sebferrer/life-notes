import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogEditMedData {
	key: string;
	quantity: number;
}

@Component({
	selector: 'app-dialog-edit-med',
	templateUrl: 'dialog-edit-med.component.html',
    styleUrls: ['./dialog-edit-med.component.scss']
})
export class DialogEditMedComponent {

	constructor(
		public dialogRef: MatDialogRef<DialogEditMedComponent>,
		@Inject(MAT_DIALOG_DATA) public data: DialogEditMedData
	) { }

	public onNoClick(): void {
		this.dialogRef.close();
	}

	public onYesClick(): void {
		this.dialogRef.close({
			'answer': 'yes',
			'key': this.data.key,
			'quantity': this.data.quantity
		});
	}

    public isValid(): boolean {
        return this.data.key != null && this.data.key !== '' && this.data.quantity != null;
    }
}
