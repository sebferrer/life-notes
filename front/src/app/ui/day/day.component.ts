import { Component, OnInit } from '@angular/core';
import { DaysService } from '../../infra';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { DayViewModel } from 'src/app/models/day.view.model';

@Component({
	selector: 'app-day',
	templateUrl: './day.component.html',
	styleUrls: ['./day.component.scss']
})
export class DayComponent implements OnInit {

	public dayContent$: Observable<DayViewModel>;

	constructor(
		private daysService: DaysService,
		private route: ActivatedRoute
	) { }

	public ngOnInit(): void {
		this.dayContent$ = this.daysService.getDay(this.route.snapshot.paramMap.get('date')).pipe(
			map(day => new DayViewModel(day))
		);
	}
}
