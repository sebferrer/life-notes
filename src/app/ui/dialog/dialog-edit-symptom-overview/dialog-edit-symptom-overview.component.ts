import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ISymptomOverview } from 'src/app/models/symptom.model';
import { GlobalService } from 'src/app/infra/global.service';

export interface IDialogData {
	date: string;
	symptomOverview: ISymptomOverview;
	symptomMap: Map<string, string>;
}

@Component({
	selector: 'app-dialog-edit-symptom-overview',
	templateUrl: 'dialog-edit-symptom-overview.component.html'
})
export class DialogEditSymptomOverviewComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogEditSymptomOverviewComponent>,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData,
		private globalService: GlobalService
	) { }

	public get painScale(): number {
		return this.globalService.painScale;
	}

	public get painValue(): number {
		return this.painScale === 10 ? (this.data.symptomOverview.pain * 2) : Math.ceil(this.data.symptomOverview.pain);
	}

	public set painValue(val: number) {
		this.data.symptomOverview.pain = this.painScale === 10 ? (val / 2) : val;
	}

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({
			'answer': 'yes',
			'data': this.data.date,
			'key': this.data.symptomOverview.key,
			'pain': this.data.symptomOverview.pain,
		});
	}
}
