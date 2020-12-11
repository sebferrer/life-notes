import { Component, OnInit, Input } from '@angular/core';
import { SleepChartViewModel } from 'src/app/models/sleep.chart.view.model';

@Component({
	selector: 'app-sleep-chart',
	templateUrl: './sleep-chart.component.html',
	styleUrls: ['./sleep-chart.component.scss']
})
export class SleepChartComponent implements OnInit {

	@Input()
	sleepChart: SleepChartViewModel;

	constructor(
	) {

	}

	public ngOnInit(): void {

	}


}
