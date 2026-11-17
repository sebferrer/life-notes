import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { GlobalService } from 'src/app/infra/global.service';
import { CustomTypesService } from 'src/app/infra/custom-types.service';
import { ICustomEntryHistory, ICustomType } from 'src/app/models/custom-type.model';
import { IDetailedDate } from 'src/app/models/detailed.date';
import { getDetailedDate } from 'src/app/util/date.utils';
import { DialogOccurrenceHistoryComponent } from '../dialog/dialog-occurrence-history';
import { BottomSheetEditLogComponent } from '../bottom-sheet/bottom-sheet-edit-log';
import { BottomSheetDeleteOverviewComponent } from '../bottom-sheet/bottom-sheet-delete-overview';
import { BottomSheetEditCustomTypeComponent } from '../bottom-sheet/bottom-sheet-edit-custom-type';

interface ICustomEntryItem extends ICustomEntryHistory {
	lastEntryDate: IDetailedDate;
}

// Entries of an event type created by the user, grouped by name, and the edition of the type itself
@Component({
	selector: 'app-custom-entries',
	templateUrl: './custom-entries.component.html',
	styleUrls: ['../manage/manage-list.scss', './custom-entries.component.scss']
})
export class CustomEntriesComponent implements OnInit, OnDestroy {

	public typeKey: string;
	public entries$ = new BehaviorSubject<ICustomEntryItem[]>(null);
	private subscriptions = new Subscription();

	constructor(
		public globalService: GlobalService,
		private customTypesService: CustomTypesService,
		private route: ActivatedRoute,
		private router: Router,
		private bottomSheet: MatBottomSheet
	) { }

	public get customType(): ICustomType {
		return this.globalService.getCustomType(this.typeKey);
	}

	public ngOnInit(): void {
		this.subscriptions.add(this.route.paramMap.subscribe(params => {
			this.typeKey = params.get('key');
			this.refreshEntries();
		}));
		// Type deleted (e.g. by a backup import) or unknown link
		this.subscriptions.add(this.globalService.customTypes$.pipe(filter(types => types != null)).subscribe(types => {
			if (!types.some(type => type.key === this.typeKey)) {
				this.router.navigate(['/manage']);
			}
		}));
	}

	public ngOnDestroy(): void {
		this.subscriptions.unsubscribe();
	}

	private refreshEntries(): void {
		this.customTypesService.getEntryHistories(this.typeKey).subscribe(histories => {
			this.entries$.next(histories.map(history => ({
				...history,
				lastEntryDate: history.lastEntry ? getDetailedDate(history.lastEntry) : null
			})));
		});
	}

	public quantityLabel(entry: ICustomEntryItem): string {
		return this.globalService.customQuantityLabel({ customType: this.typeKey, quantity: entry.lastQuantity });
	}

	public openEditTypeDialog(): void {
		this.bottomSheet.open(BottomSheetEditCustomTypeComponent, {
			panelClass: 'custom-type-sheet',
			// Only the close button can dismiss it, to avoid losing an ongoing edition
			disableClose: true,
			data: { customType: this.customType }
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			// The page shows the new label, icon and color as soon as the types are reloaded
			this.customTypesService.saveCustomType(response.customType).subscribe(() => this.refreshEntries());
		});
	}

	// The type and all its entries, after a confirmation telling how many entries are lost
	public openDeleteTypeDialog(): void {
		this.customTypesService.countEntries(this.typeKey).subscribe(count => {
			this.bottomSheet.open(BottomSheetDeleteOverviewComponent, {
				panelClass: 'event-bottom-sheet',
				data: {
					title: 'DELETE_CUSTOM_TYPE_TITLE',
					content: [count === 0 ? 'DELETE_CUSTOM_TYPE_NO_ENTRY'
						: count === 1 ? 'DELETE_CUSTOM_TYPE_ONE_ENTRY' : 'DELETE_CUSTOM_TYPE_ENTRIES', 'IRREVERSIBLE_ACTION'],
					params: { type: this.customType.label, count }
				}
			}).afterDismissed().subscribe(response => {
				if (response == null || response.answer !== 'yes') {
					return;
				}
				// Back to the manage menu once the type is gone (see ngOnInit)
				this.customTypesService.deleteCustomType(this.typeKey).subscribe();
			});
		});
	}

	// The history after a deletion, else the default tab of the version of the interface
	public openOccurrenceHistory(entry: ICustomEntryItem, tab?: 'stats' | 'history'): void {
		this.customTypesService.getEntryOccurrences(this.typeKey, entry.key).subscribe(occurrences => {
			const ref = this.bottomSheet.open(DialogOccurrenceHistoryComponent, {
				panelClass: ['event-bottom-sheet', 'occurrence-history-panel'],
				disableClose: true,
				data: {
					tab,
					title: entry.key || this.customType.label,
					type: 'custom',
					customType: this.typeKey,
					key: entry.key,
					occurrences
				}
			});
			ref.afterDismissed().subscribe(result => {
				if (result?.hasChanges) {
					this.refreshEntries();
				}
				if (result?.reopen) {
					this.openOccurrenceHistory(entry, 'history');
				}
			});
		});
	}

	public openRenameDialog(entry: ICustomEntryItem): void {
		this.bottomSheet.open(BottomSheetEditLogComponent, {
			panelClass: 'event-bottom-sheet',
			// Only the close button can dismiss it, to avoid losing an ongoing edition
			disableClose: true,
			data: {
				key: entry.key,
				title: 'EDIT_CUSTOM_ENTRY_TITLE',
				label: 'CUSTOM_ENTRY_NAME_LABEL',
				warning: 'EDIT_CUSTOM_ENTRY_WARNING'
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.customTypesService.renameEntries(this.typeKey, entry.key, response.key.trim())
				.subscribe(() => this.refreshEntries());
		});
	}

	public openDeleteDialog(entry: ICustomEntryItem): void {
		this.bottomSheet.open(BottomSheetDeleteOverviewComponent, {
			panelClass: 'event-bottom-sheet',
			data: {
				title: 'DELETE_CUSTOM_ENTRY_TITLE',
				content: ['DELETE_CUSTOM_ENTRY_CONTENT', 'IRREVERSIBLE_ACTION'],
				params: { name: entry.key || this.customType.label }
			}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.customTypesService.deleteEntries(this.typeKey, entry.key).subscribe(() => this.refreshEntries());
		});
	}
}
