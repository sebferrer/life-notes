import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';

export interface IBottomSheetDeleteOverviewData {
    title: string;
    content: string[];
}

@Component({
    selector: 'app-bottom-sheet-delete-overview',
    templateUrl: 'bottom-sheet-delete-overview.component.html',
    styleUrls: ['bottom-sheet-delete-overview.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetDeleteOverviewComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetDeleteOverviewComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetDeleteOverviewData
    ) { }

    public onCancel(): void {
        this.bottomSheetRef.dismiss({ answer: 'no' });
    }

    public onConfirm(): void {
        this.bottomSheetRef.dismiss({ answer: 'yes' });
    }
}
