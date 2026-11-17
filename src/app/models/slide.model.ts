export interface ISlide {
	index: number;
	label: string;
	title: string;
	text: string;
	// Illustration (see TutorialSceneComponent)
	scene?: string;
	// Text of the classic timeline design, when it differs
	classicText?: string;
}
