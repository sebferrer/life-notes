import { Component, OnInit } from '@angular/core';
import { DaysService } from '../../infra';
import { Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DayViewModel } from 'src/app/models/day.view.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ATimeComponent } from '../time';
import { IDay } from 'src/app/models';
import { DayChartViewModel } from 'src/app/models/chart.view.model';

@Component({
	selector: 'app-day',
	templateUrl: './day.component.html',
	styleUrls: ['./day.component.scss']
})
export class DayComponent extends ATimeComponent implements OnInit {

	public dayContent: DayViewModel;
	public dayContent$: Subject<DayViewModel>;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;
	public steppedAreaChart: DayChartViewModel;
	public displayChart = false;

	constructor(
		public globalService: GlobalService,
		protected translocoService: TranslocoService,
		protected daysService: DaysService,
		protected dialog: MatDialog,
		protected snackBar: MatSnackBar,
		protected bottomSheet: MatBottomSheet,
		private route: ActivatedRoute
	) {
		super(globalService, translocoService, daysService, dialog, snackBar, bottomSheet);
		this.updateCallback = (day: IDay): void => {
			this.dayContent = new DayViewModel(day);
			this.dayContent$.next(this.dayContent);
		}
		this.steppedAreaChart = new DayChartViewModel('SteppedAreaChart', 'Symptoms');
	}

	public ngOnInit(): void {
		this.dayContent$ = new Subject<DayViewModel>();
		this.daysService.getDay(this.route.snapshot.paramMap.get('date')).subscribe(
			day => {
				this.dayContent = new DayViewModel(day);
				this.dayContent$.next(this.dayContent);
				this.steppedAreaChart.update(this.symptoms$, this.globalService.symptomMap, this.dayContent);
			}
		);
	}

	public toggleChart(): void {
		this.displayChart = !this.displayChart;
	}
}
