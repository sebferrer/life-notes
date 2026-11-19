import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { LANGUAGES } from 'src/app/models/language.model';

@Component({
	selector: 'app-dialog-select-language',
	templateUrl: 'dialog-select-language.component.html'
})
export class DialogSelectLanguageComponent {
	// Each language in itself: the user may not read English
	public readonly languageList = LANGUAGES;

	constructor(
		public dialogRef: MatDialogRef<DialogSelectLanguageComponent>
	) { }

	public onLanguageClick(code: string): void {
		this.dialogRef.close({ 'answer': code });
	}
}
