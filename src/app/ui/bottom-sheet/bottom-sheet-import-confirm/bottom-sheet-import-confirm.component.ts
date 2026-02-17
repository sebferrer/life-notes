import { Component, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

@Component({
    selector: 'app-bottom-sheet-import-confirm',
    templateUrl: 'bottom-sheet-import-confirm.component.html',
    styleUrls: ['bottom-sheet-import-confirm.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetImportConfirmComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetImportConfirmComponent>
    ) { }

    public onNoClick(): void {
        this.bottomSheetRef.dismiss({ answer: 'no' });
    }

    public onYesClick(): void {
        this.bottomSheetRef.dismiss({ answer: 'yes' });
    }
}
