import { Component, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { GlobalService } from 'src/app/infra/global.service';

// Help of the setting calculating the overview of the day: what the overview is, how it is calculated when the
// setting is on (illustrated by the scene "auto-overview") and how to enter it when it is off ("day-overview").
// The scenes show the day of the version of the interface.
@Component({
    selector: 'app-bottom-sheet-auto-overview-help',
    templateUrl: 'bottom-sheet-auto-overview-help.component.html',
    styleUrls: ['bottom-sheet-auto-overview-help.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetAutoOverviewHelpComponent {

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetAutoOverviewHelpComponent>,
        public globalService: GlobalService
    ) { }

    public onCloseClick(): void {
        this.bottomSheetRef.dismiss();
    }
}
