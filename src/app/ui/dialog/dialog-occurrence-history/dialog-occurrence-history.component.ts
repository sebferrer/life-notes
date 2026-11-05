import { Component, Inject, ViewEncapsulation, NgZone } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { DaysService } from 'src/app/infra';
import { ICustomEvent } from 'src/app/models/customEvent.model';
import { IDeleteConfirmationDetails } from '../../bottom-sheet/bottom-sheet-delete-event';
import { GlobalService } from 'src/app/infra/global.service';
import { IStatsIntensity } from 'src/app/models/occurrence-stats.model';

export interface IOccurrence {
    date: string;
    time: string;
    detail?: string;
    quantity?: number;
    // Symptoms
    pain?: number;
}

export interface IOccurrenceHistoryData {
    title: string;
    type: 'symptomLog' | 'med' | 'log' | 'sport' | 'custom';
    // Type definition of the 'custom' entries
    customType?: string;
    key: string;
    quantity?: number;
    occurrences: IOccurrence[];
    // Intensities of the days, for a symptom
    intensities?: IStatsIntensity[];
    // The history after a deletion. By default, the statistics in V2 and the history in V1.
    tab?: 'stats' | 'history';
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
    public tab: 'stats' | 'history';
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
        public globalService: GlobalService,
        private zone: NgZone
    ) {
        this.tab = data.tab || (globalService.isUiV1 ? 'history' : 'stats');
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

    public quantityLabel(occ: IOccurrence): string {
        if (this.data.type === 'symptomLog') {
            const painScale = this.globalService.painScale;
            return occ.pain == null ? '' : (painScale === 10 ? occ.pain * 2 : Math.ceil(occ.pain)) + '/' + painScale;
        }
        return this.data.type === 'custom'
            ? this.globalService.customQuantityLabel({ customType: this.data.customType, quantity: occ.quantity }) : '';
    }

    // Bars of the charts in the color of the event type
    public get eventColor(): string {
        if (this.data.type === 'custom') {
            const colors = this.globalService.getCustomType(this.data.customType).colors;
            return this.globalService.darkMode ? colors.dark : colors.light;
        }
        return this.globalService.eventColors[this.data.type];
    }

    // The custom types with a quantity show its evolution
    public get hasQuantities(): boolean {
        return this.data.type === 'custom' && this.globalService.getCustomType(this.data.customType).quantity;
    }

    public get unit(): string {
        return this.data.type === 'custom' ? this.globalService.getCustomType(this.data.customType).unit : '';
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
        } else if (this.data.type === 'symptomLog') {
            this.itemDetails.quantityLabel = this.quantityLabel(occ) || undefined;
        } else if (this.data.type === 'custom') {
            this.itemDetails.customType = this.data.customType;
            this.itemDetails.quantityLabel = this.globalService.customQuantityLabel({
                customType: this.data.customType, quantity: occ.quantity
            }) || undefined;
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
            quantity: occ.quantity,
            customType: this.data.customType
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
