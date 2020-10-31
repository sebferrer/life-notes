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
import { AppComponent } from 'src/app/app.component';
import { getSortOrder } from 'src/app/util/array.utils';
import { IDay } from 'src/app/models';

@Component({
	selector: 'app-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, AfterViewInit {

	private daysContents: DayViewModel[];
	public daysContents$: Subject<DayViewModel[]>;
	public symptoms$: Observable<ISymptom[]>;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;
	@ViewChildren('dayRefs') dayRefs: QueryList<ElementRef>;

	constructor(
		private app: AppComponent,
		private daysService: DaysService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) { }

	public ngOnInit(): void {
		this.daysContents = new Array<DayViewModel>();
		this.daysContents$ = new Subject<DayViewModel[]>();
		this.daysService.getDays().subscribe(
			days => {
				days.forEach(day => {
					this.daysContents.push(new DayViewModel(day));
				});
				this.daysContents$.next(this.daysContents);
			}
		);
		this.symptoms$ = this.app.symptoms$;
		this.symptomMap = this.app.symptomMap;
		this.symptomPainColorMap =
			new Map([[0, 'default'], [1, 'light-yellow'], [2, 'yellow'], [3, 'orange'], [4, 'red'], [5, 'dark-red']]);
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
			data: { date, customEvent }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			} else {
				this.openAddDialog(customEvent.type, date, customEvent);
			}
		});
	}

	public openAddDialog(type: string, date: string, customEvent?: ICustomEvent): void {
		const typeLabel = this.daysService.getTypeLabel(type);
		this.dialog.open(DialogAddEventComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { type, typeLabel, date, customEvent }
		}).afterClosed().subscribe(response => {
			this.postAddDialog(date, response, type, customEvent);
		});
	}

	public openAddSymptomDialog(type: string, date: string, symptoms: ISymptom[], customEvent?: ICustomEvent): void {
		const typeLabel = this.daysService.getTypeLabel(type);
		this.dialog.open(DialogAddEventComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { type, typeLabel, date, symptoms }
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
		const typeLabel = this.daysService.getTypeLabel(customEvent.type);
		this.dialog.open(DialogDeleteEventComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { date, typeLabel, customEvent }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.daysService.deleteEvent(date, customEvent).subscribe(day => { this.updateDay(day); });
			this.snackBar.open(`The ${customEvent.type} was successfully deleted for ${date}`, 'Close');
		});
	}

	public openEditSymptomOverviewDialog(date: string): void {
		if (this.app.targetSymptomKey == null) {
			return;
		}
		this.daysService.getDay(date).subscribe(
			d => {
				const symptomOverview = this.daysService.getSymptomOverview(d, this.app.targetSymptomKey) || { key: this.app.targetSymptomKey, pain: 0 };
				this.dialog.open(DialogEditSymptomOverviewComponent, {
					autoFocus: false,
					width: '20rem',
					panelClass: 'custom-modalbox',
					data: { date, symptomOverview }
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
}
