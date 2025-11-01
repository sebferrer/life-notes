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
	@Input()
	width: string;
	@Input()
	legend: boolean;

	public labels: string[];
	public type: string;
	public colors: any;
	public options: any;

	constructor(
	) { }

	public ngOnInit(): void {
		this.legend = this.legend == null ? true : this.legend;
		this.labels = this.chart.labels;
		this.type = this.chart.type;
		this.colors = this.chart.colors;
		if (this.legend) {
			this.options = this.chart.options;
		} else {
			this.options = {
				legend: {
					display: false
				},
				tooltips: {
					enabled: false
				}
			}
		}
	}

}
