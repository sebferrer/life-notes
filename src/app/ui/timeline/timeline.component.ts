import { Component, OnInit, OnDestroy, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as moment from 'moment';
import { DayViewModel } from 'src/app/models/day.view.model';
import { getSortOrder } from 'src/app/util/array.utils';
import { IDay } from 'src/app/models';
import { ATimeComponent } from '../time/time.component';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { DaysService } from 'src/app/infra';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MedsService } from 'src/app/infra/meds.service';
import { LogsService } from 'src/app/infra/logs.service';
import { SportsService } from 'src/app/infra/sports.service';
import { MealsService } from 'src/app/infra/meals.service';
import { SettingsService } from 'src/app/infra/settings.service';
import { ReviewService } from 'src/app/infra/review.service';
import { NavigationMemoryService } from 'src/app/infra/navigation-memory.service';

// Where the user was in the timeline, found again with the back button (see NavigationMemoryService)
interface ITimelineAnchor {
	// Days loaded by the infinite scroll
	nbDays: number;
	// Day at the top of the screen, and where its card starts (from the top of the screen, negative above it)
	date: string;
	offset: number;
}

@Component({
	selector: 'app-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.scss', '../time/day-card.scss']
})
export class TimelineComponent extends ATimeComponent implements OnInit, OnDestroy {

	private daysContents: DayViewModel[];
	public daysContents$: Subject<DayViewModel[]>;
	private readonly BATCH_SIZE = 60;
	private nbDays = 0;
	public isLoading = false;
	@ViewChildren('dayRefs') dayRefs: QueryList<ElementRef>;
	private subscriptions = new Subscription();

	constructor(
		public globalService: GlobalService,
		protected translocoService: TranslocoService,
		protected daysService: DaysService,
		protected medsService: MedsService,
		protected logsService: LogsService,
		protected sportsService: SportsService,
		protected mealsService: MealsService,
		protected settingsService: SettingsService,
		protected dialog: MatDialog,
		protected snackBar: MatSnackBar,
		protected bottomSheet: MatBottomSheet,
		protected reviewService: ReviewService,
		private router: Router,
		private navigationMemory: NavigationMemoryService
	) {
		super(globalService, translocoService, daysService, medsService, logsService, sportsService, mealsService, settingsService, dialog, snackBar, bottomSheet,
			reviewService);
		this.updateCallback = (day: IDay): void => {
			this.daysContents = this.daysContents.filter(dayContent => dayContent.date !== day.date);
			this.daysContents.push(new DayViewModel(day));
			this.daysContents.sort(getSortOrder('date', true));
			this.daysContents$.next(this.daysContents);
		};
	}

	public ngOnInit(): void {
		this.daysContents = new Array<DayViewModel>();
		this.daysContents$ = new Subject<DayViewModel[]>();

		this.subscriptions.add(this.globalService.timeFormat$.subscribe(() => {
			this.daysContents$.next(this.daysContents);
		}));
		// Leaving the timeline (a day opened, another page): the day at the top of the screen
		this.subscriptions.add(this.router.events.pipe(filter(event => event instanceof NavigationStart)).subscribe(() => {
			this.navigationMemory.save<ITimelineAnchor>('timeline', this.getAnchor());
		}));

		// Back from a day (or another page): the days loaded then at once, and the same day at the top of the screen
		const anchor = this.navigationMemory.restore<ITimelineAnchor>('timeline');
		this.loadBatch(anchor != null ? this.getAnchorDays(anchor) : this.BATCH_SIZE, anchor);
	}

	// The days loaded then, and at least down to the day of the anchor (the next day began meanwhile)
	private getAnchorDays(anchor: ITimelineAnchor): number {
		const toAnchor = anchor.date != null ? moment().startOf('day').diff(moment(anchor.date, 'YYYY-MM-DD'), 'days') + 1 : 0;
		return Math.max(anchor.nbDays, toAnchor, this.BATCH_SIZE);
	}

	public ngOnDestroy(): void {
		this.subscriptions.unsubscribe();
	}

	public loadBatch(count: number = this.BATCH_SIZE, anchor: ITimelineAnchor = null) {
		// The infinite scroll asks for the next days as soon as its end is visible, at startup too: a second
		// batch asked before the first one arrives would load the same days again (nbDays not increased yet)
		if (this.isLoading) {
			return;
		}
		this.isLoading = true;
		this.daysService.getDays(count, this.nbDays).subscribe(
			days => {
				days.forEach(day => {
					this.daysContents.push(new DayViewModel(day));
				});
				this.nbDays += count;
				this.daysContents$.next(this.daysContents);
				this.isLoading = false;
				// The first page of the app is drawn: the splash screen can go (only once)
				this.globalService.hideSplashScreen();
				if (anchor != null) {
					this.scrollToAnchor(anchor);
				}
			}
		);
	}

	// The first card still visible under the toolbar
	private getAnchor(): ITimelineAnchor {
		const header = document.querySelector('.fixed-header');
		const top = header != null ? header.getBoundingClientRect().bottom : 0;
		const card = (this.dayRefs ? this.dayRefs.toArray() : [])
			.map(ref => ref.nativeElement as HTMLElement)
			.find(element => element.getBoundingClientRect().bottom > top);
		return {
			nbDays: this.nbDays,
			date: card != null ? card.id.replace(/^day-/, '') : null,
			offset: card != null ? card.getBoundingClientRect().top : 0
		};
	}

	// Once its card is drawn (after the symptoms too), the day of the anchor where it was on the screen
	private scrollToAnchor(anchor: ITimelineAnchor): void {
		if (anchor.date == null) {
			return;
		}
		this.navigationMemory.scrollWhenReady(() => {
			const card = document.getElementById('day-' + anchor.date);
			return card != null ? Math.max(0, window.scrollY + card.getBoundingClientRect().top - anchor.offset) : null;
		});
	}
}
