import { Component, OnInit } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { DaysService, ImporterExporterService } from 'src/app/infra';
import { getDetailedDate } from 'src/app/util/date.utils';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { GlobalService } from 'src/app/infra/global.service';
import { ISymptom } from 'src/app/models/symptom.model';
import { TranslocoService } from '@ngneat/transloco';
import { CalendarPieChartViewModel } from 'src/app/models/chartjs/calendar.pie.chart.view.model';
import { IIntensitySummary, getIntensitySummary } from 'src/app/models/intensity-summary.model';
import { BedTimeChartViewModel } from 'src/app/models/chartjs/bedtime.chart.view.model';
import { WakeUpChartViewModel } from 'src/app/models/chartjs/wakeup.chart.view.model';
import { SleepChartViewModel } from 'src/app/models/chartjs/sleep.chart.view.model';
import { DialogInfoComponent } from '../dialog/dialog-info';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { BottomSheetInfoComponent } from '../bottom-sheet/bottom-sheet-info';
import * as moment from 'moment';

// Symptoms of one scale (V2): their rings share one legend
export interface IPieGroup {
	inverted: boolean;
	symptoms: ISymptom[];
}

@Component({
	selector: 'app-calendar',
	templateUrl: './calendar.component.html',
	styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

	public overviews: DayOverviewViewModel[];
	public overviews$: Subject<DayOverviewViewModel[]>;
	public previousOverviews: DayOverviewViewModel[];
	public previousOverviews$: Subject<DayOverviewViewModel[]>;
	public symptoms: ISymptom[];
	public symptoms$: BehaviorSubject<ISymptom[]>;
	public month: number;
	public year: number;
	public symptomMap: Map<string, string>;
	public monthMap: Map<number, string>;
	public today: IDetailedDate;
	private readonly todayDate = moment().format('YYYY-MM-DD');
	public pieCharts: Map<string, CalendarPieChartViewModel>;
	// V2: the same days as the pie charts, summed up in rings
	public intensitySummaries = new Map<string, IIntensitySummary>();
	public bedTimeChart: BedTimeChartViewModel;
	public wakeUpChart: WakeUpChartViewModel;
	public sleepChart: SleepChartViewModel;
	public emptySlots: any[] = [];
	// V2: the pie charts of the symptoms without any entry (intensity or occurrence) in the month are hidden, unless all are asked for
	public showAllSymptoms = false;
	private symptomKeysWithEntry = new Set<string>();
	public weekDays: number[];

	public debug: string;

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		public translocoService: TranslocoService,
		public importerExporterService: ImporterExporterService,
		private dialog: MatDialog,
		private bottomSheet: MatBottomSheet
	) {
		this.pieCharts = new Map<string, CalendarPieChartViewModel>();
		this.bedTimeChart = new BedTimeChartViewModel('line');
		this.wakeUpChart = new WakeUpChartViewModel('line');
		this.sleepChart = new SleepChartViewModel('line');
		this.symptoms = new Array<ISymptom>();
		this.symptoms$ = new BehaviorSubject<ISymptom[]>(new Array<ISymptom>());
		this.overviews = new Array<DayOverviewViewModel>();
		this.overviews$ = new Subject<DayOverviewViewModel[]>();
		this.previousOverviews = new Array<DayOverviewViewModel>();
		this.previousOverviews$ = new Subject<DayOverviewViewModel[]>();
	}

	public ngOnInit(): void {
		const detailedDate = getDetailedDate(moment().format('YYYY-MM-DD'));
		this.month = detailedDate.month;
		this.year = detailedDate.year;
		this.today = getDetailedDate(moment().format('YYYY-MM-DD'));
		this.updateCalendar(this.today.month, this.today.year);
		this.symptomMap = this.globalService.symptomMap;
	}

	public htmltoPDF() {
		this.importerExporterService.htmltoPDF(document.body);
	}

	public organizeSymptoms(symptoms: ISymptom[]): ISymptom[] {
		if (symptoms.length === 0 || this.globalService.targetSymptomKey == null || this.globalService.targetSymptomKey === '') {
			return symptoms;
		}
		const targetSymptom = this.symptoms.find(symptom => symptom.key === this.globalService.targetSymptomKey);
		symptoms = symptoms.filter(symptom => symptom.key !== this.globalService.targetSymptomKey);
		symptoms.unshift(targetSymptom);
		return symptoms;
	}

	public pieSymptoms(symptoms: ISymptom[]): ISymptom[] {
		const organized = this.organizeSymptoms(symptoms);
		if (this.globalService.isUiV1 || this.showAllSymptoms) {
			return organized;
		}
		return organized.filter(symptom => symptom != null && this.symptomKeysWithEntry.has(symptom.key));
	}

	// The symptoms of the normal scale and the ones of the inverted scale apart, the group of the target symptom first
	public pieGroups(symptoms: ISymptom[]): IPieGroup[] {
		const groups: IPieGroup[] = [];
		symptoms.forEach(symptom => {
			const inverted = !!symptom.invertedScale;
			let group = groups.find(g => g.inverted === inverted);
			if (group == null) {
				group = { inverted, symptoms: [] };
				groups.push(group);
			}
			group.symptoms.push(symptom);
		});
		return groups;
	}

	// The groups are computed again at each check: their charts must not be created again
	public trackPieGroup(index: number, group: IPieGroup): boolean {
		return group.inverted;
	}

	public legendColor(symptomKey: string, level: number): string {
		return this.pieCharts.get(symptomKey).colors[0].backgroundColor[level];
	}

	public countSymptomsWithoutEntry(symptoms: ISymptom[]): number {
		return symptoms.filter(symptom => symptom != null && !this.symptomKeysWithEntry.has(symptom.key)).length;
	}

	public loadSymptoms(): void {
		this.globalService.symptoms$.subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.symptoms = this.organizeSymptoms(this.symptoms);
			this.symptoms$.next(this.symptoms);
		});
	}

	public updateCharts(): void {
		this.symptomKeysWithEntry = new Set<string>();
		this.overviews.forEach(overview => {
			overview.symptomOverviews.forEach(symptom => this.symptomKeysWithEntry.add(symptom.key));
			overview.loggedSymptomKeys.forEach(key => this.symptomKeysWithEntry.add(key));
		});
		this.symptoms$.subscribe(symptoms => {
			symptoms.forEach(symptom => {
				this.pieCharts.set(symptom.key, new CalendarPieChartViewModel('doughnut', symptom.key,
					this.globalService.getPainColors(), !!symptom.invertedScale));
				this.pieCharts.get(symptom.key).update(this.overviews, this.globalService.painScale);
				this.intensitySummaries.set(symptom.key, getIntensitySummary(this.pieCharts.get(symptom.key),
					this.overviews, symptom.key, !!symptom.invertedScale, this.globalService.painScale));
			});
		});
		this.bedTimeChart.timeFormat = this.globalService.timeFormat;
		this.bedTimeChart.update(this.overviews);
		this.wakeUpChart.timeFormat = this.globalService.timeFormat;
		this.wakeUpChart.update(this.overviews);
		this.sleepChart.update(this.overviews, this.previousOverviews);
	}

	public updateCalendar(month: number, year: number): void {
		this.weekDays = this.globalService.calendarStartOnSunday ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
		this.loadSymptoms();
		this.daysService.getMonthDaysOverviews(month, year).subscribe(
			days => {
				const previousMonth = month - 1 === 0 ? 12 : month - 1;
				const previousYear = previousMonth === 12 ? year - 1 : year;
				this.daysService.getMonthDaysOverviews(previousMonth, previousYear).subscribe(
					previousDays => {
						this.overviews = new Array<DayOverviewViewModel>();
						days.forEach(day => {
							this.overviews.push(new DayOverviewViewModel(day));
						});
						this.previousOverviews = new Array<DayOverviewViewModel>();
						previousDays.forEach(day => {
							this.previousOverviews.push(new DayOverviewViewModel(day));
						});

						this.overviews$.next(this.overviews);
						this.previousOverviews$.next(this.previousOverviews);
						this.calculateEmptySlots();
						this.updateCharts();
					});
			});
	}

	public calculateEmptySlots(): void {
		if (this.globalService.calendarBlockView) {
			this.emptySlots = [];
			return;
		}
		const firstDayOfMonth = moment([this.year, this.month - 1]);
		const dayOfWeek = firstDayOfMonth.day(); // 0=Sun, 1=Mon...

		let slots = 0;
		if (this.globalService.calendarStartOnSunday) {
			// Start Sunday (0).
			// If Sun(0) -> 0 slots. Mon(1) -> 1 slot.
			slots = dayOfWeek;
		} else {
			// Start Monday (1).
			// If Mon(1) -> 0 slots. Tue(2) -> 1 slot. ... Sun(0) -> 6 slots.
			slots = (dayOfWeek + 6) % 7;
		}
		this.emptySlots = new Array(slots);
	}

	public previous(): void {
		this.month--;
		if (this.month === 0) {
			this.month = 12;
			this.year--;
		}
		this.updateCalendar(this.month, this.year);
	}

	public next(): void {
		this.month++;
		if (this.month === 13) {
			this.month = 1;
			this.year++;
		}
		this.updateCalendar(this.month, this.year);
	}

	public openHelpDialog(): void {
		this.dialog.open(DialogInfoComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'CALENDAR_HELP_DIALOG_TITLE',
				content: ['CALENDAR_HELP_DIALOG_CONTENT_1', 'CALENDAR_HELP_DIALOG_CONTENT_2']
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'close') {
				return;
			}
		});
	}

	// V2: the same help in a sheet
	public openHelpSheet(): void {
		this.bottomSheet.open(BottomSheetInfoComponent, {
			panelClass: 'bottom-sheet-container',
			data: {
				titleKey: 'CALENDAR_HELP_DIALOG_TITLE',
				contentKeys: ['CALENDAR_HELP_DIALOG_CONTENT_1', 'CALENDAR_HELP_DIALOG_CONTENT_2']
			}
		});
	}

	public getPainColor(day: DayOverviewViewModel, symptomKey: string): string {
		return this.globalService.getPainColorClass(symptomKey, day.findSymptomPain(symptomKey));
	}

	public isToday(overview: DayOverviewViewModel): boolean {
		return overview.date === this.todayDate;
	}

	public isFuture(overview: DayOverviewViewModel): boolean {
		// ISO dates (YYYY-MM-DD) compare as strings
		return overview.date > this.todayDate;
	}
}
