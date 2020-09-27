import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IDayOverview } from 'src/app/models';
import { DaysService } from 'src/app/infra';

@Component({
	selector: 'app-calendar',
	templateUrl: './calendar.component.html',
	styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

	public overviews$: Observable<IDayOverview[]>;

	constructor(
		private daysService: DaysService
	) { }

	public ngOnInit(): void {
		this.overviews$ = this.daysService.getDaysOverviews();
	}
}
