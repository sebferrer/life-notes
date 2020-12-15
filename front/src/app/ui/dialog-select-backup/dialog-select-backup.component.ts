import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'app-select-backup',
	templateUrl: 'dialog-select-backup.component.html'
})
export class DialogSelectBackupComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogSelectBackupComponent>
	) { }

	public selectBackup(backupType: string): void {
		this.dialogRef.close({ 'answer': backupType });
	}

}
