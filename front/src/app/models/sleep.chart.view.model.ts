import { AChart } from './chart.model';
import { DayOverviewViewModel } from './day.overview.view.model';
import { timeToMinutes, formatMinutes, formatMinutesInDuration } from '../util/time.util';
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
		super(type, title);
		this.translocoService = translocoService;
		this.options = {
			legend: { position: 'bottom', alignment: 'start' },
			vAxis: {
				title: this.translocoService.translate('TIME'),
				gridlineColor: '#fff',
				baseline: 480,
				baselineColor: '#368AC6',
				viewWindow: {}
			}
		};
		this.columns = [
			this.translocoService.translate('DAY'),
			this.translocoService.translate('SLEEP_TIME'),
			{ type: 'string', role: 'tooltip' }
		];
	}

	private formatTooltip(day: string, time: number): string {
		return this.translocoService.translate('DAY') + ' ' + day + '\n' + formatMinutesInDuration(time);
	}

	private removeBaseNeighbors(ticks: Array<IGChartTick>, base: number): Array<IGChartTick> {
		let newTicks = [...ticks];
		const socialDistance = 60;
		for (const tick of ticks) {
			if (tick.v > base - socialDistance && tick.v < base + socialDistance) {
				newTicks = newTicks.filter(t => t.v !== tick.v);
			}
		}
		return newTicks;
	}

	public update(overviews: DayOverviewViewModel[], previousOverviews: DayOverviewViewModel[]): void {
		let chartMax = 540;
		let chartMin = 360;
		let ticks = Array<IGChartTick>();
		this.data = new Array<Array<string | number>>();
		let min = this.MAX_MINUTES;
		let max = 0;
		let timeSum = 0;
		this.nbData = 0;
		for (let i = 0; i < overviews.length; i++) {
			const day = overviews[i].detailedDate.day.toString();
			let sleepTimeMinutes;
			if (i === 0) {
				if (overviews[i] != null && overviews[i].wakeUpTime != null &&
					previousOverviews[previousOverviews.length - 1] != null &&
					previousOverviews[previousOverviews.length - 1].bedTime != null) {
					let yesterdayBedTime = timeToMinutes(previousOverviews[previousOverviews.length - 1].bedTime);
					yesterdayBedTime = yesterdayBedTime > this.PIVOT_TIME ? -(this.MAX_MINUTES - yesterdayBedTime) : yesterdayBedTime
					sleepTimeMinutes = timeToMinutes(overviews[i].wakeUpTime) - yesterdayBedTime;
				}
			} else {
				if (overviews[i] != null && overviews[i - 1] != null &&
					overviews[i].wakeUpTime != null && overviews[i - 1].bedTime != null) {
					let yesterdayBedTime = timeToMinutes(overviews[i - 1].bedTime);
					yesterdayBedTime = yesterdayBedTime > this.PIVOT_TIME ? -(this.MAX_MINUTES - yesterdayBedTime) : yesterdayBedTime
					sleepTimeMinutes = timeToMinutes(overviews[i].wakeUpTime) - yesterdayBedTime;
				}
			}
			if (Number.isInteger(sleepTimeMinutes)) {
				this.data.push([day, sleepTimeMinutes, this.formatTooltip(day, sleepTimeMinutes)]);
				ticks.push({ v: sleepTimeMinutes, f: formatMinutesInDuration(sleepTimeMinutes) });
				this.nbData++;

				if (sleepTimeMinutes < min) {
					min = -sleepTimeMinutes;
				}
				if (sleepTimeMinutes > max) {
					max = -sleepTimeMinutes;
				}
				timeSum += sleepTimeMinutes;
			}
			else {
				this.data.push([day, null, null]);
			}
			if (sleepTimeMinutes < chartMin) {
				chartMin = sleepTimeMinutes;
			} else if (sleepTimeMinutes > chartMax) {
				chartMax = sleepTimeMinutes;
			}
		};
		this.minimum = formatMinutes(-min);
		this.maximum = formatMinutes(-max);
		this.average = formatMinutes(Math.trunc(timeSum / this.nbData));
		ticks.push({ v: chartMin, f: formatMinutesInDuration(-chartMin) });
		ticks.push({ v: chartMax, f: formatMinutesInDuration(-chartMax) });
		ticks = this.removeBaseNeighbors(ticks, 480);
		ticks.push({ v: 480, f: formatMinutesInDuration(480) });
		this.options.vAxis.viewWindow.min = chartMin;
		this.options.vAxis.viewWindow.max = chartMax;
		this.options.vAxis.ticks = ticks;
		this.data.sort((a, b) => (a as any) - (b as any));
	}
}