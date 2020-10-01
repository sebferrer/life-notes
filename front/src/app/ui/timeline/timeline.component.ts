import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { MatDialog, MatSnackBar } from '@angular/material';
import { DialogAddEventComponent } from './dialog-add-event';
import { DialogDeleteEventComponent } from './dialog-delete-event';
import { map } from 'rxjs/operators';
import { DayViewModel } from 'src/app/models/day.view.model';
import { getSortOrder } from 'src/app/util/array.utils';

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

		this.daysService.createNewDay('2020-09-30');

		this.daysContents$ = this.daysService.getDays().pipe(
			map(dayContents => dayContents.map(day => new DayViewModel(day)))
		);
	}

	public openAddDialog(type: string, date: string): void {
		const typeLabel = this.daysService.getTypeLabel(type);
		this.dialog.open(DialogAddEventComponent, {
			width: '20rem',
			data: { type, typeLabel, date }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.snackBar.open(`The ${type} was successfully added for ${date}`, 'Close');
		});
	}

	public openDeleteDialog(date: string, time: string, type: string, key: string): void {
		const typeLabel = this.daysService.getTypeLabel(type);
		this.dialog.open(DialogDeleteEventComponent, {
			width: '20rem',
			data: { type, typeLabel, time, date }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.daysService.deleteEvent(date, time, type, key);
			this.snackBar.open(`The ${type} was successfully deleted for ${date}`, 'Close');
		});
	}

	public toggleRemovable(dayViewModel: DayViewModel): void {
		dayViewModel.removable = dayViewModel.removable ? false : true;
	}

	public deleteEvent(date: string, time: string, type: string, key: string): void {
		this.daysService.deleteEvent(date, time, type, key);
	}
}
