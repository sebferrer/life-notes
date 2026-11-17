import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { DaysService } from '../../infra';
import { Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DayViewModel } from 'src/app/models/day.view.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ATimeComponent } from '../time';
import { IDay } from 'src/app/models';
import { MedsService } from 'src/app/infra/meds.service';
import { LogsService } from 'src/app/infra/logs.service';
import { SportsService } from 'src/app/infra/sports.service';
import { MealsService } from 'src/app/infra/meals.service';
import { SettingsService } from 'src/app/infra/settings.service';

@Component({
	selector: 'app-day',
	templateUrl: './day.component.html',
	styleUrls: ['./day.component.scss', '../time/day-card.scss']
})
export class DayComponent extends ATimeComponent implements OnInit {

	public dayContent: DayViewModel;
	public dayContent$: Subject<DayViewModel>;
	public symptomMap: Map<string, string>;
	public displayCharts = false;

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
		private route: ActivatedRoute,
		private router: Router,
		private location: Location
	) {
		super(globalService, translocoService, daysService, medsService, logsService, sportsService, mealsService, settingsService, dialog, snackBar, bottomSheet);
		this.updateCallback = (day: IDay): void => {
			this.dayContent = new DayViewModel(day);
			this.dayContent$.next(this.dayContent);
		}
	}

	public ngOnInit(): void {
		this.dayContent$ = new Subject<DayViewModel>();
		const date = this.route.snapshot.paramMap.get('date');
		this.daysService.getDay(date).subscribe(
			day => {
				this.dayContent = day == null ?
					new DayViewModel(this.daysService.buildDay(date)) :
					new DayViewModel(day);
				this.dayContent$.next(this.dayContent);
			}
		);
	}

	// Back to where the day was opened from (timeline or calendar)
	public goBack(): void {
		if (window.history.length > 1) {
			this.location.back();
		} else {
			this.router.navigate(['/timeline']);
		}
	}

	public toggleCharts(): void {
		this.displayCharts = !this.displayCharts;
	}

	public get painScale(): number {
		return this.globalService.painScale;
	}

	public getPainValue(pain: number): number {
		return this.painScale === 10 ? pain * 2 : pain;
	}
}
