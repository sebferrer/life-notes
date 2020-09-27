import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { MatDialog, MatSnackBar } from '@angular/material';
import { DialogAddEventComponent } from './dialog-add-event';
import { map } from 'rxjs/operators';
import { DayViewModel } from 'src/app/models/day.view.model';

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
			map(dayContents => dayContents.map(dayContent => new DayViewModel(dayContent)))
		);
	}

	public openDialog(type: string, date: string): void {
		const typeLabel = this.daysService.getTypeLabel(type);
		console.log(type);
		console.log(typeLabel);
		this.dialog.open(DialogAddEventComponent, {
			width: '20rem',
			data: { 'type': type, 'typeLabel': typeLabel, 'date': date }
		}).afterClosed().subscribe(response => {
			console.log(response);
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.snackBar.open(`The ${type} was successfully added for ${date}`, 'Close');
		});
	}
}
