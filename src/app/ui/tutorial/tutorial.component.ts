import { Component } from '@angular/core';
import { ISlide } from 'src/app/models/slide.model';
import { GlobalService } from 'src/app/infra/global.service';

// Illustrated slides: the scene name is also the prefix of the title and text translations
const SCENES = [
	'create-symptom',
	'target-symptom',
	'day-overview',
	'calendar',
	'year-in-pixels',
	'add-event',
	'edit-event',
	'manage',
	'settings',
	'backup-why',
	'backup-save',
	'backup-restore',
	'pdf-report',
	'csv-export'
];

// Slides whose text describes the screens differently in the V1 (the day, the history of the manage lists, no share
// of the month)
const CLASSIC_TEXTS = ['day-overview', 'add-event', 'manage', 'year-in-pixels'];
// Slides whose title too
const CLASSIC_TITLES = ['year-in-pixels'];

@Component({
	selector: 'app-tutorial',
	templateUrl: './tutorial.component.html',
	styleUrls: ['./tutorial.component.scss']
})
export class TutorialComponent {

	public slides: ISlide[];
	public readonly email = 'kimida.life.notes@gmail.com';

	// The tutorial shows the screens of the version of the interface
	public get classic(): boolean {
		return this.globalService.isUiV1;
	}

	constructor(
		private globalService: GlobalService
	) {
		const sceneSlides: ISlide[] = SCENES.map((scene, i) => {
			const key = 'TUTORIAL_' + scene.toUpperCase().replace(/-/g, '_');
			const classicTitle = CLASSIC_TITLES.includes(scene) ? key + '_TITLE_CLASSIC' : undefined;
			const classicText = CLASSIC_TEXTS.includes(scene) ? key + '_TEXT_CLASSIC' : undefined;
			return { index: i + 2, label: 'scene', scene, title: key + '_TITLE', text: key + '_TEXT', classicTitle, classicText };
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
				label: 'contact',
				title: 'TUTORIAL_SLIDE_CONTACT_TITLE',
				text: 'TUTORIAL_SLIDE_CONTACT_TEXT'
			}
		];
	}

}
