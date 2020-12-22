import { Component, OnInit, Input } from '@angular/core';
import { WakeUpChartViewModel } from 'src/app/models/google-charts/wakeup.chart.view.model';
import { ISleepTable } from 'src/app/models/sleep.table.model';
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

	public getWakeUpDataSource(): ISleepTable[] {
		return [
			{ min: this.wakeUpChart.minimum, avg: this.wakeUpChart.average, max: this.wakeUpChart.maximum }
		];
	}

	public getBedTimeDataSource(): ISleepTable[] {
		return [
			{ min: this.bedTimeChart.minimum, avg: this.bedTimeChart.average, max: this.bedTimeChart.maximum }
		];
	}

	public getSleepTimeDataSource(): ISleepTable[] {
		return [
			{ min: this.sleepChart.minimum, avg: this.sleepChart.average, max: this.sleepChart.maximum }
		];
	}

	public ngOnInit(): void {
	}

}
