import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GlobalService } from 'src/app/infra/global.service';

@Component({
    selector: 'app-dialog-export-pdf',
    templateUrl: 'dialog-export-pdf.component.html',
    styleUrls: ['dialog-export-pdf.component.scss']
})
export class DialogExportPdfComponent {

    constructor(
        public dialogRef: MatDialogRef<DialogExportPdfComponent>,
        private globalService: GlobalService
    ) { }

    public onCloseClick(): void {
        this.dialogRef.close();
    }

    public onGoToToolClick(): void {
        const lang = this.globalService.language;
        let url = 'https://life-notes.fr/tools/pdf/';
        if (lang === 'fr') {
            url += '?lang=fr';
        }
        window.open(url, '_blank');
        this.dialogRef.close();
    }
}
