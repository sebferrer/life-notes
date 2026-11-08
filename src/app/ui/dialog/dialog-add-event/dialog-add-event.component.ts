import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
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
import { SportsService } from 'src/app/infra/sports.service';
import { MealsService } from 'src/app/infra/meals.service';
import { getSortOrder } from 'src/app/util/array.utils';
import { NgxMaterialTimepickerTheme } from 'ngx-material-timepicker';
import { CustomTypesService } from 'src/app/infra/custom-types.service';
import { ICustomType } from 'src/app/models/custom-type.model';

const DARK_TIMEPICKER_THEME: NgxMaterialTimepickerTheme = {
	container: {
		bodyBackgroundColor: '#1e1e1e',
		buttonColor: '#7986cb'
	},
	dial: {
		dialBackgroundColor: '#2a2a2a'
	},
	clockFace: {
		clockFaceBackgroundColor: '#2a2a2a',
		clockHandColor: '#7986cb',
		clockFaceTimeInactiveColor: 'rgba(255, 255, 255, 0.87)',
		clockFaceInnerTimeInactiveColor: 'rgba(255, 255, 255, 0.6)'
	}
};

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
	// Type definition of the 'custom' events
	customType: string;
}

@Component({
	selector: 'app-dialog-add-event',
	templateUrl: 'dialog-add-event.component.html',
	styleUrls: ['dialog-add-event.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class DialogAddEventComponent {
	public myControl = new FormControl();
	public medsOptions: string[];
	public filteredMedsOptions: Observable<string[]>;
	public logsOptions: string[];
	public filteredLogsOptions: Observable<string[]>;
	public sportsOptions: string[];
	public filteredSportsOptions: Observable<string[]>;
	public mealsOptions: string[];
	public filteredMealsOptions: Observable<string[]>;
	public customOptions: string[];
	public filteredCustomOptions: Observable<string[]>;
	// Last quantity of each name of the custom type, suggested with the name
	private lastCustomQuantities = new Map<string, number>();
	public timeFormat: number;
	public timePicker: string;

	constructor(
		public bottomSheetRef: MatBottomSheetRef<DialogAddEventComponent>,
		public globalService: GlobalService,
		public medsService: MedsService,
		public logsService: LogsService,
		public sportsService: SportsService,
		public mealsService: MealsService,
		private customTypesService: CustomTypesService,
		private router: Router,
		@Inject(MAT_BOTTOM_SHEET_DATA) public data: IDialogData
	) {
		data.detailedDate = getDetailedDate(moment(data.date).format('YYYY-MM-DD'));
		this.timeFormat = this.globalService.timeFormat == 'us' ? 12 : 24;
		this.timePicker = this.globalService.timePicker || 'material';
		if (data.customEvent != null) {
			data.edit = true;
			data.type = data.customEvent.type;
			data.time = data.customEvent.time;
			data.key = data.customEvent.key;
			data.detail = data.customEvent.detail;
			data.pain = data.customEvent.pain;
			data.quantity = data.customEvent.quantity;
			data.customType = data.customEvent.customType;
			if (data.type === 'custom') {
				data.quantity = this.displayQuantity(data.quantity);
			}
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
						startWith(this.myControl.value),
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
						startWith(this.myControl.value),
						map(value => this._filter(this.logsOptions, value))
					);
			});
		}
		else if (data.type === 'custom') {
			this.customTypesService.getEntryHistories(data.customType).subscribe(histories => {
				histories.forEach(history => this.lastCustomQuantities.set(history.key, history.lastQuantity));
				this.customOptions = histories.map(history => history.key).filter(key => key !== '');
				this.filteredCustomOptions = this.myControl.valueChanges
					.pipe(
						startWith(this.myControl.value),
						map(value => this._filter(this.customOptions, value))
					);
			});
		}
		else if (data.type === 'sport') {
			this.sportsService.getSports().pipe(
				map(sports => sports.sort(getSortOrder('lastEntry', true)))
			).subscribe(sports => {
				this.sportsOptions = sports.map(sport => sport.key);
				this.filteredSportsOptions = this.myControl.valueChanges
					.pipe(
						startWith(this.myControl.value),
						map(value => this._filter(this.sportsOptions, value))
					);
			});
		}
		else if (data.type === 'meal') {
			this.mealsService.getMeals().pipe(
				map(meals => meals.sort(getSortOrder('lastEntry', true)))
			).subscribe(meals => {
				this.mealsOptions = meals.map(meal => meal.key);
				this.filteredMealsOptions = this.myControl.valueChanges
					.pipe(
						startWith(this.myControl.value),
						map(value => this._filter(this.mealsOptions, value))
					);
			});
		}
	}

	public setMed(med: string) {
		if (this.data.type !== 'med') {
			return;
		}
		const splittedMed = med.split(" ");
		this.data.quantity = parseFloat(splittedMed[splittedMed.length - 2]);
		this.data.key = med.substring(0, med.length - ("" + this.data.quantity).length - 4);
	}

	public setLog(log: string) {
		if (this.data.type !== 'log') {
			return;
		}
		this.data.key = log;
	}

	public setSport(sport: string) {
		if (this.data.type !== 'sport') {
			return;
		}
		this.data.key = sport;
	}

	public setMeal(meal: string) {
		if (this.data.type !== 'meal') {
			return;
		}
		this.data.key = meal;
	}

	public setCustom(key: string) {
		if (this.data.type !== 'custom') {
			return;
		}
		this.data.key = key;
		if (this.customType.quantity && (this.data.quantity == null || ('' + this.data.quantity) === '')) {
			this.data.quantity = this.displayQuantity(this.lastCustomQuantities.get(key));
		}
	}

	public get customType(): ICustomType {
		return this.globalService.getCustomType(this.data.customType);
	}

	public get timepickerTheme(): NgxMaterialTimepickerTheme {
		return this.globalService.darkMode ? DARK_TIMEPICKER_THEME : undefined;
	}

	public get painScale(): number {
		return this.globalService.painScale;
	}

	public get painValue(): number {
		return this.painScale === 10 ? (this.data.pain * 2) : this.data.pain;
	}

	public set painValue(val: number) {
		this.data.pain = this.painScale === 10 ? (+val / 2) : +val;
	}

	// Panel of the suggestions, in the colors of the event type (styles.scss, V2)
	public get suggestionsClass(): string {
		return `suggestions-panel ${this.data.type} ${this.globalService.customTypeClass(this.data.customType)}`;
	}

	// A suggested name cut around what was typed (shown in bold), the dose of a medication apart
	public suggestionParts(option: string): { name: { text: string, match: boolean }[], badge: string } {
		let name = option;
		let badge = '';
		const dose = this.data.type === 'med' ? /^(.+) (\S+ mg)$/.exec(option) : null;
		if (dose != null) {
			name = dose[1];
			badge = dose[2];
		}
		const typed = ('' + (this.myControl.value || '')).trim().toLowerCase();
		const at = typed === '' ? -1 : name.toLowerCase().indexOf(typed);
		if (at < 0) {
			return { name: [{ text: name, match: false }], badge };
		}
		return {
			name: [
				{ text: name.slice(0, at), match: false },
				{ text: name.slice(at, at + typed.length), match: true },
				{ text: name.slice(at + typed.length), match: false }
			].filter(part => part.text !== ''),
			badge
		};
	}

	public trackByIndex(index: number): number {
		return index;
	}

	// The names load in the background: what was typed meanwhile filters them too
	private _filter(options: any[], value: string): string[] {
		const filterValue = (value || '').toLowerCase();

		return options.filter(option => option.toLowerCase().includes(filterValue));
	}

	public isValid(): boolean {
		if (['symptomLog', 'log', 'med', 'meal', 'sport'].includes(this.data.type)) {
			return this.data.time != null && this.data.time !== ''
				&& this.data.key != null && this.data.key !== '';
		}
		if (this.data.type === 'custom') {
			// The name is optional, the quantity must be a number
			return this.data.time != null && this.data.time !== ''
				&& (!this.customType.quantity || this.parseQuantity(this.data.quantity) !== undefined);
		}
		return this.data.time != null && this.data.time !== '';
	}

	public onNoClick(): void {
		this.bottomSheetRef.dismiss({ 'answer': 'no' });
	}

	// Quantity in the input, with the decimal separator of the language (parsed back by parseQuantity)
	private displayQuantity(quantity: number): any {
		return quantity == null ? null : ('' + quantity).replace('.', this.globalService.language === 'fr' ? ',' : '.');
	}

	// Number typed with a comma or a dot. null when empty, undefined when it isn't a number.
	private parseQuantity(value: any): number {
		if (value == null || ('' + value).trim() === '') {
			return null;
		}
		const quantity = Number(('' + value).trim().replace(',', '.'));
		return isNaN(quantity) || quantity < 0 ? undefined : quantity;
	}

	public onYesClick(): void {
		const custom = this.data.type === 'custom';
		this.bottomSheetRef.dismiss({
			'answer': 'yes',
			'edit': this.data.edit,
			'time': this.data.time,
			'type': this.data.type,
			'key': custom ? (this.data.key || '').trim() : this.data.key,
			'pain': this.data.pain,
			'detail': this.data.detail,
			// Without quantity in the type, the one typed before is kept (hidden, back if the quantity is turned on)
			'quantity': custom ? (this.parseQuantity(this.data.quantity) ?? null) : this.data.quantity,
			'customType': this.data.customType
		});
	}

	public onSymptomsClick(): void {
		this.bottomSheetRef.dismiss({ 'answer': 'symptoms' });
		this.router.navigate(['/symptoms']);
	}


	public get isoTime(): string {
		// Construct ISO string from date and time
		// data.date is YYYY-MM-DD, data.time is HH:mm
		return this.data.date + 'T' + this.data.time;
	}

	public set isoTime(value: string) {
		// Extract HH:mm from ISO string
		if (value) {
			this.data.time = moment(value).format('HH:mm');
		}
	}
}
