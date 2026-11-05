import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { SettingsService } from 'src/app/infra/settings.service';

// Shown once to the users of the former versions, who kept the V1: the V2 is only a tap away
@Component({
	selector: 'app-dialog-new-ui',
	templateUrl: 'dialog-new-ui.component.html',
	styleUrls: ['./dialog-new-ui.component.scss']
})
export class DialogNewUiComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogNewUiComponent>,
		private settingsService: SettingsService
	) { }

	public tryNewUi(): void {
		this.settingsService.setUiVersion('v2').subscribe();
		this.dialogRef.close();
	}
}
