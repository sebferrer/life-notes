import { Component, Input, ViewEncapsulation } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { GlobalService } from 'src/app/infra/global.service';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { IMonthShareStats } from 'src/app/models/month-share.model';
import { SleepChartMode } from '../sleep-stats';

// Pixels of the charts of the sleep per CSS pixel: the image is 2.7 times as large as the card (1080 / 400)
const SLEEP_PIXEL_RATIO = 3;

// One day of the calendar of the image: its number and its color class ('default', 'pain-1'... or 'none')
export interface IMonthShareDay {
	day: number;
	color: string;
}

// Longest title written whole on the image
const MAX_TITLE_LENGTH = 36;

// Month of a symptom or of the sleep as shared (see BottomSheetShareMonthComponent): the calendar of the symptom in the
// colors of its intensities and its figures, or the sleep card of the calendar (its figures, the durations and the
// schedule of the nights, as bars or as curves: the mode shown in the calendar); and the name of the app. Laid out at
// the width of the image divided by 2.7 (400 for 1080), 500 high for a symptom (1350), as high as needed for the
// sleep. Drawn by html2canvas: no style it doesn't draw (no ::first-letter, no text-overflow).
@Component({
	selector: 'app-month-share-card',
	templateUrl: './month-share-card.component.html',
	styleUrls: ['./month-share-card.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class MonthShareCardComponent {

	// Name of the symptom, or "Sleep"
	@Input() title: string;
	@Input() monthLabel: string;

	// Sleep of the month: shown instead of a symptom when given, as bars or as curves
	@Input() sleepOverviews: DayOverviewViewModel[];
	@Input() sleepPreviousOverviews: DayOverviewViewModel[] = [];
	@Input() sleepMode: SleepChartMode = 'bars';

	// Symptom
	@Input() stats: IMonthShareStats;
	// Name of the previous month, for the improvement
	@Input() previousMonthLabel: string;
	@Input() invertedScale: boolean;
	@Input() painScale: number;
	@Input() days: IMonthShareDay[];
	@Input() emptySlots: number;
	// Header of the calendar: none in the compact view
	@Input() weekDays: number[];

	public readonly site = 'life-notes.fr';
	public readonly sleepPixelRatio = SLEEP_PIXEL_RATIO;

	constructor(
		private translocoService: TranslocoService,
		public globalService: GlobalService
	) { }

	public get shownTitle(): string {
		const title = this.title || '';
		return title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH - 1).trim() + '…' : title;
	}

	// Smaller for a long name, kept on one line
	public get titleSize(): number {
		const length = this.shownTitle.length;
		return length <= 14 ? 26 : length <= 20 ? 22 : 18;
	}

	public get slots(): number[] {
		return new Array(this.emptySlots || 0);
	}

	public get daysLabel(): string {
		if (!this.invertedScale) {
			return 'CALENDAR_INTENSITY_WITH_SYMPTOM';
		}
		return this.stats.days > 1 ? 'CALENDAR_INTENSITY_ENTERED' : 'CALENDAR_INTENSITY_ENTERED_ONE';
	}

	// One decimal at most, with the separator of the language
	public format(value: number): string {
		return value.toLocaleString(this.translocoService.getActiveLang(), { maximumFractionDigits: 1 });
	}

	// Fewer days ("−3"), a higher average on an inverted scale ("+0.8")
	public get improvement(): string {
		const value = this.stats.improvement;
		return (value < 0 ? '−' : '+') + this.format(Math.abs(value));
	}
}
