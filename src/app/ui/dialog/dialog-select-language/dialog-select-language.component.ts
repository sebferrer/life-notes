import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'app-dialog-select-language',
	templateUrl: 'dialog-select-language.component.html'
})
export class DialogSelectLanguageComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogSelectLanguageComponent>
	) { }

	public onEnClick(): void {
		this.dialogRef.close({ 'answer': 'en' });
	}

	public onFrClick(): void {
		this.dialogRef.close({ 'answer': 'fr' });
	}
}
