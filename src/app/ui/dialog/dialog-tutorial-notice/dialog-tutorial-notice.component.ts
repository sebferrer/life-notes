import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'app-dialog-tutorial-notice',
	templateUrl: 'dialog-tutorial-notice.component.html'
})
export class DialogTutorialNoticeComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogTutorialNoticeComponent>
	) { }

	public onCloseClick(): void {
		this.dialogRef.close();
	}
}
