import { Component, OnInit } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { getDetailedDate } from 'src/app/util/date.utils';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { GlobalService } from 'src/app/infra/global.service';
import { ISymptom } from 'src/app/models/symptom.model';
import { TranslocoService } from '@ngneat/transloco';
import { WakeUpChartViewModel } from 'src/app/models/google-charts/wakeup.chart.view.model';
import { CalendarPieChartViewModel } from 'src/app/models/google-charts/calendar.pie.chart.view.model';
import { BedTimeChartViewModel } from 'src/app/models/google-charts/bedtime.chart.view.model';
import { SleepChartViewModel } from 'src/app/models/google-charts/sleep.chart.view.model';

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
	public symptomPainColorMap: Map<number, string>;
	public monthMap: Map<number, string>;
	public today: IDetailedDate;
	public pieCharts: Map<string, CalendarPieChartViewModel>;
	public bedTimeChart: BedTimeChartViewModel;
	public wakeUpChart: WakeUpChartViewModel;
	public sleepChart: SleepChartViewModel;

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		public translocoService: TranslocoService
	) {
		this.pieCharts = new Map<string, CalendarPieChartViewModel>();
		this.bedTimeChart = new BedTimeChartViewModel('LineChart', '', this.translocoService);
		this.wakeUpChart = new WakeUpChartViewModel('LineChart', '', this.translocoService);
		this.sleepChart = new SleepChartViewModel('LineChart', '', this.translocoService);
		this.symptoms = new Array<ISymptom>();
		this.symptoms$ = new BehaviorSubject<ISymptom[]>(new Array<ISymptom>());
		this.overviews = new Array<DayOverviewViewModel>();
		this.overviews$ = new Subject<DayOverviewViewModel[]>();
		this.previousOverviews = new Array<DayOverviewViewModel>();
		this.previousOverviews$ = new Subject<DayOverviewViewModel[]>();
	}

	public ngOnInit(): void {
		const detailedDate = getDetailedDate(new Date());
		this.month = detailedDate.month;
		this.year = detailedDate.year;
		this.today = getDetailedDate(new Date());
		this.updateCalendar(this.today.month, this.today.year);
		this.symptomMap = this.globalService.symptomMap;
		this.symptomPainColorMap =
			new Map([[0, 'default'], [1, 'pain-1'], [2, 'pain-2'], [3, 'pain-3'], [4, 'pain-4'], [5, 'pain-5']]);
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

	public loadSymptoms() {
		this.globalService.symptoms$.subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.symptoms = this.organizeSymptoms(this.symptoms);
			this.symptoms$.next(this.symptoms);
		});
	}

	public updateCharts() {
		this.symptoms$.subscribe(symptoms => {
			symptoms.forEach(symptom => {
				this.pieCharts.set(symptom.key, new CalendarPieChartViewModel('PieChart', symptom.key));
				this.pieCharts.get(symptom.key).update(this.overviews);
			});
		})
		this.bedTimeChart.update(this.overviews);
		this.wakeUpChart.update(this.overviews);
		this.sleepChart.update(this.overviews, this.previousOverviews);
	}

	public updateCalendar(month: number, year: number) {
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

	public previous() {
		this.month--;
		if (this.month === 0) {
			this.month = 12;
			this.year--;
		}
		this.updateCalendar(this.month, this.year);
	}

	public next() {
		this.month++;
		if (this.month === 13) {
			this.month = 1;
			this.year++;
		}
		this.updateCalendar(this.month, this.year);
	}
}
