import { formatMinutesInDuration, timeToMinutes, formatMinutes, formatMinutesInDurationContracted } from 'src/app/util/time.util';
import { DayOverviewViewModel } from '../day.overview.view.model';
import { ALineChartViewModel } from './line.chart.view.model';
import { CHART_JS_PLUGINS } from 'src/app/util/chartjs.plugins';

export class SleepChartViewModel extends ALineChartViewModel {

	private readonly MAX_MINUTES = 1440;
	private readonly PIVOT_TIME = 900;
	private readonly CHART_MAX_DEFAULT = 540;
	private readonly CHART_MIN_DEFAULT = 420;
	constructor(
		type: string
	) {
		super(type);
		this.options = {
			legend: {
				display: false
			},
			elements: {
				point: {
					radius: 0,
					hitRadius: 20
				}
			},
			scales: {
				xAxes: [{
					gridLines: {
						display: false
					},
					ticks: {
						autoSkip: false,
						callback: (label: string) => {
							return this.formatLabel(label);
						}
					}
				}],
				yAxes: [{
					gridLines: {
						display: false
					},
					ticks: {
						suggestedMax: this.CHART_MAX_DEFAULT,
						suggestedMin: this.CHART_MIN_DEFAULT,
						stepSize: 60,
						callback: (label: number) => {
							return formatMinutesInDurationContracted(label);
						}
					}
				}]
			},
			tooltips: {
				callbacks: {
					label: (tooltipItem, data) => {
						return this.formatTooltip(parseInt(tooltipItem.value, 10));
					}
				}
			},
			horizontalLine: [{
				y: 420,
				style: '#4487B4'
			}, {
				y: 540,
				style: '#4487B4'
			}]
		};

		this.plugins = [CHART_JS_PLUGINS.get('horizontalLine')]

		this.datasets = [{
			fill: false,
			borderColor: [
				'#3266CC'
			],
			lineTension: 0,
		}]
	}

	private formatTooltip(time: number): string {
		return formatMinutesInDuration(time);
	}

	private formatLabel(label: string): string {
		return parseInt(label, 10) % 2 === 1 ? '' : label;
	}

	public update(overviews: DayOverviewViewModel[], previousOverviews: DayOverviewViewModel[]): void {
		let chartMax = this.CHART_MAX_DEFAULT;
		let chartMin = this.CHART_MIN_DEFAULT;
		this.labels = new Array<string>();
		this.data = new Array<number>();
		let min = this.MAX_MINUTES;
		let max = 0;
		let timeSum = 0;
		this.nbData = 0;
		for (let i = 0; i < overviews.length; i++) {
			const day = overviews[i].detailedDate.day.toString();
			this.labels.push(day);
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
				this.data.push(sleepTimeMinutes);
				this.nbData++;

				if (sleepTimeMinutes < min) {
					min = sleepTimeMinutes;
				}
				if (sleepTimeMinutes > max) {
					max = sleepTimeMinutes;
				}
				timeSum += sleepTimeMinutes;
			}
			else {
				this.data.push(null);
			}
			if (sleepTimeMinutes < chartMin) {
				chartMin = sleepTimeMinutes;
			} else if (sleepTimeMinutes > chartMax) {
				chartMax = sleepTimeMinutes;
			}
		};
		this.minimum = formatMinutes(min);
		this.maximum = formatMinutes(max);
		this.average = formatMinutes(Math.trunc(timeSum / this.nbData));
		this.dataSource = [{ min: this.minimum, max: this.maximum, avg: this.average }];
		this.labels.sort((a, b) => (a as any) - (b as any));
	}
}