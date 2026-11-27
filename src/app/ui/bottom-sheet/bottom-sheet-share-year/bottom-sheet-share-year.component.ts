import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { TranslocoService } from '@ngneat/transloco';
import { GlobalService } from 'src/app/infra/global.service';
import { ImageShareService, IShareImage } from 'src/app/infra/image-share.service';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { getMonthShareStats, IMonthShareStats, SHARE_SITE_URL } from 'src/app/models/month-share.model';
import { ISymptom } from 'src/app/models/symptom.model';
import { IYearShareMonth } from '../../year-share-card';
import { IShareChoice } from '../bottom-sheet-share-month';
import * as moment from 'moment';

export interface IShareYearData {
	year: number;
	// Symptoms with an intensity in the year (see getShareableSymptoms), the one shown first chosen at first
	symptoms: ISymptom[];
	// The days of each month of the year (see DaysService.getYearDaysOverviews)
	months: DayOverviewViewModel[][];
}

// Share of Year in Pixels of a symptom as an image (V2), as the share of a month (BottomSheetShareMonthComponent, whose
// layout it uses): its preview, the choice of the symptom when there are several, its share or its save on the phone
// (the sheet stays open). The image is drawn again for each choice, before the tap on Share: the share sheet of a
// browser only opens right after a tap. The container of the sheets is OnPush: what changes once the image is drawn
// or shared is marked (markForCheck), in the zone of Angular.
@Component({
	selector: 'app-bottom-sheet-share-year',
	templateUrl: 'bottom-sheet-share-year.component.html',
	// The layout of the share of a month, whether it was opened before or not
	styleUrls: ['../bottom-sheet-share-month/bottom-sheet-share-month.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class BottomSheetShareYearComponent implements AfterViewInit, OnDestroy {

	@ViewChild('stage') stage: ElementRef<HTMLElement>;

	public readonly choices: IShareChoice[];
	public selected: IShareChoice;
	// Of the symptom chosen
	public months: IYearShareMonth[];
	public stats: IMonthShareStats;
	public readonly yearLabel: string;
	public image: IShareImage = null;
	public drawError = false;
	// Share or save in progress: the buttons wait
	public busy = false;
	// The image shown is saved (until another one is chosen)
	public saved = false;
	// Translation key of the error of the last share or save
	public errorKey: string = null;
	// Number of the last drawing asked for: a former one ending later is ignored
	private drawing = 0;
	private destroyed = false;
	private readonly todayDate = moment().format('YYYY-MM-DD');
	private readonly monthInitials: string[];

	constructor(
		@Inject(MAT_BOTTOM_SHEET_DATA) public data: IShareYearData,
		private bottomSheetRef: MatBottomSheetRef<BottomSheetShareYearComponent>,
		private globalService: GlobalService,
		private translocoService: TranslocoService,
		private imageShareService: ImageShareService,
		private changeDetector: ChangeDetectorRef,
		private zone: NgZone
	) {
		this.yearLabel = String(data.year);
		// First letter of the month, or its number where the months are numbered (as Year in Pixels)
		this.monthInitials = Array.from({ length: 12 }, (_, i) => {
			const name = this.translocoService.translate('MONTH-SHORT-' + (i + 1));
			const monthNumber = /^\d+/.exec(name);
			return monthNumber ? monthNumber[0] : name.charAt(0);
		});
		this.choices = data.symptoms.map(symptom => ({ label: symptom.label, symptom }));
		this.show(this.choices[0]);
	}

	public ngAfterViewInit(): void {
		this.draw();
	}

	public ngOnDestroy(): void {
		this.destroyed = true;
	}

	public get painScale(): number {
		return this.globalService.painScale;
	}

	public get fileName(): string {
		return `life-notes-${this.data.year}.png`;
	}

	public choose(choice: IShareChoice): void {
		if (choice === this.selected || this.busy) {
			return;
		}
		this.show(choice);
		this.draw();
	}

	// Shared: the sheet closes
	public onShareClick(): void {
		const text = this.translocoService.translate('SHARE_YEAR_TEXT',
			{ symptom: this.selected.label, year: this.data.year, url: SHARE_SITE_URL });
		this.run('SHARE_MONTH_SHARE_ERROR', () => this.imageShareService.share(this.image, {
			fileName: this.fileName,
			title: `${this.selected.label} – ${this.yearLabel}`,
			text
		}), () => this.bottomSheetRef.dismiss());
	}

	// Saved: the sheet stays open, the image can still be shared
	public onSaveClick(): void {
		this.run('SHARE_MONTH_SAVE_ERROR', () => this.imageShareService.save(this.image, this.fileName),
			() => { this.saved = true; });
	}

	public onCloseClick(): void {
		this.bottomSheetRef.dismiss();
	}

	// A share or a save of the image: done() once it is done, nothing when the sheet of the system was left
	private async run(errorKey: string, action: () => Promise<boolean>, done: () => void): Promise<void> {
		if (this.image == null || this.busy) {
			return;
		}
		this.busy = true;
		this.errorKey = null;
		let finished = false;
		let failed = false;
		try {
			finished = await action();
		} catch (error) {
			console.error('Image error', error);
			failed = true;
		}
		this.zone.run(() => {
			this.busy = false;
			this.errorKey = failed ? errorKey : null;
			this.changeDetector.markForCheck();
			if (finished && !this.destroyed) {
				done();
			}
		});
	}

	// The pixels of the symptom, in the colors of Year in Pixels and of the image of a month: no value is the lowest
	// level on a normal scale, neutral on an inverted one; the days to come are neutral
	private show(choice: IShareChoice): void {
		this.selected = choice;
		this.saved = false;
		this.errorKey = null;
		const symptom = choice.symptom;
		this.months = this.data.months.map((days, month) => ({
			initial: this.monthInitials[month],
			days: Array.from({ length: 31 }, (_, i) => {
				const day = days[i];
				if (day == null) {
					return 'missing';
				}
				const pain = day.findSymptomPain(symptom.key);
				return pain == null && day.date > this.todayDate ? 'none' : this.globalService.getPainColorClass(symptom.key, pain);
			})
		}));
		const overviews = this.data.months.reduce((all, days) => all.concat(days), [] as DayOverviewViewModel[]);
		this.stats = getMonthShareStats(symptom, overviews, [], this.globalService.painScale,
			this.globalService.getPainColors(false), false);
	}

	private async draw(): Promise<void> {
		const drawing = ++this.drawing;
		this.image = null;
		this.drawError = false;
		// The card shows the chosen symptom before being drawn
		this.changeDetector.detectChanges();
		let image: IShareImage = null;
		try {
			image = await this.imageShareService.draw(this.stage.nativeElement.querySelector('.year-share-card'));
		} catch (error) {
			console.error('Image error', error);
		}
		this.zone.run(() => {
			if (drawing === this.drawing && !this.destroyed) {
				this.image = image;
				this.drawError = image == null;
				this.changeDetector.markForCheck();
			}
		});
	}
}
