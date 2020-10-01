import { Component, OnInit } from '@angular/core';
import { DbContext, DaysService } from './infra';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public title = 'Healthy Day';

	constructor(
		private daysService: DaysService
	) { }

	public ngOnInit(): void {
		this.daysService.createNewDayToday();
	}
}
