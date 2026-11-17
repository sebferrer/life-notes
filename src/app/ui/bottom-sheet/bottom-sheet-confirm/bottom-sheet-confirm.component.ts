import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';

// Yes/no question in a sheet (V2), e.g. refreshing a manage list. The V1 keeps DialogConfirmComponent.
export interface IBottomSheetConfirmData {
    title: string;
    content: string[];
    // Material icon above the title
    icon?: string;
    // Translation keys of the buttons, YES and NO by default
    confirmLabel?: string;
    cancelLabel?: string;
}

@Component({
    selector: 'app-bottom-sheet-confirm',
    templateUrl: 'bottom-sheet-confirm.component.html',
    styleUrls: ['bottom-sheet-confirm.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetConfirmComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetConfirmComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetConfirmData
    ) { }

    public onCancel(): void {
        this.bottomSheetRef.dismiss({ answer: 'no' });
    }

    public onConfirm(): void {
        this.bottomSheetRef.dismiss({ answer: 'yes' });
    }
}
