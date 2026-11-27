import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavigationMemoryService } from 'src/app/infra/navigation-memory.service';
import { DaysService } from 'src/app/infra';
import { GlobalService } from 'src/app/infra/global.service';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { ISymptom } from 'src/app/models/symptom.model';
import { getShareableSymptoms } from 'src/app/models/month-share.model';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { BottomSheetShareYearComponent, IShareYearData } from '../bottom-sheet/bottom-sheet-share-year';
import * as moment from 'moment';

// The year shown (changed with the arrows, not in the address) and the position of the page, found again with the back
// button (see NavigationMemoryService)
interface IYearInPixelsState {
	year: number;
	scrollY: number;
}

// One pixel per day of the year, colored by the pain of the target symptom
@Component({
	selector: 'app-year-in-pixels',
	templateUrl: './year-in-pixels.component.html',
	styleUrls: ['./year-in-pixels.component.scss']
})
export class YearInPixelsComponent implements OnInit, OnDestroy {

	public readonly months = Array.from({ length: 12 }, (_, i) => i + 1);
	public readonly dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);
	// Pain levels of the calendar colors
	public readonly painLevels = [0, 1, 2, 3, 4, 5];
	public readonly todayDate = moment().format('YYYY-MM-DD');
	public year: number;
	// Days of each month (index 0 for January), undefined until the first year is loaded
	public monthDays: DayOverviewViewModel[][];
	// Year of these days: the arrows change the year of the header at once, its days come later
	private loadedYear: number;
	// V2: the symptoms with an intensity in the year, which can be shared as an image (see openShareSheet)
	public shareableSymptoms: ISymptom[] = [];
	private symptoms: ISymptom[] = [];

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		private route: ActivatedRoute,
		private router: Router,
		private navigationMemory: NavigationMemoryService,
		private bottomSheet: MatBottomSheet
	) { }

	private subscription: Subscription;

	public ngOnInit(): void {
		const year = Number(this.route.snapshot.paramMap.get('year'));
		const state = this.navigationMemory.restore<IYearInPixelsState>('yearinpixels');
		this.subscription = this.router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe(() => {
			this.navigationMemory.save<IYearInPixelsState>('yearinpixels', { year: this.year, scrollY: window.scrollY });
		});
		this.subscription.add(this.globalService.symptoms$.subscribe(symptoms => {
			this.symptoms = [...symptoms];
			this.updateShareableSymptoms();
		}));
		if (state != null) {
			this.loadYear(state.year, state.scrollY);
		} else {
			this.loadYear(Number.isInteger(year) && year > 0 ? year : moment().year());
		}
	}

	public ngOnDestroy(): void {
		this.subscription.unsubscribe();
	}

	public loadYear(year: number, scrollY: number = null): void {
		this.year = year;
		this.daysService.getYearDaysOverviews(year).subscribe(months => {
			// A faster tap on the arrows asked for another year meanwhile
			if (year === this.year) {
				this.monthDays = months.map(days => days.map(day => new DayOverviewViewModel(day)));
				this.loadedYear = year;
				this.updateShareableSymptoms();
				if (scrollY != null) {
					this.navigationMemory.scrollWhenReady(() => scrollY);
				}
			}
		});
	}

	public previous(): void {
		this.loadYear(this.year - 1);
	}

	public next(): void {
		this.loadYear(this.year + 1);
	}

	// V2: the share of the year of a symptom as an image (as the share of a month under the calendar), once its days are
	// loaded and when a symptom has an intensity in it
	public get canShare(): boolean {
		return !this.globalService.isUiV1 && this.loadedYear === this.year && this.shareableSymptoms.length > 0;
	}

	// The symptom shown by the page first, then the others in alphabetical order
	public openShareSheet(): void {
		if (!this.canShare) {
			return;
		}
		const target = this.globalService.targetSymptomKey;
		const symptoms = [...this.shareableSymptoms].sort((a, b) =>
			(a.key === target ? -1 : b.key === target ? 1 : 0) || (a.label || '').localeCompare(b.label || ''));
		const data: IShareYearData = { year: this.loadedYear, symptoms, months: this.monthDays };
		this.bottomSheet.open(BottomSheetShareYearComponent, {
			panelClass: ['event-bottom-sheet', 'share-month-panel'],
			data
		});
	}

	private updateShareableSymptoms(): void {
		const days = (this.monthDays || []).reduce((all, month) => all.concat(month), [] as DayOverviewViewModel[]);
		this.shareableSymptoms = getShareableSymptoms(this.symptoms, days);
	}

	// First letter of the month, or its number where the months are numbered: "10" for "10月" in Japanese
	public monthInitial(name: string): string {
		const monthNumber = /^\d+/.exec(name);
		return monthNumber ? monthNumber[0] : name.charAt(0);
	}

	// null when the month is shorter
	public getDay(month: number, dayNumber: number): DayOverviewViewModel {
		return this.monthDays[month - 1][dayNumber - 1] || null;
	}

	public pixelClass(day: DayOverviewViewModel): string {
		if (day.date > this.todayDate) {
			return 'future';
		}
		const pain = day.findSymptomPain(this.globalService.targetSymptomKey);
		if (pain == null) {
			// As in the calendar: no pain on a normal scale, neutral on an inverted one (e.g. a mood) where 0 is the worst
			return this.showsNoData ? 'no-data' : this.levelClass(0);
		}
		return this.levelClass(pain);
	}

	// Days without data in a color of their own (see pixelClass), and so in the legend
	public get showsNoData(): boolean {
		const key = this.globalService.targetSymptomKey;
		return key == null || key === '' || this.globalService.isScaleInverted(key);
	}

	// Reversed with the scale of the symptom
	public levelClass(level: number): string {
		return 'color-' + this.globalService.getPainColorClass(this.globalService.targetSymptomKey, level);
	}

	// Same labels as the calendar charts
	public levelLabel(level: number): string {
		return this.globalService.painScale === 10 && level > 0 ? (level * 2 - 1) + '-' + (level * 2) : String(level);
	}
}
