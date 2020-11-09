import { Component, OnInit } from '@angular/core';
import { DaysService } from './infra';
import { Subject } from 'rxjs';
import { ISymptom } from './models/symptom.model';
import { GlobalService } from './infra/global.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public title = 'Healthy Day';
	public symptoms: ISymptom[];
	public symptoms$: Subject<ISymptom[]>;

	constructor(
		private globalService: GlobalService,
		private daysService: DaysService
	) {
		this.symptoms = new Array<ISymptom>();
		this.symptoms$ = new Subject<ISymptom[]>();
	}

	public ngOnInit(): void {
		this.daysService.createNewDayToday().subscribe(res => { }, error => { });
		this.updateSymptoms();
	}

	public updateSymptoms() {
		this.globalService.symptoms$.subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.symptoms$.next(this.symptoms);
		});
	}
}
