import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { MatDialog, MatSnackBar } from '@angular/material';
import { DialogAddEventComponent } from './dialog-add-event';

@Component({
	selector: 'app-timeline',
	templateUrl: './timeline.component.html',
	styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {

	public daysContents$: Observable<any[]>;

	constructor(
		private daysService: DaysService,
		private dialog: MatDialog,
		private snackBar: MatSnackBar
	) { }

	public ngOnInit(): void {
		this.daysContents$ = this.daysService.getDaysContents();
	}

	public openDialog(type: string, date: string): void {
		this.dialog.open(DialogAddEventComponent, {
			width: '20rem',
			data: { 'type': type, 'date': date }
		}).afterClosed().subscribe(response => {
			console.log(response);
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.snackBar.open(`The ${type} was successfully added for ${date}`, 'Close');
		});
	}
}
