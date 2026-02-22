import { Component, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

@Component({
    selector: 'app-bottom-sheet-export-pdf',
    templateUrl: 'bottom-sheet-export-pdf.component.html',
    styleUrls: ['bottom-sheet-export-pdf.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetExportPdfComponent {

    public months: { value: number, label: string }[] = [];
    public years: number[] = [];
    public selectedMonth: number;
    public selectedYear: number;

    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetExportPdfComponent>
    ) {
        const now = new Date();
        this.selectedYear = now.getFullYear();
        this.selectedMonth = now.getMonth() + 1;

        // Generate years (last 5 years)
        for (let i = 0; i < 5; i++) {
            this.years.push(this.selectedYear - i);
        }

        // Generate months
        for (let i = 1; i <= 12; i++) {
            this.months.push({ value: i, label: i.toString() });
        }
    }

    public onCloseClick(): void {
        this.bottomSheetRef.dismiss();
    }

    public onConfirmClick(): void {
        this.bottomSheetRef.dismiss({ month: this.selectedMonth, year: this.selectedYear });
    }
}
