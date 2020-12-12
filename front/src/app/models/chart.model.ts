import { IGChartColumnType } from './g.chart.column.type.model';

export abstract class AChart {
	public type: string;
	public title: string;
	public data: any[][];
	public columns: any[];
	public options: any;
	public minimum: string;
	public maximum: string;
	public average: string;
	public nbData: number;

	constructor(type: string, title: string) {
		this.type = type;
		this.title = title;
		this.data = new Array<Array<string | number>>();
		this.columns = new Array<string | IGChartColumnType>();
		this.nbData = 0;
	}
}