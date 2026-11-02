import { Component } from '@angular/core';

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

}
