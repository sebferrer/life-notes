import { Component, OnInit } from '@angular/core';
import { ISlide } from 'src/app/models/slide.model';
import { GlobalService } from 'src/app/infra/global.service';
import { Market } from '@ionic-native/market/ngx';

@Component({
	selector: 'app-tutorial',
	templateUrl: './tutorial.component.html',
	styleUrls: ['./tutorial.component.scss']
})
export class TutorialComponent implements OnInit {

	public readonly TUTORIAL_IMG_PATH_FR = 'assets/img/tutorial/fr/';
	public readonly TUTORIAL_IMG_PATH_EN = 'assets/img/tutorial/en/';
	public tutorialPath: string;
	public slides: ISlide[];

	constructor(
		private globalService: GlobalService,
		private market: Market
	) {
		switch (this.globalService.language) {
			case 'fr':
				this.tutorialPath = this.TUTORIAL_IMG_PATH_FR;
				break;
			default:
				this.tutorialPath = this.TUTORIAL_IMG_PATH_EN;
				break;
		}

		this.slides = [
			{
				index: 1,
				label: 'header',
				title: 'TUTORIAL_SLIDE_1_TITLE',
				text: 'TUTORIAL_SLIDE_1_TEXT'
			},
			{
				index: 2,
				label: 'tutorial',
				img: this.tutorialPath + '1.png',
				title: 'TUTORIAL_SLIDE_2_TITLE',
				text: 'TUTORIAL_SLIDE_2_TEXT'
			},
			{
				index: 3,
				label: 'tutorial',
				img: this.tutorialPath + '2.png',
				title: 'TUTORIAL_SLIDE_3_TITLE',
				text: 'TUTORIAL_SLIDE_3_TEXT'
			},
			{
				index: 4,
				label: 'tutorial',
				img: this.tutorialPath + '3.png',
				title: 'TUTORIAL_SLIDE_4_TITLE',
				text: 'TUTORIAL_SLIDE_4_TEXT'
			},
			{
				index: 5,
				label: 'tutorial',
				img: this.tutorialPath + '4.png',
				title: 'TUTORIAL_SLIDE_5_TITLE',
				text: 'TUTORIAL_SLIDE_5_TEXT'
			},
			{
				index: 6,
				label: 'tutorial',
				img: this.tutorialPath + '5.png',
				title: 'TUTORIAL_SLIDE_6_TITLE',
				text: 'TUTORIAL_SLIDE_6_TEXT'
			},
			{
				index: 7,
				label: 'tutorial',
				img: this.tutorialPath + '6.png',
				title: 'TUTORIAL_SLIDE_7_TITLE',
				text: 'TUTORIAL_SLIDE_7_TEXT'
			},
			{
				index: 8,
				label: 'tutorial',
				img: this.tutorialPath + '7.png',
				title: 'TUTORIAL_SLIDE_8_TITLE',
				text: 'TUTORIAL_SLIDE_8_TEXT'
			},
			{
				index: 9,
				label: 'tutorial-longtext',
				img: this.tutorialPath + '8.png',
				title: 'TUTORIAL_SLIDE_9_TITLE',
				text: 'TUTORIAL_SLIDE_9_TEXT'
			},
			{
				index: 10,
				label: 'tutorial',
				img: this.tutorialPath + '9.png',
				title: 'TUTORIAL_SLIDE_10_TITLE',
				text: 'TUTORIAL_SLIDE_10_TEXT'
			},
			{
				index: 11,
				label: 'rateit',
				title: 'TUTORIAL_SLIDE_RATEIT_TITLE',
				text: ''
			}
		];
	}

	public ngOnInit(): void {

	}

	public rateApp(): void {
		window.open('https://play.google.com/store/apps/details?id=com.sebferrer.life_notes', '_blank');
	}

}
