import { Component, Inject } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { GlobalService } from 'src/app/infra/global.service';

@Component({
	selector: 'app-bottom-sheet-add-event',
	templateUrl: 'bottom-sheet-add-event.component.html',
	styleUrls: ['./bottom-sheet-add-event.component.scss']
})
export class BottomSheetAddEventComponent {
	constructor(
		private bottomSheetRef: MatBottomSheetRef<BottomSheetAddEventComponent>,
		public globalService: GlobalService
	) { }

	public close(): void {
		this.bottomSheetRef.dismiss();
	}

	// customType: type definition of the 'custom' events
	select(type: string, customType?: string): void {
		this.bottomSheetRef.dismiss({ type, customType });
		event.preventDefault();
	}
}
