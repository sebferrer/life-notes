import {
	AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, ViewChild, ViewEncapsulation
} from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { GlobalService } from 'src/app/infra/global.service';
import {
	CUSTOM_TYPE_COLORS, CUSTOM_TYPE_ICONS, ICustomType, MAX_CUSTOM_TYPE_LABEL_LENGTH, MAX_CUSTOM_TYPE_UNIT_LENGTH,
	generateCustomTypeKey, getCustomTypeColors
} from 'src/app/models/custom-type.model';
import { getEventColorVariables, getEventOnColor } from 'src/app/models/event-colors.model';

// V2: rows of icons shown before the others are unfolded
const COLLAPSED_ICON_ROWS = 3;

export interface IBottomSheetEditCustomTypeData {
	// Missing to create a new type
	customType?: ICustomType;
}

// Creation and edition of an event type created by the user: name, icon, color and quantity
@Component({
	selector: 'app-bottom-sheet-edit-custom-type',
	templateUrl: 'bottom-sheet-edit-custom-type.component.html',
	styleUrls: ['bottom-sheet-edit-custom-type.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class BottomSheetEditCustomTypeComponent implements AfterViewInit, OnDestroy {

	public readonly icons = CUSTOM_TYPE_ICONS;
	public readonly presetColors = CUSTOM_TYPE_COLORS;
	public readonly maxLabelLength = MAX_CUSTOM_TYPE_LABEL_LENGTH;
	public readonly maxUnitLength = MAX_CUSTOM_TYPE_UNIT_LENGTH;
	public readonly edit: boolean;

	public label: string;
	public icon: string;
	public colors: { light: string, dark: string };
	public quantity: boolean;
	public unit: string;
	// CSS variables of the chosen color (--color-event-custom-*), for the preview
	public colorVariables: { [name: string]: string };
	public showColorPicker = false;
	@ViewChild('inlineColorPicker', { read: ElementRef })
	private inlineColorPicker: ElementRef<HTMLElement>;

	// V2: the first rows of icons, the others unfolded with a button (V1: all of them, see GlobalService.uiVersion).
	// Folded by the height of the grid (its rows depend on the width of the screen), so that it unfolds smoothly.
	public readonly collapsibleIcons: boolean;
	public iconsExpanded = false;
	// Height of the grid: its first rows, or all of them
	public iconGridHeight: string = null;
	// Icons of the first rows, the only ones that can be reached while folded
	public visibleIcons = Number.MAX_SAFE_INTEGER;
	public hasMoreIcons = false;
	private iconGrid: ElementRef<HTMLElement>;
	private readonly onWindowResize = () => this.measureIconGrid();

	// Measured once drawn (by the template of the translations, maybe after the view of the sheet)
	@ViewChild('iconGrid')
	private set iconGridElement(element: ElementRef<HTMLElement>) {
		const first = this.iconGrid == null && element != null;
		this.iconGrid = element;
		if (first && this.collapsibleIcons) {
			// After the check of the view that drew it
			Promise.resolve().then(() => this.initIconGrid());
		}
	}

	constructor(
		private bottomSheetRef: MatBottomSheetRef<BottomSheetEditCustomTypeComponent>,
		private changeDetector: ChangeDetectorRef,
		public globalService: GlobalService,
		@Inject(MAT_BOTTOM_SHEET_DATA) public data: IBottomSheetEditCustomTypeData
	) {
		const customType = data.customType;
		this.edit = customType != null;
		if (this.edit) {
			this.label = customType.label;
			this.icon = customType.icon;
			this.colors = { ...customType.colors };
			this.quantity = customType.quantity;
			this.unit = customType.unit;
		} else {
			// The first icon and color not used yet, so that a new type stands out from the others
			const others = this.globalService.customTypes;
			this.label = '';
			this.icon = this.icons.find(icon => !others.some(other => other.icon === icon)) || this.icons[0];
			this.colors = { ...(this.presetColors.find(preset => !others.some(other => other.colors.light === preset.light))
				|| this.presetColors[0]) };
			this.quantity = false;
			this.unit = '';
		}
		this.updateColorVariables();
		this.collapsibleIcons = !this.globalService.isUiV1;
	}

	public ngAfterViewInit(): void {
		if (this.collapsibleIcons) {
			window.addEventListener('resize', this.onWindowResize);
		}
	}

	private initIconGrid(): void {
		this.measureIconGrid();
		// The icon of the type being edited is never hidden
		if (this.icons.indexOf(this.icon) >= this.visibleIcons) {
			this.iconsExpanded = true;
			this.measureIconGrid();
		}
		this.changeDetector.detectChanges();
	}

	public ngOnDestroy(): void {
		window.removeEventListener('resize', this.onWindowResize);
	}

	public toggleIcons(): void {
		this.iconsExpanded = !this.iconsExpanded;
		this.measureIconGrid();
	}

	// The icons of the first rows (as many as fit on a line, which depends on the screen) and the height they take
	private measureIconGrid(): void {
		const grid = this.iconGrid && this.iconGrid.nativeElement;
		const items = grid ? Array.from(grid.children) as HTMLElement[] : [];
		if (items.length === 0) {
			return;
		}
		const firstTop = items[0].offsetTop;
		const columns = items.filter(item => Math.abs(item.offsetTop - firstTop) < 2).length;
		this.visibleIcons = columns * COLLAPSED_ICON_ROWS;
		this.hasMoreIcons = items.length > this.visibleIcons;
		const rowGap = parseFloat(getComputedStyle(grid).rowGap) || 0;
		const folded = COLLAPSED_ICON_ROWS * items[0].offsetHeight + (COLLAPSED_ICON_ROWS - 1) * rowGap;
		this.iconGridHeight = (this.iconsExpanded || !this.hasMoreIcons ? grid.scrollHeight : folded) + 'px';
	}

	// Colors are chosen in the current theme
	public get dark(): boolean {
		return this.globalService.darkMode;
	}

	public get currentColor(): string {
		return this.dark ? this.colors.dark : this.colors.light;
	}

	public presetColor(preset: { light: string, dark: string }): string {
		return this.dark ? preset.dark : preset.light;
	}

	// Check mark drawn on a color
	public onColor(color: string): string {
		return getEventOnColor(color, this.dark);
	}

	public get customColorSelected(): boolean {
		return !this.presetColors.some(preset => this.isPresetSelected(preset));
	}

	public isPresetSelected(preset: { light: string, dark: string }): boolean {
		return preset.light === this.colors.light && preset.dark === this.colors.dark;
	}

	public selectPreset(preset: { light: string, dark: string }): void {
		this.colors = { ...preset };
		this.updateColorVariables();
	}

	// Color picker: the other theme gets a matching variant
	public selectCustomColor(color: string): void {
		this.colors = getCustomTypeColors(color, this.dark);
		this.updateColorVariables();
	}

	// Below the colors, in the sheet: a second sheet would close this one
	public toggleColorPicker(): void {
		this.showColorPicker = !this.showColorPicker;
		if (this.showColorPicker) {
			// Once displayed, scrolled into view
			setTimeout(() => {
				const picker = this.inlineColorPicker && this.inlineColorPicker.nativeElement;
				if (picker && picker.scrollIntoView) {
					picker.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				}
			});
		}
	}

	private updateColorVariables(): void {
		const variables = getEventColorVariables(this.currentColor, this.dark);
		this.colorVariables = {};
		Object.keys(variables).forEach(suffix => this.colorVariables['--color-event-custom' + suffix] = variables[suffix]);
	}

	public get trimmedLabel(): string {
		return (this.label || '').trim();
	}

	// Two types can't have the same name
	public get labelTaken(): boolean {
		const label = this.trimmedLabel.toLowerCase();
		return this.globalService.customTypes.some(other => other.label.toLowerCase() === label
			&& (!this.edit || other.key !== this.data.customType.key));
	}

	public isValid(): boolean {
		return this.trimmedLabel !== '' && !this.labelTaken;
	}

	public onCancel(): void {
		this.bottomSheetRef.dismiss();
	}

	public onConfirm(): void {
		const customType: ICustomType = {
			key: this.edit ? this.data.customType.key : generateCustomTypeKey(),
			label: this.trimmedLabel,
			icon: this.icon,
			colors: { ...this.colors },
			quantity: this.quantity,
			// Kept when the quantity is disabled, for when it's enabled again
			unit: (this.unit || '').trim(),
			// After the other types, even if the clock went back
			created: this.edit ? this.data.customType.created
				: Math.max(Date.now(), ...this.globalService.customTypes.map(other => other.created + 1))
		};
		this.bottomSheetRef.dismiss({ answer: 'yes', customType });
	}
}
