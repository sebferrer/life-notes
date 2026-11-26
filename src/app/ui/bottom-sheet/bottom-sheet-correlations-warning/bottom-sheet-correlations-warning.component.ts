import { Component, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

// Before the correlations are turned on (advanced settings): the engine is experimental and often wrong, and a link
// can go the other way (the coffee drunk because of the fatigue). Dismissed with { answer: 'yes' } to turn them on.
// Laid out as their help (see BottomSheetCorrelationsHelpComponent), whose styles it shares.
@Component({
	selector: 'app-bottom-sheet-correlations-warning',
	templateUrl: 'bottom-sheet-correlations-warning.component.html',
	styleUrls: [
		'../bottom-sheet-correlations-help/bottom-sheet-correlations-help.component.scss',
		'bottom-sheet-correlations-warning.component.scss'
	],
	encapsulation: ViewEncapsulation.None
})
export class BottomSheetCorrelationsWarningComponent {

	// Icon and texts of each part: it can be wrong, the reverse correlations, then the other explanations
	public readonly sections = [
		{ icon: 'science', title: 'CORRELATIONS_WARNING_EXPERIMENTAL_TITLE', text: 'CORRELATIONS_WARNING_EXPERIMENTAL_TEXT' },
		{ icon: 'swap_horiz', title: 'CORRELATIONS_WARNING_REVERSE_TITLE', text: 'CORRELATIONS_WARNING_REVERSE_TEXT' },
		{ icon: 'call_split', title: 'CORRELATIONS_WARNING_CAUSE_TITLE', text: 'CORRELATIONS_WARNING_CAUSE_TEXT' }
	];

	constructor(
		private bottomSheetRef: MatBottomSheetRef<BottomSheetCorrelationsWarningComponent>
	) { }

	public onCancelClick(): void {
		this.bottomSheetRef.dismiss({ answer: 'no' });
	}

	public onConfirmClick(): void {
		this.bottomSheetRef.dismiss({ answer: 'yes' });
	}
}
