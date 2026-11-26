import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
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
import { BottomSheetShareMonthComponent, IShareMonthData } from '../bottom-sheet/bottom-sheet-share-month';
import { getShareableSymptoms, hasSleepToShare } from 'src/app/models/month-share.model';
import { SleepChartMode } from '../sleep-stats';
import { NavigationMemoryService } from 'src/app/infra/navigation-memory.service';
import * as moment from 'moment';

// What the calendar showed, found again with the back button (see NavigationMemoryService)
interface ICalendarState {
	month: number;
	year: number;
	showAllSymptoms: boolean;
	sleepChartMode: SleepChartMode;
	scrollY: number;
}

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
export class CalendarComponent implements OnInit, OnDestroy {

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
	// V2: whether the share button is shown: symptoms with an intensity in the month (their order is the one of the
	// sheet, see openShareSheet), or a complete night of sleep
	public shareableSymptoms: ISymptom[] = [];
	public shareableSleep = false;
	// Month of the days loaded (overviews): the arrows change the month of the header at once, its days come later
	private loadedMonth: number;
	private loadedYear: number;
	// V2: mode of the sleep card, the one of the settings until changed with its buttons: the shared image and the PDF
	// report opened from the share draw the sleep in the same one
	public sleepChartMode: SleepChartMode;
	public weekDays: number[];

	public debug: string;
	private subscriptions = new Subscription();
	// Back from a day: the position of the page, once the month is drawn again
	private restoredScrollY: number = null;

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		public translocoService: TranslocoService,
		public importerExporterService: ImporterExporterService,
		private dialog: MatDialog,
		private bottomSheet: MatBottomSheet,
		private router: Router,
		private navigationMemory: NavigationMemoryService
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
		this.sleepChartMode = globalService.sleepChartMode === 'curves' ? 'curves' : 'bars';
	}

	public ngOnInit(): void {
		const detailedDate = getDetailedDate(moment().format('YYYY-MM-DD'));
		this.month = detailedDate.month;
		this.year = detailedDate.year;
		this.today = getDetailedDate(moment().format('YYYY-MM-DD'));
		// Back from a day opened from the calendar (or another page): the month shown then, as it was
		const state = this.navigationMemory.restore<ICalendarState>('calendar');
		if (state != null) {
			this.month = state.month;
			this.year = state.year;
			this.showAllSymptoms = state.showAllSymptoms;
			this.sleepChartMode = state.sleepChartMode;
			this.restoredScrollY = state.scrollY;
		}
		this.subscriptions.add(this.router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe(() => {
			this.navigationMemory.save<ICalendarState>('calendar', {
				month: this.month,
				year: this.year,
				showAllSymptoms: this.showAllSymptoms,
				sleepChartMode: this.sleepChartMode,
				scrollY: window.scrollY
			});
		}));
		// The symptoms are loaded again with each month: their charts follow (subscribed once, before the template)
		this.symptoms$.subscribe(symptoms => this.updateSymptomCharts(symptoms));
		this.updateCalendar(this.month, this.year);
		this.symptomMap = this.globalService.symptomMap;
	}

	public ngOnDestroy(): void {
		this.subscriptions.unsubscribe();
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
		this.updateSymptomCharts(this.symptoms$.value);
		this.bedTimeChart.timeFormat = this.globalService.timeFormat;
		this.bedTimeChart.update(this.overviews);
		this.wakeUpChart.timeFormat = this.globalService.timeFormat;
		this.wakeUpChart.update(this.overviews);
		this.sleepChart.update(this.overviews, this.previousOverviews);
		this.shareableSleep = hasSleepToShare(this.overviews, this.previousOverviews);
	}

	private updateSymptomCharts(symptoms: ISymptom[]): void {
		// null: a target symptom which no longer exists (see organizeSymptoms)
		symptoms.filter(symptom => symptom != null).forEach(symptom => {
			this.pieCharts.set(symptom.key, new CalendarPieChartViewModel('doughnut', symptom.key,
				this.globalService.getPainColors(), !!symptom.invertedScale));
			this.pieCharts.get(symptom.key).update(this.overviews, this.globalService.painScale);
			this.intensitySummaries.set(symptom.key, getIntensitySummary(this.pieCharts.get(symptom.key),
				this.overviews, symptom.key, !!symptom.invertedScale, this.globalService.painScale));
		});
		this.shareableSymptoms = getShareableSymptoms(symptoms, this.overviews);
	}

	public updateCalendar(month: number, year: number): void {
		this.weekDays = this.globalService.calendarStartOnSunday ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
		this.loadSymptoms();
		this.daysService.getMonthAndPreviousDaysOverviews(month, year).subscribe(({ days, previousDays }) => {
			// A faster tap on the arrows asked for another month meanwhile
			if (month !== this.month || year !== this.year) {
				return;
			}
			this.overviews = days.map(day => new DayOverviewViewModel(day));
			this.previousOverviews = previousDays.map(day => new DayOverviewViewModel(day));
			this.loadedMonth = month;
			this.loadedYear = year;

			this.overviews$.next(this.overviews);
			this.previousOverviews$.next(this.previousOverviews);
			this.calculateEmptySlots();
			this.updateCharts();
			if (this.restoredScrollY != null) {
				const scrollY = this.restoredScrollY;
				this.restoredScrollY = null;
				this.navigationMemory.scrollWhenReady(() => scrollY);
			}
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

	// V2: the days of the month of the header are being loaded, the ones shown are still those of the month before
	public get loadingMonth(): boolean {
		return this.loadedMonth !== this.month || this.loadedYear !== this.year;
	}

	// V2: the month of a symptom or the sleep as an image, with its message. Never while another month is loaded (its
	// name with the days of the one before). The symptom shown by the calendar first: the target symptom may have changed
	// in the toolbar since the symptoms were loaded, in the order of that time.
	public openShareSheet(): void {
		if (this.loadingMonth) {
			return;
		}
		const symptoms = this.organizeSymptoms(this.symptoms.filter(symptom => symptom != null)
			.sort((a, b) => (a.label || '').localeCompare(b.label || '')));
		const data: IShareMonthData = {
			month: this.loadedMonth,
			year: this.loadedYear,
			symptoms: getShareableSymptoms(symptoms, this.overviews),
			overviews: this.overviews,
			previousOverviews: this.previousOverviews,
			weekDays: this.globalService.calendarBlockView ? [] : this.weekDays,
			emptySlots: this.emptySlots.length,
			sleepChartMode: this.sleepChartMode
		};
		this.bottomSheet.open(BottomSheetShareMonthComponent, {
			panelClass: ['event-bottom-sheet', 'share-month-panel'],
			data
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
