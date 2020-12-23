import { Component, OnInit, Input } from '@angular/core';
import { WakeUpChartViewModel } from 'src/app/models/google-charts/wakeup.chart.view.model';
import { BedTimeChartViewModel } from 'src/app/models/google-charts/bedtime.chart.view.model';
import { SleepChartViewModel } from 'src/app/models/google-charts/sleep.chart.view.model';

@Component({
	selector: 'app-sleep-chart',
	templateUrl: './sleep-chart.component.html',
	styleUrls: ['./sleep-chart.component.scss']
})
export class SleepChartComponent implements OnInit {

	@Input()
	wakeUpChart: WakeUpChartViewModel;
	@Input()
	bedTimeChart: BedTimeChartViewModel;
	@Input()
	sleepChart: SleepChartViewModel;

	public displayedColumns: string[] = ['min', 'avg', 'max'];

	constructor(
	) {

	}

	public ngOnInit(): void {
	}

}
