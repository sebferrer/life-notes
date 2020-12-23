import * as ChartJs from 'chart.js';
import { ILineChartDataSource } from '../line.chart.datasource';

export interface ExtendedChartOptions extends ChartJs.ChartOptions {
	horizontalLine?: {
		y?: number,
		x?: number,
		text?: string,
		style?: string
	}[];
}

export abstract class ALineChartViewModel {
	public type: string;
	public labels: string[];
	public data: number[];
	public colors: any;
	public options: ExtendedChartOptions;
	public plugins: any;
	public datasets: any;
	public minimum: string;
	public maximum: string;
	public average: string;
	public nbData: number;
	public dataSource: ILineChartDataSource[];

	constructor(type: string) {
		this.type = type;
		this.labels = new Array<string>();
		this.data = new Array<number>();
		this.nbData = 0;
		this.dataSource = [{ min: '', max: '', avg: '' }];
	}
}