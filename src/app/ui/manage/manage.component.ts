import { Component } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { GlobalService } from 'src/app/infra/global.service';
import { CustomTypesService } from 'src/app/infra/custom-types.service';
import { MAX_CUSTOM_TYPES, MAX_EVENT_TYPES } from 'src/app/models/custom-type.model';
import { BottomSheetEditCustomTypeComponent } from '../bottom-sheet/bottom-sheet-edit-custom-type';

export interface IManageTile {
	type: string;
	label: string;
	route: string;
	icon?: string;
	svg?: string;
}

@Component({
	selector: 'app-manage',
	templateUrl: './manage.component.html',
	styleUrls: ['./manage.component.scss']
})
export class ManageComponent {

	public readonly tiles: IManageTile[] = [
		{ type: 'symptomLog', label: 'MANAGE_SYMPTOMS', route: '/symptoms', icon: 'spa' },
		{ type: 'med', label: 'MANAGE_MEDS', route: '/meds', svg: '/assets/svg/pill-capsule.svg' },
		{ type: 'log', label: 'MANAGE_LOGS', route: '/logs', icon: 'event_note' },
		{ type: 'sport', label: 'MANAGE_SPORTS', route: '/sports', icon: 'fitness_center' }
	];

	public readonly maxEventTypes = MAX_EVENT_TYPES;

	constructor(
		public globalService: GlobalService,
		private customTypesService: CustomTypesService,
		private bottomSheet: MatBottomSheet
	) { }

	// The built-in types count in the limit
	public get canAddCustomType(): boolean {
		return this.globalService.customTypes.length < MAX_CUSTOM_TYPES;
	}

	public openCreateDialog(): void {
		this.bottomSheet.open(BottomSheetEditCustomTypeComponent, {
			panelClass: 'custom-type-sheet',
			// Only the close button can dismiss it, to avoid losing an ongoing edition
			disableClose: true,
			data: {}
		}).afterDismissed().subscribe(response => {
			if (response == null || response.answer !== 'yes') {
				return;
			}
			this.customTypesService.saveCustomType(response.customType).subscribe();
		});
	}

}
