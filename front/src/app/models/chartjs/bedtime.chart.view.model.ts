import { DayOverviewViewModel } from '../day.overview.view.model';
import { formatMinutes, timeToMinutes } from 'src/app/util/time.util';
import { ALineChartViewModel } from './line.chart.view.model';
import { CHART_JS_PLUGINS } from 'src/app/util/chartjs.plugins';

export class BedTimeChartViewModel extends ALineChartViewModel {

	private readonly MAX_MINUTES = 1440;
	private readonly PIVOT_TIME = 900;
	private readonly CHART_MAX_DEFAULT = 120;
	private readonly CHART_MIN_DEFAULT = 0;

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
				}/*,
				line: {
					fill: false,
					borderColor: '#000000'
				}*/
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
					}/*,
					scaleLabel: {
						display: true,
						labelString: 'Bed time'
					}*/
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
				y: 0,
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
		let min = this.MAX_MINUTES;
		let max = -this.MAX_MINUTES;
		let timeSum = 0;
		this.nbData = 0;
		this.labels = new Array<string>();
		this.data = new Array<number>();
		overviews.forEach(overview => {
			const day = overview.detailedDate.day.toString();
			this.labels.push(day);
			let bedTimeMinutes = timeToMinutes(overview.bedTime);
			if (bedTimeMinutes > this.PIVOT_TIME) {
				bedTimeMinutes = -(this.MAX_MINUTES - bedTimeMinutes);
			}
			if (bedTimeMinutes != null) {
				bedTimeMinutes = -bedTimeMinutes;
			}
			if (Number.isInteger(bedTimeMinutes)) {
				this.data.push(bedTimeMinutes);
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
				this.data.push(null);
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
		this.dataSource = [{ min: this.minimum, max: this.maximum, avg: this.average }];
		this.labels.sort((a, b) => (a as any) - (b as any));
	}
}