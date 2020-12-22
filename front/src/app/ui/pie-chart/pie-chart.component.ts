import { Component, OnInit, Input } from '@angular/core';
import { APieChartViewModel } from 'src/app/models/chartjs/pie.chart.view.model';

@Component({
	selector: 'app-pie-chart',
	templateUrl: './pie-chart.component.html',
	styleUrls: ['./pie-chart.component.scss']
})
export class PieChartComponent implements OnInit {

	@Input()
	title: string;
	@Input()
	chart: APieChartViewModel;

	constructor(
	) {

	}

	public ngOnInit(): void {
	}

}
