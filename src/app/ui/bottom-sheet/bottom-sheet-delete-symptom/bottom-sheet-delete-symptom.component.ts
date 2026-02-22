import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

export interface IBottomSheetDeleteSymptomData {
    key: string;
    label: string;
}

@Component({
    selector: 'app-bottom-sheet-delete-symptom',
    templateUrl: 'bottom-sheet-delete-symptom.component.html',
    styleUrls: ['bottom-sheet-delete-symptom.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetDeleteSymptomComponent {
    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetDeleteSymptomComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetDeleteSymptomData
    ) { }

    public onNoClick(): void {
        this.bottomSheetRef.dismiss({ 'answer': 'no' });
    }

    public onYesClick(): void {
        this.bottomSheetRef.dismiss({
            'answer': 'yes'
        });
    }
}
