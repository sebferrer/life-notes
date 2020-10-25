import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
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

	public overviews$: Observable<DayOverviewViewModel[]>;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;
	public today: IDetailedDate;

	constructor(
		private app: AppComponent,
		private daysService: DaysService
	) { }

	public ngOnInit(): void {
		this.today = getDetailedDate(new Date());
		this.overviews$ = this.daysService.getMonthDaysOverviews(this.today.month).pipe(
			map(days => days.map(day => new DayOverviewViewModel(day)))
		);
		this.symptomMap = this.app.symptomMap;
		this.symptomPainColorMap =
			new Map([[0, 'default'], [1, 'light-yellow'], [2, 'yellow'], [3, 'orange'], [4, 'red'], [5, 'dark-red']]);
	}
}
