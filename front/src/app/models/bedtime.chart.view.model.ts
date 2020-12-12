import { AChart } from './chart.model';
import { DayOverviewViewModel } from './day.overview.view.model';
import { timeToMinutes, formatMinutes } from '../util/time.util';
import { IGChartTick } from './g.chart.tick.model';
import { TranslocoService } from '@ngneat/transloco';

export class BedTimeChartViewModel extends AChart {

	private readonly MAX_MINUTES = 1440;
	private readonly PIVOT_TIME = 900;
	private translocoService: TranslocoService;

	constructor(
		type: string,
		title: string,
		translocoService: TranslocoService
	) {
		super(type, title);
		this.translocoService = translocoService;
		this.options = {
			legend: { position: 'bottom', alignment: 'start' },
			/*curveType: 'function',*/
			vAxis: {
				title: this.translocoService.translate('TIME'),
				gridlineColor: '#fff',
				baselineColor: '#368AC6',
				viewWindow: {}
			}
		};
		this.columns = [
			this.translocoService.translate('DAY'),
			this.translocoService.translate('BED_TIME'),
			{ type: 'string', role: 'tooltip' }
		];
	}

	private formatTooltip(day: string, time: number): string {
		return this.translocoService.translate('DAY') + ' ' + day + '\n' + formatMinutes(time);
	}

	public update(overviews: DayOverviewViewModel[]): void {
		let chartMin = 0;
		let chartMax = 120;
		const ticks = Array<IGChartTick>();
		this.data = new Array<Array<string | number>>();
		let min = this.MAX_MINUTES;
		let max = -this.MAX_MINUTES;
		let timeSum = 0;
		this.nbData = 0;
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
				this.nbData++;

				if (bedTimeMinutes < min) {
					min = bedTimeMinutes;
				}
				if (bedTimeMinutes > max) {
					max = bedTimeMinutes;
				}
				timeSum += bedTimeMinutes;
			}
			else {
				this.data.push([day, null, null]);
			}
			if (bedTimeMinutes < chartMin) {
				chartMin = bedTimeMinutes;
			} else if (bedTimeMinutes > chartMax) {
				chartMax = bedTimeMinutes;
			}
		});
		this.minimum = formatMinutes(-max);
		this.maximum = formatMinutes(-min);
		this.average = formatMinutes(-Math.trunc(timeSum / this.nbData));
		ticks.push({ v: chartMin, f: formatMinutes(-chartMin) });
		ticks.push({ v: chartMax, f: formatMinutes(-chartMax) });
		ticks.push({ v: 0, f: formatMinutes(0) });
		this.options.vAxis.viewWindow.min = chartMin;
		this.options.vAxis.viewWindow.max = chartMax;
		this.options.vAxis.ticks = ticks;
		this.data.sort((a, b) => (a as any) - (b as any));
	}
}