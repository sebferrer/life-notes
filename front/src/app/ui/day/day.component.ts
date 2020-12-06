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
import { ISymptomOverview, ISymptomLog } from 'src/app/models/symptom.model';

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

	public title = 'Symptoms';
	public type = 'SteppedAreaChart';
	public data = new Array<Array<any>>();
	public columns = new Array<string>();
	public options = {
		legend: { position: 'bottom', alignment: 'start' },
		vAxis: {
			title: 'Pain',
			viewWindow: {
				max: 5,
				min: 0,
			},
			ticks: [0, 1, 2, 3, 4, 5]
		}
	};
	public timeSymptoms: Map<string, ISymptomOverview[]>;
	public timeSymptomsOrder: string[];
	public lastSymptomMap: Map<string, ISymptomLog>;

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
	}

	public ngOnInit(): void {
		this.dayContent$ = new Subject<DayViewModel>();
		this.daysService.getDay(this.route.snapshot.paramMap.get('date')).subscribe(
			day => {
				this.dayContent = new DayViewModel(day);
				this.dayContent$.next(this.dayContent);

				this.symptoms$.subscribe(() => {
					this.timeSymptoms = new Map<string, ISymptomOverview[]>();
					this.timeSymptomsOrder = new Array<string>();
					this.lastSymptomMap = new Map<string, ISymptomLog>();
					this.columns.push('Time');
					this.dayContent.symptoms.forEach(symptom => {
						symptom.logs.forEach(
							symptomLog => {
								const symptomLabel = this.globalService.symptomMap.get(symptom.key);
								if (!this.columns.includes(symptomLabel)) {
									this.columns.push(symptomLabel);
								}
								if (!this.timeSymptoms.has(symptomLog.time)) {
									this.timeSymptoms.set(symptomLog.time, new Array<ISymptomOverview>())
									this.timeSymptomsOrder.push(symptomLog.time)
								}
								this.timeSymptoms.get(symptomLog.time).push(symptomLog);
								this.lastSymptomMap.set(symptomLog.key, symptomLog);
							}
						);
					});
					this.data = new Array<Array<string | number>>();
					for (const [time, symptomsEntries] of this.timeSymptoms.entries()) {
						const entry = new Array<string | number>();
						entry.push(time);
						this.dayContent.symptoms.forEach(symptom => {
							const registeredSymptom = symptomsEntries.find(s => s.key === symptom.key);
							const registeredSymptomPain = registeredSymptom == null ?
								-1 :
								registeredSymptom.pain;
							entry.push(registeredSymptomPain);
						});
						this.data.push(entry);
					}
					if (this.timeSymptoms.get(this.dayContent.wakeUp) == null) {
						const wakeUpEntry = new Array<string | number>();
						wakeUpEntry.push(this.dayContent.wakeUp);
						this.dayContent.symptoms.forEach(() => {
							wakeUpEntry.push(0);
						});
						this.data.push(wakeUpEntry);
					}
					this.data.sort();
					if (this.timeSymptoms.get(this.dayContent.goToBed) == null) {
						const bedTime = this.dayContent.goToBed > '00:00' && this.dayContent.goToBed < '07:00' ?
							'23:59' : this.dayContent.goToBed;
						const bedTimeEntry = new Array<string | number>();
						bedTimeEntry.push(bedTime);
						this.dayContent.symptoms.forEach(symptom => {
							bedTimeEntry.push(this.lastSymptomMap.get(symptom.key).pain);
						});
						this.data.push(bedTimeEntry);
					}
					this.data.sort();
					for (let i = 0; i < this.data.length; i++) {
						for (let j = 1; j < this.data[i].length; j++) {
							if (this.data[i][j] === -1) {
								this.data[i][j] = i === 0 ? 0 : this.data[i - 1][j];
							}
						}
					}
				});
			}
		);

	}
}
