import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DaysService, SymptomsService } from 'src/app/infra';
import { DialogAddEventComponent } from './dialog-add-event';
import { DialogDeleteEventComponent } from './dialog-delete-event';
import { map } from 'rxjs/operators';
import { DayViewModel } from 'src/app/models/day.view.model';
import { DialogShowEventComponent } from './dialog-show-event';
import { ICustomEvent } from 'src/app/models/customEvent.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ISymptom } from 'src/app/models/symptom.model';
import { AppComponent } from 'src/app/app.component';

@Component({
	selector: 'app-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {

	public daysContents$: Observable<DayViewModel[]>;
	public symptoms$: Observable<ISymptom[]>;
	public symptomMap: Map<string, string>;
	public targetSymptom: string;

	constructor(
		private app: AppComponent,
		private daysService: DaysService,
		private symptomsService: SymptomsService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) { }

	public ngOnInit(): void {
		this.targetSymptom = this.app.targetSymptom;
		this.daysContents$ = this.daysService.getDays().pipe(
			map(dayContents => dayContents.map(day => new DayViewModel(day)))
		);
		this.symptoms$ = this.app.symptoms$;
		this.symptomMap = this.app.symptomMap;
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
			}).subscribe(() => { this.ngOnInit(); });
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
			}).subscribe(() => { this.ngOnInit(); });
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
			this.daysService.deleteEvent(date, customEvent).subscribe(() => { this.ngOnInit(); });
			this.snackBar.open(`The ${customEvent.type} was successfully deleted for ${date}`, 'Close');
		});
	}

	public toggleRemovable(dayViewModel: DayViewModel): void {
		dayViewModel.removable = dayViewModel.removable ? false : true;
	}

	public deleteEvent(date: string, customEvent: ICustomEvent): void {
		this.daysService.deleteEvent(date, customEvent);
	}
}
