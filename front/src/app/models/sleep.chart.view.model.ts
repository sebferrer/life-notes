import { AChart } from './chart.model';
import { DayOverviewViewModel } from './day.overview.view.model';
import { timeToMinutes, formatMinutes } from '../util/time.util';
import { IGChartTick } from './g.chart.tick.model';
import { TranslocoService } from '@ngneat/transloco';

export class SleepChartViewModel extends AChart {

	private readonly MAX_MINUTES = 1440;
	private readonly PIVOT_TIME = 900;
	private translocoService: TranslocoService;

	constructor(
		type: string,
		title: string,
		translocoService: TranslocoService
	) {
		super(type, translocoService.translate(title));
		this.translocoService = translocoService;
		this.options = {
			legend: { position: 'bottom', alignment: 'start' },
			/*curveType: 'function',*/
			vAxis: {
				title: this.translocoService.translate('TIME'),
				gridlineColor: '#fff',
				viewWindow: {}
			},
			tooltip: {

			}
		};
		this.columns = [
			this.translocoService.translate('DAY'),
			this.translocoService.translate('BED_TIME'),
			{ type: 'string', role: 'tooltip' }
		];
	}

	private formatTooltip(day: string, time: number): string {
		return 'Day ' + day + '\n' + formatMinutes(time);
	}

	public update(overviews: DayOverviewViewModel[]): void {
		let min = -240;
		let max = 120;
		const ticks = Array<IGChartTick>();
		this.data = new Array<Array<string | number>>();
		overviews.forEach(overview => {
			const day = overview.detailedDate.day.toString();
			let bedTimeMinutes = timeToMinutes(overview.bedTime);
			if (bedTimeMinutes > this.PIVOT_TIME) {
				bedTimeMinutes = -(this.MAX_MINUTES - bedTimeMinutes);
			}
			bedTimeMinutes = -bedTimeMinutes;
			if (Number.isInteger(bedTimeMinutes)) {
				this.data.push([day, bedTimeMinutes, this.formatTooltip(day, -bedTimeMinutes)]);
				ticks.push({ v: bedTimeMinutes, f: formatMinutes(-bedTimeMinutes) });
			}
			else {
				this.data.push([day, null, null]);
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