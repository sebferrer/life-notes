import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { ISymptomOverview } from 'src/app/models/symptom.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';

export interface IBottomSheetEditSymptomOverviewData {
    date: string;
    symptomOverview: ISymptomOverview;
    symptomMap: Map<string, string>;
}

@Component({
    selector: 'app-bottom-sheet-edit-symptom-overview',
    templateUrl: 'bottom-sheet-edit-symptom-overview.component.html',
    styleUrls: ['bottom-sheet-edit-symptom-overview.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetEditSymptomOverviewComponent {


    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetEditSymptomOverviewComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetEditSymptomOverviewData,
        private globalService: GlobalService
    ) {
    }

    public get painScale(): number {
        return this.globalService.painScale;
    }

    public get painValue(): number {
        const pain = this.data?.symptomOverview?.pain ?? 0;
        return this.painScale === 10 ? (pain * 2) : Math.ceil(pain);
    }

    public set painValue(val: number) {
        // Direct update of data object, similar to DialogAddEvent
        if (this.data && this.data.symptomOverview) {
            const finalPain = this.painScale === 10 ? (+val / 2) : +val;
            this.data.symptomOverview.pain = finalPain;
        }
    }

    public onCancel(): void {
        this.bottomSheetRef.dismiss({ answer: 'no' });
    }

    public onConfirm(): void {
        this.bottomSheetRef.dismiss({
            answer: 'yes',
            data: this.data.date,
            key: this.data.symptomOverview.key,
            pain: this.data.symptomOverview.pain
        });
    }
}
