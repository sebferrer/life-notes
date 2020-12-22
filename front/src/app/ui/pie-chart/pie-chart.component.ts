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

	public labels: string[];
	public type: string;
	public colors: any;
	public options: any;

	constructor(
	) { }

	public ngOnInit(): void {
		this.labels = this.chart.labels;
		this.type = this.chart.type;
		this.colors = this.chart.colors;
		this.options = this.chart.options;
	}

}
