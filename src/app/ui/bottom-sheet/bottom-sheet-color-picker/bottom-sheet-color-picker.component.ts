import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { getEventOnColor, getEventOnFilter } from 'src/app/models/event-colors.model';
import { normalizeHex } from 'src/app/util/color.utils';

export interface IBottomSheetColorPickerData {
	// Translation key of what is colored, e.g. MANAGE_SYMPTOMS
	title: string;
	// The picker starts from it
	color: string;
	// Suggested colors, under the picker
	swatches?: string[];
	// Icon drawn on the color, as on the swatch that opened the sheet: a Material icon or an svg
	icon?: string;
	svg?: string;
	darkTheme: boolean;
}

// Choice of a color, starting from the current one, kept on the side to compare and come back to it.
// Dismissed with { answer: 'yes', color } when applied.
@Component({
	selector: 'app-bottom-sheet-color-picker',
	templateUrl: 'bottom-sheet-color-picker.component.html',
	styleUrls: ['bottom-sheet-color-picker.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class BottomSheetColorPickerComponent {

	public readonly initialColor: string;
	public color: string;

	constructor(
		private bottomSheetRef: MatBottomSheetRef<BottomSheetColorPickerComponent>,
		@Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetColorPickerData
	) {
		this.initialColor = normalizeHex(data.color) || '#000000';
		this.color = this.initialColor;
	}

	public get changed(): boolean {
		return this.color !== this.initialColor;
	}

	// Icons and texts drawn on a color, as in the app
	public onColor(color: string): string {
		return getEventOnColor(color, this.data.darkTheme);
	}

	public onFilter(color: string): string {
		return getEventOnFilter(this.onColor(color));
	}

	public revert(): void {
		this.color = this.initialColor;
	}

	public onCancel(): void {
		this.bottomSheetRef.dismiss({ answer: 'no' });
	}

	public onConfirm(): void {
		this.bottomSheetRef.dismiss({ answer: 'yes', color: this.color });
	}
}
