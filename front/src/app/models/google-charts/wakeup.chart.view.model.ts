import { AChartViewModel } from './chart.view.model';
import { DayOverviewViewModel } from '../day.overview.view.model';
import { timeToMinutes, formatMinutes } from '../../util/time.util';
import { IGChartTick } from './g.chart.tick.model';
import { TranslocoService } from '@ngneat/transloco';

export class WakeUpChartViewModel extends AChartViewModel {

	private readonly MAX_MINUTES = 1440;
	private readonly PIVOT_TIME = 900;
	private readonly BASE = -480;
	private readonly CHART_MAX_DEFAULT = -420;
	private readonly CHART_MIN_DEFAULT = -540;
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
				baseline: this.BASE,
				baselineColor: '#368AC6',
				viewWindow: {}
			}
		};
		this.columns = [
			this.translocoService.translate('DAY'),
			this.translocoService.translate('WAKEUP_TIME'),
			{ type: 'string', role: 'tooltip' }
		];
	}

	private formatTooltip(day: string, time: number): string {
		return this.translocoService.translate('DAY') + ' ' + day + '\n' + formatMinutes(time);
	}

	public update(overviews: DayOverviewViewModel[]): void {
		let chartMax = this.CHART_MAX_DEFAULT;
		let chartMin = this.CHART_MIN_DEFAULT;
		let ticks = Array<IGChartTick>();
		this.data = new Array<Array<string | number>>();
		let min = this.MAX_MINUTES;
		let max = -this.MAX_MINUTES;
		let timeSum = 0;
		this.nbData = 0;
		overviews.forEach(overview => {
			const day = overview.detailedDate.day.toString();
			let wakeUpTimeMinutes = timeToMinutes(overview.wakeUpTime);
			if (wakeUpTimeMinutes > this.PIVOT_TIME) {
				wakeUpTimeMinutes = -(this.MAX_MINUTES - wakeUpTimeMinutes);
			}
			if (wakeUpTimeMinutes != null) {
				wakeUpTimeMinutes = -wakeUpTimeMinutes;
			}
			if (Number.isInteger(wakeUpTimeMinutes)) {
				this.data.push([day, wakeUpTimeMinutes, this.formatTooltip(day, -wakeUpTimeMinutes)]);
				ticks.push({ v: wakeUpTimeMinutes, f: formatMinutes(-wakeUpTimeMinutes) });
				this.nbData++;

				if (-wakeUpTimeMinutes < min) {
					min = -wakeUpTimeMinutes;
				}
				if (-wakeUpTimeMinutes > max) {
					max = -wakeUpTimeMinutes;
				}
				timeSum += wakeUpTimeMinutes;
			}
			else {
				this.data.push([day, null, null]);
			}
			if (wakeUpTimeMinutes < chartMin) {
				chartMin = wakeUpTimeMinutes;
			} else if (wakeUpTimeMinutes > chartMax) {
				chartMax = wakeUpTimeMinutes;
			}
		});
		this.minimum = formatMinutes(min);
		this.maximum = formatMinutes(max);
		this.average = formatMinutes(-Math.trunc(timeSum / this.nbData));
		ticks.push({ v: chartMin, f: formatMinutes(-chartMin) });
		ticks.push({ v: chartMax, f: formatMinutes(-chartMax) });
		ticks = this.removeBaseNeighbors(ticks, this.BASE);
		ticks.push({ v: this.BASE, f: formatMinutes(-this.BASE) });
		this.options.vAxis.viewWindow.min = chartMin;
		this.options.vAxis.viewWindow.max = chartMax;
		this.options.vAxis.ticks = ticks;
		this.data.sort((a, b) => (a as any) - (b as any));
	}
}