import { Component, Inject, Optional } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SettingsService } from 'src/app/infra/settings.service';

// Shown once to the users of the former versions, who kept the V1: the V2 is only a tap away, and can be left at any
// time in the settings. At the update, it is the dialog of the update (update: true), with the link to its notes.
@Component({
	selector: 'app-dialog-new-ui',
	templateUrl: 'dialog-new-ui.component.html',
	styleUrls: ['./dialog-new-ui.component.scss']
})
export class DialogNewUiComponent {
	public readonly UPDATE_NOTES_URL = 'https://life-notes.fr/updates';
	public readonly update: boolean;

	constructor(
		public dialogRef: MatDialogRef<DialogNewUiComponent>,
		private settingsService: SettingsService,
		@Optional() @Inject(MAT_DIALOG_DATA) data: { update?: boolean }
	) {
		this.update = data != null && data.update === true;
	}

	public tryNewUi(): void {
		this.settingsService.setUiVersion('v2').subscribe();
		this.dialogRef.close();
	}

	public openUpdateNotes(): void {
		window.open(this.UPDATE_NOTES_URL, '_system');
	}
}
