import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { IDetailedDate } from 'src/app/models/detailed.date';

export interface IDeleteTimelineEventData {
    date: string;
    detailedDate: IDetailedDate;
    type: string;
    time: string;
    key: string;
}

@Component({
    selector: 'app-bottom-sheet-delete-timeline-event',
    templateUrl: 'bottom-sheet-delete-timeline-event.component.html',
    styleUrls: ['bottom-sheet-delete-timeline-event.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetDeleteTimelineEventComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetDeleteTimelineEventComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IDeleteTimelineEventData
    ) { }

    public onCancelClick(): void {
        this.bottomSheetRef.dismiss({ answer: 'no' });
    }

    public onConfirmClick(): void {
        this.bottomSheetRef.dismiss({
            answer: 'yes',
            date: this.data.date,
            time: this.data.time,
            type: this.data.type,
            key: this.data.key
        });
    }
}
