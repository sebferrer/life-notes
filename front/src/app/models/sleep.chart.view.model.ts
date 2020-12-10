import { AChart } from './chart.model';
import { DayOverviewViewModel } from './day.overview.view.model';
import { timeToMinutes, formatMinutes } from '../util/time.util';
import { IGChartTick } from './g.chart.tick.model';

export class SleepChartViewModel extends AChart {

	private readonly MAX_MINUTES = 1440;
	private readonly PIVOT_TIME = 900;

	constructor(
		type: string,
		title: string
	) {
		super(type, title);
		this.options = {
			legend: { position: 'bottom', alignment: 'start' },
			vAxis: {
				title: 'Time',
				gridlineColor: '#fff',
				viewWindow: {}
			}
		};
		this.columns = ['Day', 'Bed time'];
	}

	public update(overviews: DayOverviewViewModel[]): void {
		let min = -120;
		let max = 240;
		const ticks = Array<IGChartTick>();
		this.data = new Array<Array<string | number>>();
		overviews.forEach(overview => {
			const day = overview.detailedDate.day.toString();
			let bedTimeMinutes = timeToMinutes(overview.bedTime);
			if (bedTimeMinutes > this.PIVOT_TIME) {
				bedTimeMinutes = -(this.MAX_MINUTES - bedTimeMinutes);
			}
			this.data.push([day, bedTimeMinutes]);
			if (Number.isInteger(bedTimeMinutes)) {
				ticks.push({ v: bedTimeMinutes, f: formatMinutes(bedTimeMinutes) });
			}
			if (bedTimeMinutes < min) {
				min = bedTimeMinutes;
			} else if (bedTimeMinutes > max) {
				max = bedTimeMinutes;
			}
		});
		this.options.vAxis.viewWindow.min = min;
		this.options.vAxis.viewWindow.max = max;
		this.options.vAxis.ticks = ticks;
		this.data.sort((a, b) => (a as any) - (b as any));
	}
}