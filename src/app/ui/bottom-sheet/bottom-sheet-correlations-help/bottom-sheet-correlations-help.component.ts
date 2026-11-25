import { Component, ViewEncapsulation } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { CORRELATION_HOURS } from 'src/app/models/correlation.model';

// What the correlations are, and above all what they are not: raw statistics on the entries, neither causes nor a
// diagnosis (see CorrelationsComponent)
@Component({
	selector: 'app-bottom-sheet-correlations-help',
	templateUrl: 'bottom-sheet-correlations-help.component.html',
	styleUrls: ['bottom-sheet-correlations-help.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class BottomSheetCorrelationsHelpComponent {

	public readonly hours = CORRELATION_HOURS;

	// Icon and texts of each part: what is compared, then why it proves nothing
	public readonly sections = [
		{ icon: 'compare_arrows', title: 'CORRELATIONS_HELP_COMPARED_TITLE', text: 'CORRELATIONS_HELP_COMPARED_TEXT' },
		{ icon: 'call_split', title: 'CORRELATIONS_HELP_CAUSE_TITLE', text: 'CORRELATIONS_HELP_CAUSE_TEXT' },
		{ icon: 'medical_services', title: 'CORRELATIONS_HELP_DIAGNOSIS_TITLE', text: 'CORRELATIONS_HELP_DIAGNOSIS_TEXT' },
		{ icon: 'signal_cellular_alt', title: 'CORRELATIONS_HELP_SIGNAL_TITLE', text: 'CORRELATIONS_HELP_SIGNAL_TEXT' },
		{ icon: 'lock', title: 'CORRELATIONS_HELP_PRIVACY_TITLE', text: 'CORRELATIONS_HELP_PRIVACY_TEXT' }
	];

	// Confidence levels shown in the part about the signal
	public readonly levels = [3, 2, 1];

	constructor(
		private bottomSheetRef: MatBottomSheetRef<BottomSheetCorrelationsHelpComponent>
	) { }

	public onCloseClick(): void {
		this.bottomSheetRef.dismiss();
	}
}
