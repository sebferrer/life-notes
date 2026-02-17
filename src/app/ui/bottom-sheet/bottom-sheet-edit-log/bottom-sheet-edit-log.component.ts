import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';

export interface IBottomSheetEditLogData {
    key: string;
}

@Component({
    selector: 'app-bottom-sheet-edit-log',
    templateUrl: 'bottom-sheet-edit-log.component.html',
    styleUrls: ['bottom-sheet-edit-log.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetEditLogComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetEditLogComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetEditLogData
    ) { }

    public onCancel(): void {
        this.bottomSheetRef.dismiss();
    }

    public onConfirm(): void {
        this.bottomSheetRef.dismiss({
            answer: 'yes',
            key: this.data.key
        });
    }

    public isValid(): boolean {
        return this.data.key != null && this.data.key !== '';
    }
}
