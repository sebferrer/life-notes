import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { MatDialog, MatSnackBar } from '@angular/material';
import { DialogAddEventComponent } from './dialog-add-event';
import { DialogDeleteEventComponent } from './dialog-delete-event';
import { map } from 'rxjs/operators';
import { DayViewModel } from 'src/app/models/day.view.model';
import { DialogShowEventComponent } from './dialog-show-event';
import { ICustomEvent } from 'src/app/models/customEvent.model';

@Component({
	selector: 'app-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {

	public daysContents$: Observable<DayViewModel[]>;

	constructor(
		private daysService: DaysService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) { }

	public ngOnInit(): void {
		this.daysContents$ = this.daysService.getDays().pipe(
			map(dayContents => dayContents.map(day => new DayViewModel(day)))
		);
	}

	public openShowDialog(date: string, customEvent: ICustomEvent): void {
		this.dialog.open(DialogShowEventComponent, {
			width: '20rem',
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
			width: '20rem',
			data: { type, typeLabel, date, customEvent }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			if (response.edit) {
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
			} else {
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
			const action = response.edit ? 'updated' : 'added';
			this.snackBar.open(`The ${type} was successfully ${action} for ${date}`, 'Close');
		});
	}

	public openDeleteDialog(date: string, customEvent: ICustomEvent): void {
		const typeLabel = this.daysService.getTypeLabel(customEvent.type);
		this.dialog.open(DialogDeleteEventComponent, {
			width: '20rem',
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
