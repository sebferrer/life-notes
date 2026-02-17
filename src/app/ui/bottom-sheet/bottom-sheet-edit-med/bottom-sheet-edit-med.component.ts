import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';

export interface IBottomSheetEditMedData {
    key: string;
    quantity: number;
}

@Component({
    selector: 'app-bottom-sheet-edit-med',
    templateUrl: 'bottom-sheet-edit-med.component.html',
    styleUrls: ['bottom-sheet-edit-med.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetEditMedComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetEditMedComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetEditMedData
    ) { }

    public onCancel(): void {
        this.bottomSheetRef.dismiss();
    }

    public onConfirm(): void {
        this.bottomSheetRef.dismiss({
            answer: 'yes',
            key: this.data.key,
            quantity: this.data.quantity
        });
    }

    public isValid(): boolean {
        return this.data.key != null && this.data.key !== '' && this.data.quantity != null;
    }
}
