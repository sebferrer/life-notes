import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MealsService } from 'src/app/infra/meals.service';
import { DialogConfirmComponent } from '../dialog/dialog-confirm';
import { BottomSheetConfirmComponent } from '../bottom-sheet/bottom-sheet-confirm';

import { getSortOrder } from 'src/app/util/array.utils';
import { MealHistoryViewModel } from 'src/app/models/meal-history.view.model';
import { IMealHistory } from 'src/app/models/meal.model';
import { DialogOccurrenceHistoryComponent } from '../dialog/dialog-occurrence-history';
import { BottomSheetEditLogComponent } from '../bottom-sheet/bottom-sheet-edit-log';
import { BottomSheetDeleteOverviewComponent } from '../bottom-sheet/bottom-sheet-delete-overview';

@Component({
	selector: 'app-meals',
	templateUrl: './meals.component.html',
	styleUrls: ['../manage/manage-list.scss']
})
export class MealsComponent implements OnInit {

	public meals: MealHistoryViewModel[];
	public meals$: BehaviorSubject<MealHistoryViewModel[]>;


	constructor(
		private mealsService: MealsService,
		private dialog: MatDialog,
		private bottomSheet: MatBottomSheet
	) {
		this.meals = new Array<MealHistoryViewModel>();
		this.meals$ = new BehaviorSubject<MealHistoryViewModel[]>(new Array<MealHistoryViewModel>());
	}

	public ngOnInit(): void {
		this.mealsService.getMeals().subscribe(
			meals => {
				// The meals entered before this list existed are only in the days: built from them the first time
				if (meals.length === 0) {
					this.refreshMealsList();
					return;
				}
				meals.forEach(meal => {
					this.meals.push(new MealHistoryViewModel(meal));
				});
				this.meals$.next(this.meals.sort(getSortOrder("lastEntry", true)));
			});
	}

	public openEditDialog(meal: MealHistoryViewModel): void {
		this.bottomSheet.open(BottomSheetEditLogComponent, {
			panelClass: 'event-bottom-sheet',
			// Only the close button can dismiss it, to avoid losing an ongoing edition
			disableClose: true,
			data: {
				key: meal.key,
				title: 'EDIT_MEAL_TITLE',
				label: 'TABLE_MEAL',
				warning: 'EDIT_MEAL_WARNING'
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.mealsService.editMealEntry(meal.key, response.key).subscribe(meals => {
				this.updateMealsList(meals);
			});
		});
	}

	public openDeleteDialog(meal: MealHistoryViewModel): void {
		this.bottomSheet.open(BottomSheetDeleteOverviewComponent, {
			panelClass: 'event-bottom-sheet',
			data: {
				title: 'DELETE_MEAL_DIALOG_TITLE',
				content: ['DELETE_MEAL_DIALOG_CONTENT_1', 'DELETE_MEAL_DIALOG_CONTENT_2']
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.mealsService.deleteMealEntry(meal.key).subscribe(meals => {
				this.updateMealsList(meals);
			});
		});
	}

	// The history after a deletion, else the default tab of the version of the interface
	public openOccurrenceHistory(meal: MealHistoryViewModel, tab?: 'stats' | 'history'): void {
		this.mealsService.getMealOccurrences(meal.key).subscribe(occurrences => {
			const ref = this.bottomSheet.open(DialogOccurrenceHistoryComponent, {
				panelClass: ['event-bottom-sheet', 'occurrence-history-panel'],
				disableClose: true,
				data: {
					tab,
					title: meal.key,
					type: 'meal',
					key: meal.key,
					occurrences: occurrences.map(o => ({
						date: o.date,
						time: o.time,
						detail: o.detail
					}))
				}
			});
			ref.afterDismissed().subscribe(result => {
				if (result?.hasChanges) {
					this.refreshMealsList();
				}
				if (result?.reopen) {
					this.openOccurrenceHistory(meal, 'history');
				}
			});
		});
	}

	// V1: floating button, confirmation in a dialog (see GlobalService.uiVersion)
	public openRefreshDialog(): void {
		this.dialog.open(DialogConfirmComponent, {
			autoFocus: false,
			width: '20rem',
			panelClass: 'custom-modalbox',
			data: {
				title: 'MEALS_REFRESH_DIALOG_TITLE',
				content: ['MEALS_REFRESH_DIALOG_CONTENT_1', 'MEALS_REFRESH_DIALOG_CONTENT_2']
			}
		}).afterClosed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.refreshMealsList();
		});
	}

	// V2: button of the header, confirmation in a sheet
	public openRefreshSheet(): void {
		this.bottomSheet.open(BottomSheetConfirmComponent, {
			panelClass: 'event-bottom-sheet',
			data: {
				icon: 'sync',
				title: 'MEALS_REFRESH_DIALOG_TITLE',
				content: ['MEALS_REFRESH_DIALOG_CONTENT_1', 'MEALS_REFRESH_DIALOG_CONTENT_2']
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.refreshMealsList();
		});
	}

	private refreshMealsList(): void {
		this.mealsService.refreshMeals().subscribe(meals => {
			this.updateMealsList(meals);
		});
	}

	private updateMealsList(meals: IMealHistory[]): void {
		this.meals = meals.map(m => new MealHistoryViewModel(m)).sort(getSortOrder("lastEntry", true));
		this.meals$.next(this.meals);
	}
}
