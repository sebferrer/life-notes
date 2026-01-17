import { Component, ElementRef, OnInit } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { DaysService, ImporterExporterService } from 'src/app/infra';
import { getDetailedDate } from 'src/app/util/date.utils';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { GlobalService } from 'src/app/infra/global.service';
import { ISymptom } from 'src/app/models/symptom.model';
import { TranslocoService } from '@ngneat/transloco';
import { CalendarPieChartViewModel } from 'src/app/models/chartjs/calendar.pie.chart.view.model';
import { BedTimeChartViewModel } from 'src/app/models/chartjs/bedtime.chart.view.model';
import { WakeUpChartViewModel } from 'src/app/models/chartjs/wakeup.chart.view.model';
import { SleepChartViewModel } from 'src/app/models/chartjs/sleep.chart.view.model';
import { DialogInfoComponent } from '../dialog/dialog-info';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { endOfToday } from 'date-fns';

@Component({
	selector: 'app-monthly-report',
	templateUrl: './monthly-report.component.html',
	styleUrls: ['./monthly-report.component.scss']
})
export class MonthlyReportComponent implements OnInit {

	public overviews: DayOverviewViewModel[];
	public overviews$: Subject<DayOverviewViewModel[]>;
	public previousOverviews: DayOverviewViewModel[];
	public previousOverviews$: Subject<DayOverviewViewModel[]>;
	public symptoms: ISymptom[];
	public symptoms$: BehaviorSubject<ISymptom[]>;
	public month: number;
	public year: number;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;
	public monthMap: Map<number, string>;
	public today: IDetailedDate;
	public pieCharts: Map<string, CalendarPieChartViewModel>;
	public bedTimeChart: BedTimeChartViewModel;
	public wakeUpChart: WakeUpChartViewModel;
	public sleepChart: SleepChartViewModel;

	public debug = 'no error';

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		public translocoService: TranslocoService,
		public importerExporterService: ImporterExporterService,
		private dialog: MatDialog,
		private route: ActivatedRoute,
		private elementRef: ElementRef
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
		const monthYear = this.route.snapshot.paramMap.get('monthyear').split('-');
		this.month = parseInt(monthYear[1]);
		this.year = parseInt(monthYear[0]);
		this.today = getDetailedDate(moment().format('YYYY-MM-DD'));
		this.updateCalendar(this.month, this.year);
		this.symptomMap = this.globalService.symptomMap;
		this.symptomPainColorMap =
			new Map([[0, 'default'], [1, 'pain-1'], [2, 'pain-2'], [3, 'pain-3'], [4, 'pain-4'], [5, 'pain-5']]);
		const self = this;
		setTimeout(function () {
			self.htmltoPDF();
		}, 2000);
	}

	public htmltoPDF() {
		// const div = this.elementRef.nativeElement.querySelector('content');
		
		this.importerExporterService.htmltoPDF(document.body);
		this.debug = this.importerExporterService.debug;
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

	public loadSymptoms(): void {
		this.globalService.symptoms$.subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.symptoms = this.organizeSymptoms(this.symptoms);
			this.symptoms$.next(this.symptoms);
		});
	}

	public updateCharts(): void {
		this.symptoms$.subscribe(symptoms => {
			symptoms.forEach(symptom => {
				this.pieCharts.set(symptom.key, new CalendarPieChartViewModel('doughnut', symptom.key));
				this.pieCharts.get(symptom.key).update(this.overviews, this.globalService.painScale);
			});
		})
		this.bedTimeChart.update(this.overviews);
		this.wakeUpChart.update(this.overviews);
		this.sleepChart.update(this.overviews, this.previousOverviews);
	}

	public updateCalendar(month: number, year: number): void {
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
						this.updateCharts();
					});
			});
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

	public getPainColor(pain: number): string {
		return this.symptomPainColorMap.get(Math.ceil(pain));
	}
}
