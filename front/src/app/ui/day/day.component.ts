import { Component, OnInit } from '@angular/core';
import { DaysService } from '../../infra';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DayViewModel } from 'src/app/models/day.view.model';
import { GlobalService } from 'src/app/infra/global.service';

@Component({
	selector: 'app-day',
	templateUrl: './day.component.html',
	styleUrls: ['./day.component.scss']
})
export class DayComponent implements OnInit {

	public dayContent: DayViewModel;
	public dayContent$: Subject<DayViewModel>;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;

	constructor(
		private globalService: GlobalService,
		private daysService: DaysService,
		private route: ActivatedRoute
	) { }

	public ngOnInit(): void {
		this.dayContent$ = new Subject<DayViewModel>();
		this.daysService.getDay(this.route.snapshot.paramMap.get('date')).subscribe(
			day => {
				this.dayContent = new DayViewModel(day);
				this.dayContent$.next(this.dayContent);
			}
		);
		this.symptomMap = this.globalService.symptomMap;
		this.symptomPainColorMap =
			new Map([[0, 'default'], [1, 'pain-1'], [2, 'pain-2'], [3, 'pain-3'], [4, 'pain-4'], [5, 'pain-5']]);
	}
}
