import { Component, OnInit, Input } from '@angular/core';
import { BedTimeChartViewModel } from 'src/app/models/bedtime.chart.view.model';
import { WakeUpChartViewModel } from 'src/app/models/wakeup.chart.view.model';
import { ISleepTable } from 'src/app/models/sleep.table.model';

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

	public displayedColumns: string[] = ['min', 'avg', 'max'];
	public wakeUpDataSource: ISleepTable[];
	public bedTimeDataSource: ISleepTable[];

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

	public ngOnInit(): void {
	}

}
