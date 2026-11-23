import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { Router } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { GlobalService } from 'src/app/infra/global.service';
import { ImageShareService, IShareImage } from 'src/app/infra/image-share.service';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { getMonthShareStats, hasSleepToShare, IMonthShareStats, SHARE_SITE_URL } from 'src/app/models/month-share.model';
import { ISymptom } from 'src/app/models/symptom.model';
import { IMonthShareDay } from '../../month-share-card';
import { SleepChartMode } from '../../sleep-stats';
import * as moment from 'moment';

export interface IShareMonthData {
	month: number;
	year: number;
	// Symptoms with an intensity in the month (see getShareableSymptoms), the one shown first chosen at first. The
	// sleep comes after them when the month has a complete night (see hasSleepToShare).
	symptoms: ISymptom[];
	overviews: DayOverviewViewModel[];
	previousOverviews: DayOverviewViewModel[];
	// Header of the calendar (none in the compact view) and days of the previous month before the 1st
	weekDays: number[];
	emptySlots: number;
	// Mode of the sleep card of the calendar: the image and the PDF report draw the sleep in the same one
	sleepChartMode: SleepChartMode;
}

// What an image shows: a symptom, or the sleep (symptom null)
export interface IShareChoice {
	label: string;
	symptom: ISymptom;
}

// Share of the month of a symptom or of the sleep as an image (calendar of the V2): its preview, the choice of what it
// shows when there are several, its share or its save on the phone (the sheet stays open), and a shortcut to the PDF
// report of the same month. The image is drawn again for each
// choice, before the tap on Share: the share sheet of a browser only opens right after a tap.
// The container of the sheets is OnPush: what changes once the image is drawn or shared is marked (markForCheck), in
// the zone of Angular (html2canvas draws in an iframe, the share sheet of Android answers from outside), or the
// screen would not change.
@Component({
	selector: 'app-bottom-sheet-share-month',
	templateUrl: 'bottom-sheet-share-month.component.html',
	styleUrls: ['bottom-sheet-share-month.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class BottomSheetShareMonthComponent implements AfterViewInit, OnDestroy {

	@ViewChild('stage') stage: ElementRef<HTMLElement>;

	public readonly choices: IShareChoice[];
	public selected: IShareChoice;
	// Of the symptom chosen
	public days: IMonthShareDay[];
	public stats: IMonthShareStats;
	public readonly monthLabel: string;
	public readonly previousMonthLabel: string;
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

	constructor(
		@Inject(MAT_BOTTOM_SHEET_DATA) public data: IShareMonthData,
		private bottomSheetRef: MatBottomSheetRef<BottomSheetShareMonthComponent>,
		private globalService: GlobalService,
		private translocoService: TranslocoService,
		private imageShareService: ImageShareService,
		private router: Router,
		private changeDetector: ChangeDetectorRef,
		private zone: NgZone
	) {
		const t = (key: string, params?: object) => this.translocoService.translate(key, params);
		// "Mars 2026", "Marzo de 2026": the first letter only, in the text itself (see the monthly report)
		const date = t('CALENDAR_HEADER_DATE', { month: t('MONTH-' + data.month), year: data.year });
		this.monthLabel = date.charAt(0).toUpperCase() + date.slice(1);
		this.previousMonthLabel = t('MONTH-' + (data.month === 1 ? 12 : data.month - 1));
		this.choices = data.symptoms.map(symptom => ({ label: symptom.label, symptom }));
		if (hasSleepToShare(data.overviews, data.previousOverviews)) {
			this.choices.push({ label: t('SLEEP_TITLE'), symptom: null });
		}
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
		return `life-notes-${this.data.year}-${String(this.data.month).padStart(2, '0')}.png`;
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
		const t = (key: string, params?: object) => this.translocoService.translate(key, params);
		const message = { month: t('MONTH-' + this.data.month), year: this.data.year, url: SHARE_SITE_URL };
		this.run('SHARE_MONTH_SHARE_ERROR', () => this.imageShareService.share(this.image, {
			fileName: this.fileName,
			title: `${this.selected.label} – ${this.monthLabel}`,
			text: this.selected.symptom == null ? t('SHARE_SLEEP_TEXT', message)
				: t('SHARE_MONTH_TEXT', { ...message, symptom: this.selected.label })
		}), () => this.bottomSheetRef.dismiss());
	}

	// Saved: the sheet stays open, the image can still be shared
	public onSaveClick(): void {
		this.run('SHARE_MONTH_SAVE_ERROR', () => this.imageShareService.save(this.image, this.fileName),
			() => { this.saved = true; });
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

	// Full report of the same month, its sleep in the mode of the calendar
	public onPdfClick(): void {
		this.bottomSheetRef.dismiss();
		this.router.navigate(['/monthlyreport', `${this.data.year}-${this.data.month}`],
			{ queryParams: { sleep: this.data.sleepChartMode } });
	}

	public onCloseClick(): void {
		this.bottomSheetRef.dismiss();
	}

	private show(choice: IShareChoice): void {
		this.selected = choice;
		this.saved = false;
		this.errorKey = null;
		const symptom = choice.symptom;
		if (symptom == null) {
			return;
		}
		// Days to come without intensity: neutral, as in the calendar
		this.days = this.data.overviews.map(day => {
			const pain = day.findSymptomPain(symptom.key);
			const future = pain == null && day.date > this.todayDate;
			return {
				day: day.detailedDate.day,
				color: future ? 'none' : this.globalService.getPainColorClass(symptom.key, pain)
			};
		});
		// The month is compared to the previous one once over
		const monthOver = `${this.data.year}-${String(this.data.month).padStart(2, '0')}` < this.todayDate.slice(0, 7);
		this.stats = getMonthShareStats(symptom, this.data.overviews, this.data.previousOverviews,
			this.globalService.painScale, this.globalService.getPainColors(false), monthOver);
	}

	private async draw(): Promise<void> {
		const drawing = ++this.drawing;
		this.image = null;
		this.drawError = false;
		// The card shows the chosen symptom before being drawn
		this.changeDetector.detectChanges();
		let image: IShareImage = null;
		try {
			image = await this.imageShareService.draw(this.stage.nativeElement.querySelector('.month-share-card'));
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
