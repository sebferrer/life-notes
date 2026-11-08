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

	private static readonly SYMPTOMS: IManageTile =
		{ type: 'symptomLog', label: 'MANAGE_SYMPTOMS', route: '/symptoms', icon: 'spa' };
	private static readonly MEALS: IManageTile =
		{ type: 'meal', label: 'MANAGE_MEALS', route: '/meals', svg: '/assets/svg/curry-chronicles.svg' };
	private static readonly MEDS: IManageTile =
		{ type: 'med', label: 'MANAGE_MEDS', route: '/meds', svg: '/assets/svg/pill-capsule.svg' };
	private static readonly LOGS: IManageTile =
		{ type: 'log', label: 'MANAGE_LOGS', route: '/logs', icon: 'event_note' };
	private static readonly SPORTS: IManageTile =
		{ type: 'sport', label: 'MANAGE_SPORTS', route: '/sports', icon: 'fitness_center' };

	// The custom types come after them. V1: the former tiles stay in place, the meals come after them.
	private readonly v2Tiles = [ManageComponent.SYMPTOMS, ManageComponent.MEALS, ManageComponent.MEDS,
		ManageComponent.SPORTS, ManageComponent.LOGS];
	private readonly v1Tiles = [ManageComponent.SYMPTOMS, ManageComponent.MEDS, ManageComponent.LOGS,
		ManageComponent.SPORTS, ManageComponent.MEALS];

	public get tiles(): IManageTile[] {
		return this.globalService.isUiV1 ? this.v1Tiles : this.v2Tiles;
	}

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
