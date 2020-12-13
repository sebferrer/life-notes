import { IGChartColumnType } from './g.chart.column.type.model';
import { IGChartTick } from './g.chart.tick.model';

export abstract class AChartViewModel {
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

	protected removeBaseNeighbors(ticks: Array<IGChartTick>, base: number, socialDistance?: number): Array<IGChartTick> {
		socialDistance = socialDistance == null ? 60 : socialDistance;
		let newTicks = [...ticks];
		for (const tick of ticks) {
			if (tick.v > base - socialDistance && tick.v < base + socialDistance) {
				newTicks = newTicks.filter(t => t.v !== tick.v);
			}
		}
		return newTicks;
	}
}