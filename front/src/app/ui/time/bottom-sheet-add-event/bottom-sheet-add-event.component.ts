import { Component, Inject } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

@Component({
	selector: 'app-bottom-sheet-add-event',
	templateUrl: 'bottom-sheet-add-event.component.html',
})
export class BottomSheetAddEventComponent {
	constructor(
		private bottomSheetRef: MatBottomSheetRef<BottomSheetAddEventComponent>
	) { }

	select(type: string): void {
		this.bottomSheetRef.dismiss({ type });
		event.preventDefault();
	}
}
