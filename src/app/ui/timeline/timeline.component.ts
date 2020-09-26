import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IDay } from 'src/app/models';
import { DaysService } from 'src/app/infra';

@Component({
	selector: 'app-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {

	public daysContents$: Observable<any[]>;

	constructor(
		private daysService: DaysService
	) { }

	public ngOnInit(): void {
		this.daysContents$ = this.daysService.getDaysContents();
	}
}
