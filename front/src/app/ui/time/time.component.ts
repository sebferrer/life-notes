import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { DaysService } from 'src/app/infra';
import { DialogAddEventComponent } from './dialog-add-event';
import { DialogDeleteEventComponent } from './dialog-delete-event';
import { DialogShowEventComponent } from './dialog-show-event';
import { DialogEditSymptomOverviewComponent } from './dialog-edit-symptom-overview';
import { ICustomEvent } from 'src/app/models/customEvent.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ISymptom } from 'src/app/models/symptom.model';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { BottomSheetAddEventComponent } from './bottom-sheet-add-event';
import { GlobalService } from 'src/app/infra/global.service';
import { getDetailedDate } from 'src/app/util/date.utils';
import { TranslocoService } from '@ngneat/transloco';
import { IDay } from 'src/app/models';
import { DayViewModel } from 'src/app/models/day.view.model';

@Component({
	selector: 'app-time',
	templateUrl: './time.component.html',
	styleUrls: ['./time.component.scss']
})
export abstract class ATimeComponent {

	public symptoms: ISymptom[];
	public symptoms$: Observable<ISymptom[]>;
	public symptomMap: Map<string, string>;
	public symptomPainColorMap: Map<number, string>;

	protected updateCallback: (day: IDay) => void;

	constructor(
		public globalService: GlobalService,
		protected translocoService: TranslocoService,
		protected daysService: DaysService,
		protected dialog: MatDialog,
		protected snackBar: MatSnackBar,
		protected bottomSheet: MatBottomSheet
	) {
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

	public openShowDialog(date: string, customEvent: ICustomEvent, symptoms: ISymptom[]): void {
		this.dialog.open(DialogShowEventComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: { date, 'detailedDate': getDetailedDate(new Date(date)), customEvent }
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			} else {
				if (response.type === 'symptomLog') {
					this.openAddSymptomDialog(customEvent.type, date, symptoms, customEvent);
				}
				else {
					this.openAddDialog(customEvent.type, date, customEvent);
				}
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
			data: { type, date, symptoms, customEvent }
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
		const action = response.edit ? 'UPDATED' : 'ADDED';
		/*this.snackBar.open(this.translocoService.translate('TIMELINE_ADD_EVENT_SNACKBAR',
			{ type: this.translocoService.translate(type), action: this.translocoService.translate(action) }), 'Close',
				{ duration: 2000 });*/
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
			}).subscribe(day => { this.updateCallback(day); });
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
			}).subscribe(day => { this.updateCallback(day); });
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
			this.daysService.deleteDeepEvent(date, customEvent).subscribe(day => { this.updateCallback(day); });
			/*this.snackBar.open(this.translocoService.translate('TIMELINE_DELETE_EVENT_SNACKBAR',
				{ type: this.translocoService.translate(customEvent.type) }), 'Close',
				{ duration: 2000 });*/
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
					this.daysService.addSymptomOverview(date, response.key, response.pain).subscribe(day => { this.updateCallback(day); });
				});
			});
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

	public toggleRemovable(dayViewModel: DayViewModel): void {
		dayViewModel.removable = dayViewModel.removable ? false : true;
	}
}
