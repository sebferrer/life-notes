import { Component, OnInit } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { getDetailedDate } from 'src/app/util/date.utils';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { GlobalService } from 'src/app/infra/global.service';
import { CalendarPieChartViewModel } from 'src/app/models/calendar.pie.chart.view.model';
import { ISymptom } from 'src/app/models/symptom.model';

@Component({
	selector: 'app-calendar',
	templateUrl: './calendar.component.html',
	styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

	public overviews: DayOverviewViewModel[];
	public overviews$: Subject<DayOverviewViewModel[]>;
	public symptoms$: Observable<ISymptom[]>;
	public month: number;
	public year: number;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;
	public monthMap: Map<number, string>;
	public today: IDetailedDate;
	public pieCharts: Map<string, CalendarPieChartViewModel>;

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService
	) {
		this.pieCharts = new Map<string, CalendarPieChartViewModel>();
	}

	public ngOnInit(): void {
		this.overviews = new Array<DayOverviewViewModel>();
		this.overviews$ = new Subject<DayOverviewViewModel[]>();
		const detailedDate = getDetailedDate(new Date());
		this.month = detailedDate.month;
		this.year = detailedDate.year;
		this.today = getDetailedDate(new Date());
		this.updateCalendar(this.today.month, this.today.year);
		this.symptomMap = this.globalService.symptomMap;
		this.symptomPainColorMap =
			new Map([[0, 'default'], [1, 'pain-1'], [2, 'pain-2'], [3, 'pain-3'], [4, 'pain-4'], [5, 'pain-5']]);
		this.symptoms$ = this.globalService.symptoms$;
	}

	public updateCharts() {
		this.symptoms$.subscribe(symptoms => {
			symptoms.forEach(symptom => {
				this.pieCharts.set(symptom.key, new CalendarPieChartViewModel('PieChart', symptom.key));
				this.pieCharts.get(symptom.key).update(this.overviews);
			});
		})
	}

	public updateCalendar(month: number, year: number) {
		this.daysService.getMonthDaysOverviews(month, year).subscribe(
			days => {
				this.overviews = new Array<DayOverviewViewModel>();
				days.forEach(day => {
					this.overviews.push(new DayOverviewViewModel(day));
				});
				this.overviews$.next(this.overviews);
				this.updateCharts();
			}
		);
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
