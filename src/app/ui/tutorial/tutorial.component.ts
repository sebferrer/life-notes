import { Component } from '@angular/core';
import { ISlide } from 'src/app/models/slide.model';
import { GlobalService } from 'src/app/infra/global.service';

// Illustrated slides: the scene name is also the prefix of the title and text translations
const SCENES = [
	'create-symptom',
	'target-symptom',
	'day-overview',
	'calendar',
	'add-event',
	'edit-event',
	'manage',
	'settings',
	'backup-why',
	'backup-save',
	'backup-restore',
	'pdf-report'
];

// Slides whose text describes the day differently in the classic design
const CLASSIC_TEXTS = ['day-overview', 'add-event'];

@Component({
	selector: 'app-tutorial',
	templateUrl: './tutorial.component.html',
	styleUrls: ['./tutorial.component.scss']
})
export class TutorialComponent {

	public slides: ISlide[];

	// The tutorial shows the screens of the version of the interface
	public get classic(): boolean {
		return this.globalService.isUiV1;
	}

	constructor(
		private globalService: GlobalService
	) {
		const sceneSlides: ISlide[] = SCENES.map((scene, i) => {
			const key = 'TUTORIAL_' + scene.toUpperCase().replace(/-/g, '_');
			const classicText = CLASSIC_TEXTS.includes(scene) ? key + '_TEXT_CLASSIC' : undefined;
			return { index: i + 2, label: 'scene', scene, title: key + '_TITLE', text: key + '_TEXT', classicText };
		});
		this.slides = [
			{
				index: 1,
				label: 'header',
				title: 'TUTORIAL_SLIDE_1_TITLE',
				text: 'TUTORIAL_SLIDE_1_TEXT'
			},
			...sceneSlides,
			{
				index: sceneSlides.length + 2,
				label: 'rateit',
				title: 'TUTORIAL_SLIDE_RATEIT_TITLE',
				text: ''
			}
		];
	}

	public rateApp(): void {
		window.open('https://play.google.com/store/apps/details?id=com.sebferrer.life_notes', '_system');
	}

}
