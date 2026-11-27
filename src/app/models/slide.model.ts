export interface ISlide {
	index: number;
	label: string;
	title: string;
	text: string;
	// Illustration (see TutorialSceneComponent)
	scene?: string;
	// Title and text of the V1 interface, when they differ
	classicTitle?: string;
	classicText?: string;
}
