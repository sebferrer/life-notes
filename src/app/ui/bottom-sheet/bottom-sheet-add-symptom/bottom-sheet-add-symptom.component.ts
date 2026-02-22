import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { ISymptom } from 'src/app/models/symptom.model';

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
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetAddSymptomData
    ) {
        // Ensure data.edit is set correctly if not passed or based on key
        if (data.edit === undefined) {
            data.edit = data.symptom.key != null;
        }
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
        });
    }
}
