import { DayOverviewViewModel } from '../day.overview.view.model';
import { timeToMinutes, formatMinutes } from '../../util/time.util';
import { ALineChartViewModel } from '../chartjs/line.chart.view.model';
import { CHART_JS_PLUGINS } from 'src/app/util/chartjs.plugins';

export class WakeUpChartViewModel extends ALineChartViewModel {

	private readonly MAX_MINUTES = 1440;
	private readonly PIVOT_TIME = 900;
	private readonly CHART_MAX_DEFAULT = -420;
	private readonly CHART_MIN_DEFAULT = -540;
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
							return formatMinutes(-label);
						}
					}
				}]
			},
			tooltips: {
				callbacks: {
					label: (tooltipItem, data) => {
						return this.formatTooltip(-parseInt(tooltipItem.value, 10));
					}
				}
			},
			horizontalLine: [{
				y: -480,
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
		return formatMinutes(time);
	}

	private formatLabel(label: string): string {
		return parseInt(label, 10) % 2 === 1 ? '' : label;
	}

	public update(overviews: DayOverviewViewModel[]): void {
		let chartMax = this.CHART_MAX_DEFAULT;
		let chartMin = this.CHART_MIN_DEFAULT;
		this.labels = new Array<string>();
		this.data = new Array<number>();
		let min = this.MAX_MINUTES;
		let max = -this.MAX_MINUTES;
		let timeSum = 0;
		this.nbData = 0;
		overviews.forEach(overview => {
			const day = overview.detailedDate.day.toString();
			this.labels.push(day);
			let wakeUpTimeMinutes = timeToMinutes(overview.wakeUpTime);
			if (wakeUpTimeMinutes > this.PIVOT_TIME) {
				wakeUpTimeMinutes = -(this.MAX_MINUTES - wakeUpTimeMinutes);
			}
			if (wakeUpTimeMinutes != null) {
				wakeUpTimeMinutes = -wakeUpTimeMinutes;
			}
			if (Number.isInteger(wakeUpTimeMinutes)) {
				this.data.push(wakeUpTimeMinutes);
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
				this.data.push(null);
			}
			if (wakeUpTimeMinutes < chartMin) {
				chartMin = wakeUpTimeMinutes;
			} else if (wakeUpTimeMinutes > chartMax) {
				chartMax = wakeUpTimeMinutes;
			}
		});
		// console.log(this.options.scales.yAxes[0].ticks);
		this.minimum = this.displayTime(formatMinutes(min));
		this.maximum = this.displayTime(formatMinutes(max));
		this.average = this.displayTime(formatMinutes(-Math.trunc(timeSum / this.nbData)));
		this.dataSource = [{ min: this.minimum, max: this.maximum, avg: this.average }];
		this.labels.sort((a, b) => (a as any) - (b as any));
	}
}
