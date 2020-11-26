import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ViewChildren, QueryList } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { DialogAddEventComponent } from './dialog-add-event';
import { DialogDeleteEventComponent } from './dialog-delete-event';
import { DayViewModel } from 'src/app/models/day.view.model';
import { DialogShowEventComponent } from './dialog-show-event';
import { DialogEditSymptomOverviewComponent } from './dialog-edit-symptom-overview';
import { ICustomEvent } from 'src/app/models/customEvent.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ISymptom } from 'src/app/models/symptom.model';
import { getSortOrder } from 'src/app/util/array.utils';
import { IDay } from 'src/app/models';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { BottomSheetAddEventComponent } from './bottom-sheet-add-event';
import { GlobalService } from 'src/app/infra/global.service';
import { getDetailedDate, subFormattedDate } from 'src/app/util/date.utils';

@Component({
	selector: 'app-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, AfterViewInit {

	private daysContents: DayViewModel[];
	public daysContents$: Subject<DayViewModel[]>;
	public symptoms: ISymptom[];
	public symptoms$: Observable<ISymptom[]>;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;
	private readonly BATCH_SIZE = 14;
	private nbDays = 0;
	@ViewChildren('dayRefs') dayRefs: QueryList<ElementRef>;

	constructor(
		public globalService: GlobalService,
		private daysService: DaysService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar,
		private bottomSheet: MatBottomSheet
	) { }

	public ngOnInit(): void {
		this.daysContents = new Array<DayViewModel>();
		this.daysContents$ = new Subject<DayViewModel[]>();

		this.loadBatch();

		this.symptoms$ = this.globalService.symptoms$;
		this.symptoms = new Array<ISymptom>();
		this.symptoms$.subscribe(symptoms => {
			symptoms.forEach(symptom => {
				this.symptoms.push(symptom);
			});
		});
		this.symptomMap = this.globalService.symptomMap;
		this.symptomPainColorMap =
			new Map([[0, 'default'], [1, 'pain-1'], [2, 'pain-2'], [3, 'pain-3'], [4, 'pain-4'], [5, 'pain-5']]);
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

	public updateDay(day: IDay): void {
		this.daysContents = this.daysContents.filter(dayContent => dayContent.date !== day.date);
		this.daysContents.push(new DayViewModel(day));
		this.daysContents.sort(getSortOrder('date', true));
		this.daysContents$.next(this.daysContents);
	}

	public ngAfterViewInit(): void {
		/*this.dayRefs.forEach((div: any) => console.log(div.nativeElement));
		console.log(this.dayRefs.toArray());
		//this.myDiv.scrollIntoView();*/
	}

	public openShowDialog(date: string, customEvent: ICustomEvent): void {
		this.dialog.open(DialogShowEventComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { date, 'detailedDate': getDetailedDate(new Date(date)), customEvent }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			} else {
				this.openAddDialog(customEvent.type, date, customEvent);
			}
		});
	}

	public openAddDialog(type: string, date: string, customEvent?: ICustomEvent): void {
		this.dialog.open(DialogAddEventComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { type, date, customEvent }
		}).afterClosed().subscribe(response => {
			this.postAddDialog(date, response, type, customEvent);
		});
	}

	public openAddSymptomDialog(type: string, date: string, symptoms: ISymptom[], customEvent?: ICustomEvent): void {
		this.dialog.open(DialogAddEventComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { type, date, symptoms }
		}).afterClosed().subscribe(response => {
			this.postAddDialog(date, response, type, customEvent);
		});
	}

	public postAddDialog(date: string, response: any, type: string, customEvent: ICustomEvent): void {
		if (response == null || response.answer !== 'yes') {
			return;
		}
		if (response.edit) {
			this.editEvent(date, response, customEvent);
		} else {
			this.addEvent(date, response);
		}
		const action = response.edit ? 'updated' : 'added';
		this.snackBar.open(`The ${type} was successfully ${action} for ${date}`, 'Close');
	}

	public editEvent(date: string, response: any, customEvent: ICustomEvent): void {
		this.daysService.editEvent(
			date,
			customEvent,
			{
				'time': response.time,
				'type': response.type,
				'key': response.key,
				'pain': response.pain,
				'detail': response.detail,
				'quantity': response.quantity
			}).subscribe(day => { this.updateDay(day); });
	}

	public addEvent(date: string, response: any) {
		this.daysService.addEvent(
			date,
			{
				'time': response.time,
				'type': response.type,
				'key': response.key,
				'pain': response.pain,
				'detail': response.detail,
				'quantity': response.quantity
			}).subscribe(day => { this.updateDay(day); });
	}

	public openDeleteDialog(date: string, customEvent: ICustomEvent): void {
		this.dialog.open(DialogDeleteEventComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { date, 'detailedDate': getDetailedDate(new Date(date)), 'type': customEvent.type, 'key': customEvent.key, 'time': customEvent.time }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.daysService.deleteDeepEvent(date, customEvent).subscribe(day => { this.updateDay(day); });
			this.snackBar.open(`The ${customEvent.type} was successfully deleted for ${date}`, 'Close');
		});
	}

	public openEditSymptomOverviewDialog(date: string): void {
		if (this.globalService.targetSymptomKey == null || this.globalService.targetSymptomKey === '') {
			return;
		}
		this.daysService.getDay(date).subscribe(
			d => {
				const symptomOverview = this.daysService.getSymptomOverview(d, this.globalService.targetSymptomKey)
					|| { key: this.globalService.targetSymptomKey, pain: 0 };
				const symptomMap = this.symptomMap;
				this.dialog.open(DialogEditSymptomOverviewComponent, {
					autoFocus: false,
					width: '20rem',
					panelClass: 'custom-modalbox',
					data: { date, symptomOverview, symptomMap }
				}).afterClosed().subscribe(response => {
					if (response == null || response.answer !== 'yes') {
						return;
					}
					this.daysService.addSymptomOverview(date, response.key, response.pain).subscribe(day => { this.updateDay(day); });
				});
			});
	}

	public toggleRemovable(dayViewModel: DayViewModel): void {
		dayViewModel.removable = dayViewModel.removable ? false : true;
	}

	public deleteEvent(date: string, customEvent: ICustomEvent): void {
		this.daysService.deleteEvent(date, customEvent);
	}

	public openBottomSheet(date: string): void {
		this.bottomSheet.open(BottomSheetAddEventComponent, {
			panelClass: 'custom-bottom-sheet'
		})
			.afterDismissed().subscribe(response => {
				if (response == null) {
					return;
				} else if (response.type === 'symptomLog') {
					this.openAddSymptomDialog(response.type, date, this.symptoms);
				} else {
					this.openAddDialog(response.type, date);
				}
			});
	}
}
