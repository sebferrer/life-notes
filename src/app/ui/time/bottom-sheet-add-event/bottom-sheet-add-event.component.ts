import { Component } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { GlobalService } from 'src/app/infra/global.service';

interface IAddOption {
	type: string;
	label: string;
	// Material icon, or svg drawn with the text color (see .svg-icon in styles.scss)
	icon?: string;
	svg?: string;
}

@Component({
	selector: 'app-bottom-sheet-add-event',
	templateUrl: 'bottom-sheet-add-event.component.html',
	styleUrls: ['./bottom-sheet-add-event.component.scss']
})
export class BottomSheetAddEventComponent {

	// V2 grid, in the order of the manage menu
	public readonly options: IAddOption[] = [
		{ type: 'symptomLog', label: 'ADD_MENU_SYMPTOM', icon: 'spa' },
		{ type: 'meal', label: 'ADD_MENU_MEAL', svg: 'meal' },
		{ type: 'med', label: 'ADD_MENU_MED', svg: 'pill' },
		{ type: 'sport', label: 'ADD_MENU_SPORT', icon: 'fitness_center' },
		{ type: 'log', label: 'ADD_MENU_NOTE', icon: 'event_note' }
	];

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
