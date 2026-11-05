import { Component, Input, OnChanges } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { GlobalService } from 'src/app/infra/global.service';
import {
	IStatsIntensity, IStatsOccurrence, IStatsSummary, StatsPeriod, countPeriods, getHourCounts, getStatsBuckets,
	getStatsSummary
} from 'src/app/models/occurrence-stats.model';
import * as moment from 'moment';

// Periods shown in the evolution chart: from the first occurrence, within these limits
const MIN_PERIODS = 6;
const MAX_PERIODS = 12;

// Statistics of the occurrences of an event: key figures, evolution over the last weeks or months, hours of the day
@Component({
	selector: 'app-occurrence-stats',
	templateUrl: './occurrence-stats.component.html',
	styleUrls: ['./occurrence-stats.component.scss']
})
export class OccurrenceStatsComponent implements OnChanges {

	@Input() public occurrences: IStatsOccurrence[] = [];
	// Intensities of a symptom, shown along its occurrences
	@Input() public intensities: IStatsIntensity[];
	// Color of the bars, the one of the event type
	@Input() public color: string;
	// The evolution shows the sum of the quantities rather than the number of occurrences
	@Input() public quantities = false;
	@Input() public unit = '';

	public period: StatsPeriod = 'week';
	public summary: IStatsSummary;
	public averageIntensity: number;
	public evolutionLabels: string[] = [];
	public evolutionDatasets: any[] = [];
	public evolutionOptions: any;
	// Text alternative of the charts
	public evolutionDescription: string;
	public hourDescription: string;
	public hourLabels: string[] = [];
	public hourDatasets: any[] = [];
	public hourOptions: any;
	public hasHours = false;
	private readonly today = moment().format('YYYY-MM-DD');

	constructor(
		private globalService: GlobalService,
		private translocoService: TranslocoService
	) { }

	public ngOnChanges(): void {
		const pastIntensities = (this.intensities || []).filter(intensity => intensity.date <= this.today);
		this.summary = getStatsSummary(this.occurrences, this.today, this.globalService.calendarStartOnSunday);
		this.averageIntensity = pastIntensities.length > 0 ? this.toPainValue(
			pastIntensities.reduce((sum, intensity) => sum + intensity.pain, 0) / pastIntensities.length) : null;
		this.updateEvolution();
		this.updateHours();
	}

	public setPeriod(period: StatsPeriod): void {
		this.period = period;
		this.updateEvolution();
	}

	// One decimal at most, in the format of the language
	public formatNumber(value: number): string {
		return value.toLocaleString(this.globalService.language === 'en' ? 'en-US' : 'fr-FR', { maximumFractionDigits: 1 });
	}

	public get painScale(): number {
		return this.globalService.painScale;
	}

	// The intensities are stored from 0 to 5
	private toPainValue(pain: number): number {
		return pain * this.painScale / 5;
	}

	private updateEvolution(): void {
		const weekStartsOnSunday = this.globalService.calendarStartOnSunday;
		const first = [...this.occurrences, ...(this.intensities || [])].map(item => item.date)
			.reduce((min, date) => date < min ? date : min, this.today);
		const count = Math.min(MAX_PERIODS,
			Math.max(MIN_PERIODS, countPeriods(first, this.today, this.period, weekStartsOnSunday)));
		const buckets = getStatsBuckets(this.occurrences, this.intensities || [], this.today, this.period, count,
			weekStartsOnSunday);
		this.evolutionLabels = buckets.map(bucket => this.periodLabel(bucket.start));
		this.evolutionDatasets = [{
			label: this.translocoService.translate(this.quantities ? 'STATS_QUANTITY' : 'STATS_OCCURRENCES'),
			data: buckets.map(bucket => this.quantities ? Math.round(bucket.quantity * 10) / 10 : bucket.count),
			yAxisID: 'count',
			backgroundColor: this.color,
			hoverBackgroundColor: this.color,
			order: 2
		}];
		const yAxes: any[] = [this.valueAxis('count', 'left')];
		if (this.intensities) {
			const lineColor = this.globalService.darkMode ? '#E0E0E0' : '#424242';
			this.evolutionDatasets.push({
				type: 'line',
				label: this.translocoService.translate('STATS_AVERAGE_INTENSITY'),
				data: buckets.map(bucket => bucket.intensity == null ? null
					: Math.round(this.toPainValue(bucket.intensity) * 10) / 10),
				yAxisID: 'intensity',
				borderColor: lineColor,
				backgroundColor: lineColor,
				pointBackgroundColor: lineColor,
				pointRadius: 3,
				borderWidth: 2,
				fill: false,
				spanGaps: true,
				lineTension: 0,
				order: 1
			});
			yAxes.push({
				id: 'intensity',
				position: 'right',
				ticks: { min: 0, max: this.painScale, stepSize: this.painScale / 2 },
				gridLines: { display: false }
			});
		}
		this.evolutionOptions = this.chartOptions(yAxes, !!this.intensities);
		this.evolutionDescription = this.describe(this.evolutionLabels, this.evolutionDatasets);
	}

	private updateHours(): void {
		const counts = getHourCounts(this.occurrences);
		this.hasHours = counts.some(count => count > 0);
		this.hourLabels = counts.map((_, hour) => this.hourLabel(hour));
		this.hourDatasets = [{
			label: this.translocoService.translate('STATS_OCCURRENCES'),
			data: counts,
			backgroundColor: this.color,
			hoverBackgroundColor: this.color
		}];
		this.hourOptions = this.chartOptions([this.valueAxis('count', 'left')], false);
		this.hourDescription = this.describe(this.hourLabels, this.hourDatasets);
	}

	// e.g. "Occurrences: 8 mars 2, 15 mars 3", the periods without value left out
	private describe(labels: string[], datasets: any[]): string {
		return datasets.map(dataset => dataset.label + ': ' + labels
			.map((label, i) => dataset.data[i] ? label + ' ' + this.formatNumber(dataset.data[i]) : null)
			.filter(value => value != null).join(', ')).join('; ');
	}

	private valueAxis(id: string, position: string): any {
		const gridColor = 'rgba(128, 128, 128, 0.2)';
		return {
			id,
			position,
			ticks: { beginAtZero: true, precision: 0, maxTicksLimit: 4 },
			gridLines: { color: gridColor, zeroLineColor: gridColor, drawBorder: false }
		};
	}

	private chartOptions(yAxes: any[], legend: boolean): any {
		return {
			responsive: true,
			maintainAspectRatio: false,
			// Drawn at once, with the sheet
			animation: { duration: 0 },
			legend: { display: legend, position: 'bottom', labels: { boxWidth: 12 } },
			scales: {
				xAxes: [{ gridLines: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } }],
				yAxes
			}
		};
	}

	private periodLabel(start: string): string {
		const date = moment(start);
		const month = this.translocoService.translate('MONTH-SHORT-' + (date.month() + 1));
		return this.period === 'month' ? month : date.date() + ' ' + month;
	}

	private hourLabel(hour: number): string {
		if (this.globalService.timeFormat !== 'us') {
			return hour + 'h';
		}
		return (hour % 12 === 0 ? 12 : hour % 12) + (hour < 12 ? 'am' : 'pm');
	}
}
