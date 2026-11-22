import { Component, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

// Invitation to rate the app, shown once (see ReviewService). Dismissed with 'rate', or nothing for "Not now",
// the cross, a tap outside or the back button. No question about the opinion of the user before the card of
// Google Play: its rules forbid it.
@Component({
	selector: 'app-bottom-sheet-review-prompt',
	templateUrl: 'bottom-sheet-review-prompt.component.html',
	styleUrls: ['bottom-sheet-review-prompt.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class BottomSheetReviewPromptComponent {

	public readonly email = 'kimida.life.notes@gmail.com';

	constructor(
		private bottomSheetRef: MatBottomSheetRef<BottomSheetReviewPromptComponent>
	) { }

	public onRateClick(): void {
		this.bottomSheetRef.dismiss('rate');
	}

	public onCloseClick(): void {
		this.bottomSheetRef.dismiss();
	}
}
