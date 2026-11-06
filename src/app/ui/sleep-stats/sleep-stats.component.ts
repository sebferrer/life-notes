import { Component, Input, OnChanges } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { GlobalService } from 'src/app/infra/global.service';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import {
	ISleepDay, ISleepNight, ISleepSummary, fromNightMinutes, getSleepNights, getSleepSummary
} from 'src/app/models/sleep-stats.model';
import { formatAMPM } from 'src/app/util/time.util';

// Recommended sleep duration for adults, shown as a band on the chart of the durations
const TARGET_MIN = 7 * 60;
const TARGET_MAX = 9 * 60;

// Chart.js draws on canvas: the colors can't come from the CSS variables (the legend of the template uses the same)
const COLORS = {
	light: {
		bar: '#5C6BC0', barOutside: 'rgba(92, 107, 192, 0.4)', band: 'rgba(76, 175, 80, 0.14)', area: '92, 107, 192',
		bedTime: '#3949AB', wakeUp: '#F9A825', grid: 'rgba(128, 128, 128, 0.2)', text: '#666'
	},
	dark: {
		bar: '#9FA8DA', barOutside: 'rgba(159, 168, 218, 0.4)', band: 'rgba(129, 199, 132, 0.16)', area: '159, 168, 218',
		bedTime: '#C5CAE9', wakeUp: '#FFD54F', grid: 'rgba(128, 128, 128, 0.25)', text: '#B0B0B0'
	}
};

export type SleepChartMode = 'bars' | 'curves';

// Sleep of the nights of a month: key figures, duration and schedule of each night, as bars or curves
// (V2, see GlobalService.uiVersion)
@Component({
	selector: 'app-sleep-stats',
	templateUrl: './sleep-stats.component.html',
	styleUrls: ['./sleep-stats.component.scss']
})
export class SleepStatsComponent implements OnChanges {

	@Input() public overviews: DayOverviewViewModel[] = [];
	// For the night before the first day
	@Input() public previousOverviews: DayOverviewViewModel[] = [];
	// Drawn again when it changes
	@Input() public timeFormat: string;
	// Light colors whatever the theme, without the buttons of the modes (the PDF report)
	@Input() public report = false;

	// The one of the settings, until changed with the buttons of the card
	public mode: SleepChartMode;
	public summary: ISleepSummary;
	public hasData = false;
	// Nights with only a bedtime or only a wake-up time, shown as dots in bars mode
	public hasAloneTimes = false;
	public labels: string[] = [];
	public durationDatasets: any[] = [];
	public durationOptions: any;
	public durationPlugins: any[] = [];
	public durationDescription: string;
	public scheduleDatasets: any[] = [];
	public scheduleOptions: any;
	public scheduleDescription: string;
	private nights: ISleepNight[] = [];
	private dates: string[] = [];

	constructor(
		private globalService: GlobalService,
		private translocoService: TranslocoService
	) {
		this.mode = globalService.sleepChartMode === 'curves' ? 'curves' : 'bars';
	}

	public ngOnChanges(): void {
		const days: ISleepDay[] = (this.overviews || []).map(overview =>
			({ day: overview.detailedDate.day, wakeUp: overview.wakeUpTime, bedTime: overview.bedTime }));
		const previous = this.previousOverviews || [];
		this.nights = getSleepNights(days, previous.length > 0 ? previous[previous.length - 1].bedTime : null);
		this.summary = getSleepSummary(days, this.nights);
		this.hasData = !!(this.summary.duration || this.summary.bedTime || this.summary.wakeUp);
		this.hasAloneTimes = this.nights.some(night => !this.isComplete(night) && (night.bedTime != null || night.wakeUp != null));
		this.dates = (this.overviews || []).map(overview => overview.detailedDate.day + ' '
			+ this.translocoService.translate('MONTH-SHORT-' + overview.detailedDate.month));
		this.labels = days.map(day => String(day.day));
		this.updateCharts();
	}

	public setMode(mode: SleepChartMode): void {
		this.mode = mode;
		this.updateCharts();
	}

	// e.g. 7 h 05
	public formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const rest = String(minutes % 60).padStart(2, '0');
		return this.globalService.language === 'en' ? `${hours}h ${rest}` : `${hours} h ${rest}`;
	}

	// A time in minutes from midnight, in the time format of the settings
	public formatTime(minutes: number): string {
		const time = fromNightMinutes(minutes);
		return this.globalService.timeFormat === 'us' ? formatAMPM(time) : time;
	}

	public get colors(): typeof COLORS.light {
		return this.globalService.darkMode && !this.report ? COLORS.dark : COLORS.light;
	}

	private isComplete(night: ISleepNight): boolean {
		return night.bedTime != null && night.wakeUp != null && night.wakeUp > night.bedTime;
	}

	private updateCharts(): void {
		if (this.hasData) {
			this.updateDurations();
			this.updateSchedule();
		}
	}

	private updateDurations(): void {
		const colors = this.colors;
		const data = this.nights.map(night => night.duration);
		const inTarget = (night: ISleepNight) => night.duration >= TARGET_MIN && night.duration <= TARGET_MAX;
		this.durationDatasets = this.mode === 'bars' ? [{
			label: this.translocoService.translate('SLEEP_DURATION'),
			data,
			backgroundColor: this.nights.map(night => inTarget(night) ? colors.bar : colors.barOutside),
			hoverBackgroundColor: colors.bar,
			barPercentage: 0.7
		}] : [{
			label: this.translocoService.translate('SLEEP_DURATION'),
			...this.curve(colors.bar, data),
			fill: 'start',
			backgroundColor: (context: any) => this.areaGradient(context.chart, 'duration')
		}];
		// Odd hours: 7 h and 9 h, the limits of the recommended durations, are on the axis
		const longest = Math.max(TARGET_MAX, ...data.map(duration => duration || 0));
		const hours = Math.max(11, Math.ceil((longest + 30) / 60));
		const top = (hours % 2 === 1 ? hours : hours + 1) * 60;
		const lines = Array.from({ length: (top / 60 + 1) / 2 }, (_, i) => 60 + i * 120);
		this.durationOptions = this.chartOptions({
			id: 'duration',
			ticks: {
				fontColor: colors.text,
				min: 0,
				max: top,
				stepSize: 60,
				maxTicksLimit: 30,
				callback: (minutes: number) => lines.includes(minutes) ? this.formatHours(minutes) : ''
			},
			// Drawn by the plugin, at the labels only
			gridLines: { display: false }
		}, (item: any) => this.formatDuration(this.nights[item.index].duration));
		this.durationPlugins = [{
			beforeDatasetsDraw: (chart: any) => {
				const axis = chart.scales.duration;
				const area = chart.chartArea;
				const ctx = chart.ctx;
				ctx.save();
				// Band of the recommended durations
				const bandTop = axis.getPixelForValue(TARGET_MAX);
				ctx.fillStyle = colors.band;
				ctx.fillRect(area.left, bandTop, area.right - area.left, axis.getPixelForValue(TARGET_MIN) - bandTop);
				ctx.strokeStyle = colors.grid;
				ctx.lineWidth = 1;
				[0, ...lines].forEach(value => {
					const y = Math.round(axis.getPixelForValue(value)) + 0.5;
					ctx.beginPath();
					ctx.moveTo(area.left, y);
					ctx.lineTo(area.right, y);
					ctx.stroke();
				});
				ctx.restore();
			}
		}];
		this.durationDescription = this.describe(this.durationDatasets[0].label,
			night => night.duration != null ? this.formatDuration(night.duration) : null);
	}

	private updateSchedule(): void {
		const colors = this.colors;
		const bedTime = this.translocoService.translate('TIMELINE_GO_TO_BED');
		const wakeUp = this.translocoService.translate('TIMELINE_WAKE_UP');
		if (this.mode === 'bars') {
			// Each night is a bar from the bedtime to the wake-up time; a time alone is a dot
			this.scheduleDatasets = [{
				label: this.translocoService.translate('SLEEP_NIGHT'),
				data: this.nights.map(night => this.isComplete(night) ? [night.bedTime, night.wakeUp] : null),
				backgroundColor: colors.bar,
				hoverBackgroundColor: colors.bar,
				barPercentage: 0.55
			}, this.dots(bedTime, colors.bedTime, night => night.bedTime), this.dots(wakeUp, colors.wakeUp, night => night.wakeUp)];
		} else {
			// A curve of the bedtimes and one of the wake-up times, the night between them
			this.scheduleDatasets = [{
				label: bedTime,
				...this.curve(colors.bedTime, this.nights.map(night => night.bedTime)),
				fill: false
			}, {
				label: wakeUp,
				...this.curve(colors.wakeUp, this.nights.map(night => night.wakeUp)),
				fill: '-1',
				backgroundColor: `rgba(${colors.area}, 0.18)`
			}];
		}
		const times = this.nights.reduce((all, night) => all.concat([night.bedTime, night.wakeUp]), [] as number[])
			.filter(time => time != null);
		this.scheduleOptions = this.chartOptions({
			id: 'time',
			ticks: {
				fontColor: colors.text,
				// The evening at the top
				reverse: true,
				// On the ticks, every 2 hours
				min: Math.floor((Math.min(...times) - 30) / 120) * 120,
				max: Math.ceil((Math.max(...times) + 30) / 120) * 120,
				stepSize: 120,
				callback: (minutes: number) => this.formatTime(minutes)
			},
			gridLines: { color: colors.grid, zeroLineColor: colors.grid, drawBorder: false }
		}, (item: any) => {
			const night = this.nights[item.index];
			if (this.mode === 'curves') {
				return `${item.datasetIndex === 0 ? bedTime : wakeUp} ${this.formatTime(Number(item.value))}`;
			}
			return this.isComplete(night) ? `${this.formatTime(night.bedTime)} → ${this.formatTime(night.wakeUp)}`
				: this.formatTime(night.bedTime ?? night.wakeUp);
		});
		this.scheduleDescription = this.describe(this.translocoService.translate('SLEEP_NIGHT'), night => this.isComplete(night)
			? `${this.formatTime(night.bedTime)} → ${this.formatTime(night.wakeUp)}` : null);
	}

	// Rounded line, without the sharp angles of a straight one nor dots, except for a value alone
	private curve(color: string, data: number[]): any {
		return {
			type: 'line',
			data,
			borderColor: color,
			borderWidth: 2.5,
			cubicInterpolationMode: 'monotone',
			spanGaps: true,
			pointRadius: data.filter(value => value != null).length > 1 ? 0 : 3,
			pointHoverRadius: 4,
			pointHitRadius: 10,
			pointBackgroundColor: color,
			pointBorderColor: color
		};
	}

	// Times alone of the bars mode
	private dots(label: string, color: string, value: (night: ISleepNight) => number): any {
		return {
			type: 'line',
			label,
			data: this.nights.map(night => !this.isComplete(night) ? value(night) : null),
			showLine: false,
			pointRadius: 3.5,
			pointBackgroundColor: color,
			pointBorderColor: color
		};
	}

	// From the color of the curve at the top to transparent at the bottom
	private areaGradient(chart: any, axisId: string): any {
		const area = chart.chartArea;
		const color = this.colors.area;
		if (!area) {
			return `rgba(${color}, 0.15)`;
		}
		const gradient = chart.ctx.createLinearGradient(0, area.top, 0, chart.scales[axisId].getPixelForValue(0));
		gradient.addColorStop(0, `rgba(${color}, 0.35)`);
		gradient.addColorStop(1, `rgba(${color}, 0)`);
		return gradient;
	}

	private formatHours(minutes: number): string {
		return this.globalService.language === 'en' ? `${minutes / 60}h` : `${minutes / 60} h`;
	}

	private chartOptions(yAxis: any, tooltipLabel: (item: any) => string): any {
		return {
			responsive: true,
			maintainAspectRatio: false,
			// Drawn at once
			animation: { duration: 0 },
			legend: { display: false },
			tooltips: {
				mode: 'index',
				intersect: false,
				callbacks: {
					title: (items: any[]) => this.dates[items[0].index],
					label: (item: any) => tooltipLabel(item)
				}
			},
			scales: {
				xAxes: [{
					offset: true,
					gridLines: { display: false },
					ticks: { fontColor: this.colors.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
				}],
				yAxes: [yAxis]
			}
		};
	}

	// Text alternative of a chart, e.g. "Durée: 17 mars 7 h 05, 18 mars 8 h 10"
	private describe(title: string, value: (night: ISleepNight) => string): string {
		return title + ': ' + this.nights.map((night, i) => value(night) != null ? this.dates[i] + ' ' + value(night) : null)
			.filter(text => text != null).join(', ');
	}
}
