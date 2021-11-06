import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ICustomEvent } from 'src/app/models/customEvent.model';
import { ISymptom } from 'src/app/models/symptom.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { getDetailedDate } from 'src/app/util/date.utils';
import { GlobalService } from 'src/app/infra/global.service';
import * as moment from 'moment';
import { Observable } from 'rxjs';
import { FormControl } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';
import { MedsService } from 'src/app/infra/meds.service';
import { LogsService } from 'src/app/infra/logs.service';
import { getSortOrder } from 'src/app/util/array.utils';

export interface IDialogData {
	date: string;
	detailedDate: IDetailedDate;
	monthShort: string;
	type: string;
	time: string;
	key: string;
	detail: string;
	pain: number;
	quantity: number;
	wakeUp: string;
	goToBed: string;
	customEvent: ICustomEvent;
	symptoms: ISymptom[];
	edit: boolean;
}

@Component({
	selector: 'app-dialog-add-event',
	templateUrl: 'dialog-add-event.component.html'
})
export class DialogAddEventComponent {
	public myControl = new FormControl();
	public medsOptions: string[];
	public filteredMedsOptions: Observable<string[]>;
	public logsOptions: string[];
	public filteredLogsOptions: Observable<string[]>;
	public timeFormat: number;

	constructor(
		public dialogRef: MatDialogRef<DialogAddEventComponent>,
		public globalService: GlobalService,
		public medsService: MedsService,
		public logsService: LogsService,
		@Inject(MAT_DIALOG_DATA) public data: IDialogData
	) {
		data.detailedDate = getDetailedDate(moment(data.date).format('YYYY-MM-DD'));
		this.timeFormat = this.globalService.timeFormat == 'us' ? 12 : 24;
		if (data.customEvent != null) {
			data.edit = true;
			data.type = data.customEvent.type;
			data.time = data.customEvent.time;
			data.key = data.customEvent.key;
			data.detail = data.customEvent.detail;
			data.pain = data.customEvent.pain;
			data.quantity = data.customEvent.quantity;
		} else {
			data.edit = false;
			data.pain = 0;
			if (data.type === 'symptomLog') {
				data.key = globalService.targetSymptomKey;
			}
			data.time = moment().format('HH:mm');
		}

		if (data.type === 'med') {
			this.medsService.getMeds().pipe(
				map(meds => meds.sort(getSortOrder('lastEntry', true)))
			).subscribe(meds => {
				this.medsOptions = meds.map(med => med.key + " " + med.quantity + " mg");
				this.filteredMedsOptions = this.myControl.valueChanges
					.pipe(
						startWith(''),
						map(value => this._filter(this.medsOptions, value))
					);
			});
		}
		else if (data.type === 'log') {
			this.logsService.getLogs().pipe(
				map(logs => logs.sort(getSortOrder('lastEntry', true)))
			).subscribe(logs => {
				this.logsOptions = logs.map(log => log.key);
				this.filteredLogsOptions = this.myControl.valueChanges
					.pipe(
						startWith(''),
						map(value => this._filter(this.logsOptions, value))
					);
			});
		}
	}

	public setMed(med: string) {
		if(this.data.type !== 'med') {
			return;
		}
		const splittedMed = med.split(" ");
		this.data.quantity = parseFloat(splittedMed[splittedMed.length - 2]);
		this.data.key = med.substring(0, med.length - ("" + this.data.quantity).length - 4);
	}

	public setLog(log: string) {
		if(this.data.type !== 'log') {
			return;
		}
		this.data.key = log;
	}

	private _filter(options: any[], value: string): string[] {
		const filterValue = value.toLowerCase();

		return options.filter(option => option.toLowerCase().includes(filterValue));
	}

	public isValid(): boolean {
		if (['symptomLog', 'log', 'med', 'meal'].includes(this.data.type)) {
			return this.data.time != null && this.data.time !== ''
				&& this.data.key != null && this.data.key !== '';
		}
		return this.data.time != null && this.data.time !== '';
	}

	public onNoClick(): void {
		this.dialogRef.close({ 'answer': 'no' });
	}

	public onYesClick(): void {
		this.dialogRef.close({
			'answer': 'yes',
			'edit': this.data.edit,
			'time': this.data.time,
			'type': this.data.type,
			'key': this.data.key,
			'pain': this.data.pain,
			'detail': this.data.detail,
			'quantity': this.data.quantity
		});
	}

	public onSymptomsClick(): void {
		this.dialogRef.close({ 'answer': 'symptoms' });
	}
}
