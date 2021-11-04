import { Component, OnInit, ElementRef, AfterViewInit, ViewChildren, QueryList } from '@angular/core';
import { Subject } from 'rxjs';
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

@Component({
	selector: 'app-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent extends ATimeComponent implements OnInit {

	private daysContents: DayViewModel[];
	public daysContents$: Subject<DayViewModel[]>;
	private readonly BATCH_SIZE = 14;
	private nbDays = 0;
	@ViewChildren('dayRefs') dayRefs: QueryList<ElementRef>;

	constructor(
		public globalService: GlobalService,
		protected translocoService: TranslocoService,
		protected daysService: DaysService,
		protected medsService: MedsService,
		protected logsService: LogsService,
		protected dialog: MatDialog,
		protected snackBar: MatSnackBar,
		protected bottomSheet: MatBottomSheet
	) {
		super(globalService, translocoService, daysService, medsService, logsService, dialog, snackBar, bottomSheet);
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

		this.loadBatch();
	}

	public loadBatch() {
		this.daysService.getDays(this.BATCH_SIZE, this.nbDays).subscribe(
			days => {
				days.forEach(day => {
					this.daysContents.push(new DayViewModel(day));
				});
				this.nbDays += this.BATCH_SIZE;
				this.daysContents$.next(this.daysContents);
			}
		);
	}

	/*
	public ngAfterViewInit(): void {
		this.dayRefs.forEach((div: any) => console.log(div.nativeElement));
		console.log(this.dayRefs.toArray());
		//this.myDiv.scrollIntoView();
	}*/
}
