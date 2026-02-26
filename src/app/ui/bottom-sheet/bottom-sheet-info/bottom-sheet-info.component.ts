import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

export interface IBottomSheetInfoData {
    titleKey: string;
    contentKeys: string[];
}

@Component({
    selector: 'app-bottom-sheet-info',
    templateUrl: 'bottom-sheet-info.component.html',
    styleUrls: ['bottom-sheet-info.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetInfoComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetInfoComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetInfoData
    ) { }

    public onCloseClick(): void {
        this.bottomSheetRef.dismiss();
    }
}
