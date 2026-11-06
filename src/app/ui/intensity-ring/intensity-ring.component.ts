import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { CalendarPieChartViewModel } from 'src/app/models/chartjs/calendar.pie.chart.view.model';
import { IIntensitySegment, IIntensitySummary } from 'src/app/models/intensity-summary.model';

// Ring of 118 px (see the scss). Its parts are separated by a border of the color of the cell, which takes half of
// its width on their edges: the colors go from INNER to OUTER. A ring of one part has no border (it would leave a
// seam at the top): a padding and a cutout of its own give it the same edges, whatever the days.
const SIZE = 118;
const BORDER = 2.5;
const CUTOUT = 74;
const OUTER = (SIZE - BORDER) / 2 - BORDER / 2;
const INNER = (SIZE - BORDER) / 2 * CUTOUT / 100 + BORDER / 2;

// Month of a symptom in the calendar of the V2: a ring of its days level by level, the days with the symptom in
// its middle. A part tells its days when hovered or tapped.
@Component({
	selector: 'app-intensity-ring',
	templateUrl: './intensity-ring.component.html',
	styleUrls: ['./intensity-ring.component.scss']
})
export class IntensityRingComponent implements OnChanges, OnDestroy {

	@Input()
	label: string;
	// Days per level and their colors
	@Input()
	chart: CalendarPieChartViewModel;
	@Input()
	summary: IIntensitySummary;
	@Input()
	invertedScale: boolean;

	public datasets: any[];
	public options: any;
	// Part hovered or tapped
	public active: IIntensitySegment;
	private hideTimeout: any;

	constructor(private translocoService: TranslocoService) { }

	public ngOnChanges(): void {
		this.active = null;
		const onePart = this.summary.segments.length <= 1;
		// The background of the cell shows between the parts
		const gap = getComputedStyle(document.body).getPropertyValue('--surface-variant').trim();
		this.datasets = [{
			data: this.chart.data,
			backgroundColor: this.chart.colors[0].backgroundColor,
			hoverBackgroundColor: this.chart.colors[0].backgroundColor,
			borderColor: gap,
			hoverBorderColor: gap,
			borderWidth: onePart ? 0 : BORDER
		}];
		this.options = {
			responsive: false,
			layout: { padding: onePart ? SIZE / 2 - OUTER : 0 },
			cutoutPercentage: onePart ? INNER / OUTER * 100 : CUTOUT,
			// From the top, clockwise
			rotation: -0.5 * Math.PI,
			animation: { duration: 0 },
			legend: { display: false },
			tooltips: { enabled: false },
			hover: { mode: 'nearest', intersect: true, animationDuration: 0 },
			onHover: (event, elements) => this.show(event, elements),
			onClick: (event, elements) => this.show(event, elements)
		};
	}

	public ngOnDestroy(): void {
		clearTimeout(this.hideTimeout);
	}

	public get daysLabel(): string {
		if (!this.invertedScale) {
			return 'CALENDAR_INTENSITY_WITH_SYMPTOM';
		}
		return this.summary.days > 1 ? 'CALENDAR_INTENSITY_ENTERED' : 'CALENDAR_INTENSITY_ENTERED_ONE';
	}

	// One decimal at most, with the separator of the language
	public format(value: number): string {
		return value.toLocaleString(this.translocoService.getActiveLang(), { maximumFractionDigits: 1 });
	}

	public segmentDescription(segment: IIntensitySegment): string {
		return this.translocoService.translate(segment.days > 1 ? 'PIE_TOOLTIP_DAYS' : 'PIE_TOOLTIP_DAY',
			{ level: segment.label, days: segment.days });
	}

	public get description(): string {
		if (this.summary.segments.length === 0) {
			return this.translocoService.translate('CALENDAR_INTENSITY_DESCRIPTION_EMPTY', { symptom: this.label });
		}
		return this.translocoService.translate('CALENDAR_INTENSITY_DESCRIPTION', {
			symptom: this.label,
			details: this.summary.segments.map(segment => this.segmentDescription(segment)).join(', ')
		});
	}

	// A hover lasts as long as the pointer stays on the part, a tap a few seconds (no hover to end it)
	private show(event: any, elements: any[]): void {
		clearTimeout(this.hideTimeout);
		const level = elements.length > 0 ? elements[0]._index : null;
		this.active = level == null ? null : this.summary.segments.find(segment => segment.level === level) || null;
		if (this.active != null && event != null && (event.type === 'click' || event.type === 'touchstart')) {
			this.hideTimeout = setTimeout(() => this.active = null, 3000);
		}
	}
}
