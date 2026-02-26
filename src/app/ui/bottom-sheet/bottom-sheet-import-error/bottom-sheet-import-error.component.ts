import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

@Component({
    selector: 'app-bottom-sheet-import-error',
    templateUrl: 'bottom-sheet-import-error.component.html',
    styleUrls: ['bottom-sheet-import-error.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetImportErrorComponent {

    public errorMessageKey: string;

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetImportErrorComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: { errorMessageKey: string }
    ) {
        this.errorMessageKey = data.errorMessageKey;
    }

    public onCloseClick(): void {
        this.bottomSheetRef.dismiss();
    }
}
