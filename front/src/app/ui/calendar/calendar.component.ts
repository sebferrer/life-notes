import { Component, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { getDetailedDate } from 'src/app/util/date.utils';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { map } from 'rxjs/operators';
import { AppComponent } from 'src/app/app.component';
import { IDetailedDate } from 'src/app/models/detailed.date';

@Component({
	selector: 'app-calendar',
	templateUrl: './calendar.component.html',
	styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

	public overviews: DayOverviewViewModel[];
	public overviews$: Subject<DayOverviewViewModel[]>;
	public month: number;
	public year: number;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;
	public monthMap: Map<number, string>;
	public today: IDetailedDate;

	constructor(
		private app: AppComponent,
		private daysService: DaysService
	) { }

	public ngOnInit(): void {
		this.overviews = new Array<DayOverviewViewModel>();
		this.overviews$ = new Subject<DayOverviewViewModel[]>();
		const detailedDate = getDetailedDate(new Date());
		this.month = detailedDate.month;
		this.year = detailedDate.year;
		this.today = getDetailedDate(new Date());
		this.updateCalendar(this.today.month, this.today.year);
		this.symptomMap = this.app.symptomMap;
		this.symptomPainColorMap =
			new Map([[0, 'default'], [1, 'pain-1'], [2, 'pain-2'], [3, 'pain-3'], [4, 'pain-4'], [5, 'pain-5']]);
		this.monthMap =
			new Map([[1, 'January'], [2, 'February'], [3, 'March'], [4, 'April'], [5, 'May'], [6, 'June'],
			[7, 'July'], [8, 'August'], [9, 'September'], [10, 'October'], [11, 'November'], [12, 'December']]);
	}

	public updateCalendar(month: number, year: number) {
		this.daysService.getMonthDaysOverviews(month, year).subscribe(
			days => {
				this.overviews = new Array<DayOverviewViewModel>();
				days.forEach(day => {
					this.overviews.push(new DayOverviewViewModel(day));
				});
				this.overviews$.next(this.overviews);
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
