import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GlobalService } from 'src/app/infra/global.service';

@Component({
    selector: 'app-dialog-export-pdf',
    templateUrl: 'dialog-export-pdf.component.html',
    styleUrls: ['dialog-export-pdf.component.scss']
})
export class DialogExportPdfComponent {

    public months: { value: number, label: string }[] = [];
    public years: number[] = [];
    public selectedMonth: number;
    public selectedYear: number;

    constructor(
        public dialogRef: MatDialogRef<DialogExportPdfComponent>,
        private globalService: GlobalService
    ) {
        const now = new Date();
        this.selectedYear = now.getFullYear();
        this.selectedMonth = now.getMonth() + 1;

        // Generate years (last 5 years)
        for (let i = 0; i < 5; i++) {
            this.years.push(this.selectedYear - i);
        }

        // Generate months
        // We can use a simple list and translate in template or here.
        // For simplicity, let's use 1-12 and letting template handle display or use Moment
        // The app uses Transloco. Let's send 1-12.
        for (let i = 1; i <= 12; i++) {
            this.months.push({ value: i, label: i.toString() });
            // In template we will likely want to format this. 
            // For now, let's just push numbers.
        }
    }

    public onCloseClick(): void {
        this.dialogRef.close();
    }

    public onConfirmClick(): void {
        this.dialogRef.close({ month: this.selectedMonth, year: this.selectedYear });
    }
}
