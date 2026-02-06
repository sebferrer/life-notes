import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ALineChartViewModel } from 'src/app/models/chartjs/line.chart.view.model';
import { ILineChartDataSource } from 'src/app/models/line.chart.datasource';

@Component({
	selector: 'app-line-chart',
	templateUrl: './line-chart.component.html',
	styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnInit, OnChanges {

	@Input()
	title: string;
	@Input()
	chart: ALineChartViewModel;
	@Input()
	timeFormat: string;

	public labels: string[];
	public type: string;
	public colors: any;
	public options: any;
	public datasets: any;
	public plugins: any;
	public displayedColumns: string[] = ['min', 'avg', 'max'];

	constructor() { }

	public getDatasource(): ILineChartDataSource[] {
		return this.chart.dataSource;
	}

	public ngOnInit(): void {
		this.labels = this.chart.labels;
		this.type = this.chart.type;
		this.colors = this.chart.colors;
		this.options = this.chart.options;
		this.datasets = this.chart.datasets;
		this.plugins = this.chart.plugins;
		this.chart.timeFormat = this.timeFormat;
	}

	public ngOnChanges(changes: SimpleChanges): void {
		if (changes.timeFormat) {
			this.chart.timeFormat = this.timeFormat;
		}
	}

}
