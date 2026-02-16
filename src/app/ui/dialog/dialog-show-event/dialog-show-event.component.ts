import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { ICustomEvent } from 'src/app/models/customEvent.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { GlobalService } from 'src/app/infra/global.service';

export interface IDialogData {
	date: string;
	detailedDate: IDetailedDate;
	customEvent: ICustomEvent;
}

@Component({
	selector: 'app-dialog-show-event',
	templateUrl: 'dialog-show-event.component.html',
	styleUrls: ['dialog-show-event.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class DialogShowEventComponent {
	constructor(
		public bottomSheetRef: MatBottomSheetRef<DialogShowEventComponent>,
		public globalService: GlobalService,
		@Inject(MAT_BOTTOM_SHEET_DATA) public data: IDialogData
	) { }

	public onNoClick(): void {
		this.bottomSheetRef.dismiss({ 'answer': 'no', 'type': this.data.customEvent.type });
	}

	public onYesClick(): void {
		this.bottomSheetRef.dismiss({ 'answer': 'yes', 'type': this.data.customEvent.type });
	}

	public onDeleteClick(): void {
		this.bottomSheetRef.dismiss({ 'answer': 'delete', 'type': this.data.customEvent.type });
	}

	public getPainValue(pain: number): number {
		return this.globalService.painScale === 10 ? pain * 2 : Math.ceil(pain);
	}
}
