import { Component, OnInit } from '@angular/core';
import { SymptomsService, SettingsService, DaysService } from '../../infra';
import { Subject } from 'rxjs';
import { SymptomViewModel } from 'src/app/models/symptom.view.model';
// import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BottomSheetAddSymptomComponent } from '../bottom-sheet/bottom-sheet-add-symptom';
import * as simplifyString from 'simplify-string';
import { BottomSheetDeleteSymptomComponent } from '../bottom-sheet/bottom-sheet-delete-symptom';
import { ISymptom } from 'src/app/models/symptom.model';
import { GlobalService } from 'src/app/infra/global.service';
import { TranslocoService } from '@ngneat/transloco';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { getDetailedDate } from 'src/app/util/date.utils';

@Component({
	selector: 'app-symptoms',
	templateUrl: './symptoms.component.html',
	styleUrls: ['../manage/manage-list.scss']
})
export class SymptomsComponent implements OnInit {

	public symptoms: SymptomViewModel[];
	public symptoms$: Subject<SymptomViewModel[]>;
	// Number of entries and last day with data of each symptom
	public stats = new Map<string, { count: number, lastDate: IDetailedDate }>();

	// Symptom shown in the toolbar
	public get trackedSymptomKey(): string {
		return this.globalService.targetSymptomKey;
	}

	constructor(
		private translocoService: TranslocoService,
		private globalService: GlobalService,
		private settingsService: SettingsService,
		private symptomsService: SymptomsService,
		private daysService: DaysService,
		private bottomSheet: MatBottomSheet,
		private snackBar: MatSnackBar
	) {
		this.symptoms = new Array<SymptomViewModel>();
		this.symptoms$ = new Subject<SymptomViewModel[]>();
	}

	public ngOnInit(): void {
		this.symptomsService.getSymptoms().subscribe(
			symptoms => {
				this.symptoms = symptoms.map(s => new SymptomViewModel(s));
				this.sortSymptoms();
				this.symptoms$.next(this.symptoms);
			});
		this.loadStats();
	}

	// Entries are the symptoms added to the days; an intensity of the day also counts for the last day
	private loadStats(): void {
		this.daysService.getDays().subscribe(days => {
			const counts = new Map<string, number>();
			const lastDates = new Map<string, string>();
			days.forEach(day => {
				const keys = new Set<string>();
				(day.symptoms || []).forEach(symptom => {
					const count = (symptom.logs || []).length;
					if (count > 0) {
						counts.set(symptom.key, (counts.get(symptom.key) || 0) + count);
						keys.add(symptom.key);
					}
				});
				(day.symptomOverviews || []).filter(overview => overview.pain > 0).forEach(overview => keys.add(overview.key));
				keys.forEach(key => {
					if (!lastDates.has(key) || day.date > lastDates.get(key)) {
						lastDates.set(key, day.date);
					}
				});
			});
			this.stats = new Map([...lastDates.entries()].map(([key, date]) =>
				[key, { count: counts.get(key) || 0, lastDate: getDetailedDate(date) }]));
		});
	}

	public openAddDialog(symptom?: ISymptom): void {
		symptom = symptom == null ? { 'type': null, 'key': null } : symptom;
		this.bottomSheet.open(BottomSheetAddSymptomComponent, {
			panelClass: 'bottom-sheet-container-panel',
			// Only the close button can dismiss it, to avoid losing an ongoing edition
			disableClose: true,
			data: { symptom: JSON.parse(JSON.stringify(symptom)) } // Clone to avoid mutation before save
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			if (response.edit) {
				this.editSymptom(response.key, response.label);
			} else {
				this.addSymptom(response.label);
			}
			const action = response.edit ? 'UPDATED' : 'ADDED';
			this.snackBar.open(this.translocoService.translate('ADD_SYMPTOM_SNACKBAR',
				{ action: this.translocoService.translate(action) }), this.translocoService.translate('CLOSE'),
				{ duration: 2000 });
		});
	}

	public openDeleteDialog(key: string, label: string): void {
		this.bottomSheet.open(BottomSheetDeleteSymptomComponent, {
			panelClass: 'bottom-sheet-container-panel',
			data: { key, label }
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.symptomsService.deleteSymptom(key).subscribe(() => {
				this.symptoms = this.symptoms.filter(symptom => symptom.key !== key);
				this.sortSymptoms(); // Safety sort, though filter preserves order
				this.symptoms$.next(this.symptoms);
				if (this.globalService.targetSymptomKey === key) {
					this.settingsService.setTargetSymptomKey(null).subscribe(() => {
						this.globalService.targetSymptomKey = null;
					});
				}
				this.globalService.loadSymptoms().subscribe(() => { });
			});
			this.snackBar.open(this.translocoService.translate('DELETE_SYMPTOM_SNACKBAR', { label }),
				this.translocoService.translate('CLOSE'),
				{ duration: 2000 });
		});
	}

	public addSymptom(label: string): void {
		const key: string = simplifyString(label);
		this.symptomsService.createNewSymptom(key, label).subscribe(() => {
			this.symptoms.push(new SymptomViewModel({ type: null, key, label }));
			this.sortSymptoms();
			this.symptoms$.next(this.symptoms);
			this.globalService.loadSymptoms().subscribe(() => { });

			if (!this.globalService.targetSymptomKey) {
				this.settingsService.setTargetSymptomKey(key).subscribe(() => {
					this.globalService.targetSymptomKey = key;
				});
			}
		});
	}

	public editSymptom(key: string, label: string): void {
		this.symptomsService.editSymptom(key, label).subscribe(symptom => {
			this.symptoms = this.symptoms.filter(s => s.key !== key);
			this.symptoms.push(new SymptomViewModel(symptom));
			this.sortSymptoms();
			this.symptoms$.next(this.symptoms);
			this.globalService.loadSymptoms().subscribe(() => { });
		});
	}

	private sortSymptoms(): void {
		this.symptoms.sort((a, b) => a.label.localeCompare(b.label));
	}

}
