import { Component, Inject, ViewEncapsulation, NgZone } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { DaysService } from 'src/app/infra';
import { ICustomEvent } from 'src/app/models/customEvent.model';
import { IDeleteConfirmationDetails } from '../../bottom-sheet/bottom-sheet-delete-event';

export interface IOccurrence {
    date: string;
    time: string;
    detail?: string;
    quantity?: number;
}

export interface IOccurrenceHistoryData {
    title: string;
    type: 'med' | 'log';
    key: string;
    quantity?: number;
    occurrences: IOccurrence[];
}

@Component({
    selector: 'app-dialog-occurrence-history',
    templateUrl: 'dialog-occurrence-history.component.html',
    styleUrls: ['dialog-occurrence-history.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DialogOccurrenceHistoryComponent {
    public hasChanges = false;
    public view: 'list' | 'confirm' = 'list';
    public eventToDelete: { occ: IOccurrence, index: number } | null = null;

    // Confirmation context
    public deleteTitle: string = 'DELETE_OCCURRENCE_TITLE';
    public deleteMessage: string = 'DELETE_OCCURRENCE_CONTENT';
    public deleteWarning: string = 'IRREVERSIBLE_ACTION';
    public itemDetails: IDeleteConfirmationDetails | null = null;

    constructor(
        public bottomSheetRef: MatBottomSheetRef<DialogOccurrenceHistoryComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IOccurrenceHistoryData,
        private daysService: DaysService,
        private zone: NgZone
    ) {
        // Sort descending: most recent first
        this.data.occurrences.sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
    }

    public onClose(): void {
        this.bottomSheetRef.dismiss({ hasChanges: this.hasChanges, reopen: false });
    }

    public formatDate(date: string): string {
        if (!date) return '';
        const d = new Date(date);
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }

    public formatTime(time: string): string {
        return time || '';
    }

    public deleteOccurrence(occ: IOccurrence, index: number): void {
        this.eventToDelete = { occ, index };

        this.itemDetails = {
            type: this.data.type,
            name: this.data.title, // Title is e.g. "Doliprane 1000mg" or "Headache"
            dateLabel: this.formatDate(occ.date),
            timeLabel: this.formatTime(occ.time),
            quantityLabel: occ.quantity ? `${occ.quantity} mg` : undefined, // Assuming mg, but maybe unit is needed? Meds usually have quantity.
            detail: occ.detail
        };

        if (this.data.type === 'med' && this.data.quantity) {
            // If the main title already contains quantity, we might duplicate it.
            // data.title usually comes from MedsComponent: "med.key + (med.quantity ? ' ' + med.quantity + ' mg' : '')"
            // So itemDetails.name already has quantity.
            // But occ.quantity might be different? No, history groups by Med+Qty usually?
            // Actually, Meds are grouped by Key+Quantity.
            // So occ.quantity should match data.quantity.
            // Let's hide quantityLabel if it's already in name?
            // Or just show it to be explicit.
            this.itemDetails.quantityLabel = undefined; // Already in title
        } else if (this.data.type === 'med' && occ.quantity) {
            this.itemDetails.quantityLabel = `${occ.quantity} mg`;
        }

        this.view = 'confirm';
    }

    public onConfirmDelete(): void {
        if (!this.eventToDelete) return;

        const { occ, index } = this.eventToDelete;
        const customEvent: ICustomEvent = {
            type: this.data.type,
            time: occ.time,
            key: this.data.key,
            detail: occ.detail,
            pain: null,
            quantity: occ.quantity
        };

        this.daysService.deleteDeepEvent(occ.date, customEvent).subscribe(() => {
            this.zone.run(() => {
                this.data.occurrences.splice(index, 1);
                this.hasChanges = true;
                this.bottomSheetRef.dismiss({ hasChanges: true, reopen: true });
            });
        });
    }

    public onCancelDelete(): void {
        this.view = 'list';
        this.eventToDelete = null;
    }
}
