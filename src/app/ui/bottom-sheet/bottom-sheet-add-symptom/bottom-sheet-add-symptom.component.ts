import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { ISymptom, getPainColorLevel } from 'src/app/models/symptom.model';
import { GlobalService } from 'src/app/infra/global.service';

export interface IBottomSheetAddSymptomData {
    symptom: ISymptom;
    edit: boolean;
}

@Component({
    selector: 'app-bottom-sheet-add-symptom',
    templateUrl: 'bottom-sheet-add-symptom.component.html',
    styleUrls: ['bottom-sheet-add-symptom.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class BottomSheetAddSymptomComponent {
    constructor(
        private bottomSheetRef: MatBottomSheetRef<BottomSheetAddSymptomComponent>,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetAddSymptomData,
        private globalService: GlobalService
    ) {
        // Ensure data.edit is set correctly if not passed or based on key
        if (data.edit === undefined) {
            data.edit = data.symptom.key != null;
        }
    }

    public get painScale(): number {
        return this.globalService.painScale;
    }

    // Colors of the levels, from 0 to the maximum
    public get scaleColors(): string[] {
        const colors = this.globalService.getPainColors();
        return colors.map((_, level) => colors[getPainColorLevel(level, !!this.data.symptom.invertedScale)]);
    }

    public onNoClick(): void {
        this.bottomSheetRef.dismiss({ 'answer': 'no' });
    }

    public onYesClick(): void {
        this.bottomSheetRef.dismiss({
            'answer': 'yes',
            'edit': this.data.edit,
            'key': this.data.symptom.key,
            'label': this.data.symptom.label,
            'invertedScale': !!this.data.symptom.invertedScale
        });
    }
}
