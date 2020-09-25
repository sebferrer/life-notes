import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IDayOverview } from 'src/app/models';
import { DaysService } from 'src/app/infra';

@Component({
	selector: 'app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

	public overviews$: Observable<IDayOverview[]>;

	constructor(
		private daysService: DaysService
	) { }

	public ngOnInit(): void {
		this.overviews$ = this.daysService.getDaysOverviews();
	}
}
