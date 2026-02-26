import { Component, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

@Component({
    selector: 'app-bottom-sheet-force-load-warning',
    templateUrl: 'bottom-sheet-force-load-warning.component.html',
    styleUrls: ['bottom-sheet-force-load-warning.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetForceLoadWarningComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetForceLoadWarningComponent>
    ) { }

    public onCancelClick(): void {
        this.bottomSheetRef.dismiss({ answer: 'no' });
    }

    public onConfirmClick(): void {
        this.bottomSheetRef.dismiss({ answer: 'yes' });
    }
}
