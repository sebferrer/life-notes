import { Component, Input, ViewEncapsulation } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { IMonthShareStats } from 'src/app/models/month-share.model';

// One month of the image: its initial and the color class of each of its 31 rows ('default', 'pain-1'... 'none' for
// the days to come or without value on an inverted scale, 'missing' past the end of the month)
export interface IYearShareMonth {
	initial: string;
	days: string[];
}

// Longest title written whole on the image
const MAX_TITLE_LENGTH = 36;

// Year in Pixels of a symptom as shared (see BottomSheetShareYearComponent): a column per month, a pixel per day in the
// colors of its intensities, the legend and the figures of the year, and the name of the app. The frame of the image of
// a month (month-share-card: same header, legend, figures and footer): 400 x 500, drawn at 1080 x 1350. Drawn by
// html2canvas: no style it doesn't draw.
@Component({
	selector: 'app-year-share-card',
	templateUrl: './year-share-card.component.html',
	// The frame of the image of a month, whether it was drawn before or not
	styleUrls: ['../month-share-card/month-share-card.component.scss', './year-share-card.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class YearShareCardComponent {

	// Name of the symptom
	@Input() title: string;
	@Input() yearLabel: string;
	@Input() months: IYearShareMonth[];
	@Input() stats: IMonthShareStats;
	@Input() invertedScale: boolean;
	@Input() painScale: number;

	public readonly site = 'life-notes.fr';

	constructor(
		private translocoService: TranslocoService
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
}
