import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { hexToHsv, hsvToHex, normalizeHex } from 'src/app/util/color.utils';

type DragTarget = 'area' | 'hue';

// Color picker drawn by the app, the same on every device (the native one of the Android WebView is hard to use
// and starts from scratch): a saturation/brightness area, a hue slider, the hexadecimal code and suggested colors.
// It starts from the color given, and emits every change, while dragging too.
@Component({
	selector: 'app-color-picker',
	templateUrl: './color-picker.component.html',
	styleUrls: ['./color-picker.component.scss'],
	encapsulation: ViewEncapsulation.None
})
export class ColorPickerComponent implements OnChanges {

	@Input() public color: string;
	// Suggested colors, shown under the picker
	@Input() public swatches: string[] = [];
	@Output() public colorChange = new EventEmitter<string>();

	public hue = 0;
	public saturation = 0;
	public value = 0;
	public hex = '#000000';
	// Code typed in the field, without the '#'
	public hexText = '000000';
	public dragging: DragTarget = null;

	public ngOnChanges(changes: SimpleChanges): void {
		// The color emitted comes back as input: it's ignored, so that the hue of a grey isn't lost
		const hex = normalizeHex(this.color);
		if (changes.color && hex != null && hex !== this.hex) {
			this.setFromHex(hex);
		}
	}

	// Pure color of the hue, background of the saturation/brightness area
	public get hueColor(): string {
		return hsvToHex(this.hue, 1, 1);
	}

	// Position of a thumb along a track: its center stays inside the track (see $area-radius and $hue-radius)
	public thumbPosition(fraction: number, radius: string): string {
		return `calc(${radius} + (100% - 2 * ${radius}) * ${fraction})`;
	}

	public get normalizedSwatches(): string[] {
		return (this.swatches || []).map(swatch => normalizeHex(swatch)).filter(swatch => swatch != null);
	}

	public onPointerDown(event: PointerEvent, target: DragTarget): void {
		if (event.button > 0) {
			return;
		}
		const element = event.currentTarget as HTMLElement;
		element.setPointerCapture(event.pointerId);
		// Closes the keyboard of the code field, if open
		element.focus({ preventScroll: true });
		this.dragging = target;
		this.moveTo(event, element, target);
	}

	public onPointerMove(event: PointerEvent, target: DragTarget): void {
		if (this.dragging === target) {
			this.moveTo(event, event.currentTarget as HTMLElement, target);
		}
	}

	public onPointerUp(): void {
		this.dragging = null;
	}

	private moveTo(event: PointerEvent, element: HTMLElement, target: DragTarget): void {
		const rect = element.getBoundingClientRect();
		// The thumbs don't go past the edges: the track is shorter by their size
		const thumb = element.querySelector('.cp-thumb') as HTMLElement;
		const radius = thumb ? thumb.offsetWidth / 2 : 0;
		const fraction = (position: number, size: number) =>
			size <= 2 * radius ? 0 : Math.min(1, Math.max(0, (position - radius) / (size - 2 * radius)));
		const x = fraction(event.clientX - rect.left, rect.width);
		if (target === 'area') {
			this.saturation = x;
			this.value = 1 - fraction(event.clientY - rect.top, rect.height);
		} else {
			this.hue = x * 360;
		}
		this.emitFromHsv();
	}

	// Arrows: 1 step, with Shift: 10 steps
	public onAreaKeydown(event: KeyboardEvent): void {
		const step = event.shiftKey ? 0.1 : 0.01;
		const moves: { [key: string]: [number, number] } = {
			ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowDown: [0, -step], ArrowUp: [0, step]
		};
		const move = moves[event.key];
		if (move == null) {
			return;
		}
		event.preventDefault();
		this.saturation = Math.min(1, Math.max(0, this.saturation + move[0]));
		this.value = Math.min(1, Math.max(0, this.value + move[1]));
		this.emitFromHsv();
	}

	public onHueKeydown(event: KeyboardEvent): void {
		const step = event.shiftKey ? 10 : 1;
		const moves: { [key: string]: number } = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
		const move = moves[event.key];
		if (move == null) {
			return;
		}
		event.preventDefault();
		this.hue = Math.min(360, Math.max(0, this.hue + move));
		this.emitFromHsv();
	}

	// Taken as soon as it's a full color (6 digits): '#abc' would change while typing '#abcdef'
	public onHexInput(text: string): void {
		this.hexText = text;
		const digits = (text || '').replace(/[\s#]/g, '');
		const hex = digits.length === 6 ? normalizeHex(digits) : null;
		if (hex != null && hex !== this.hex) {
			this.setFromHex(hex, false);
			this.colorChange.emit(this.hex);
		}
	}

	// A short code is completed, an invalid one gives back the current color
	public onHexBlur(): void {
		const hex = normalizeHex(this.hexText);
		if (hex != null && hex !== this.hex) {
			this.setFromHex(hex);
			this.colorChange.emit(this.hex);
		} else {
			this.hexText = this.hex.slice(1);
		}
	}

	public selectSwatch(swatch: string): void {
		if (swatch !== this.hex) {
			this.setFromHex(swatch);
			this.colorChange.emit(this.hex);
		}
	}

	private setFromHex(hex: string, updateText = true): void {
		const hsv = hexToHsv(hex);
		// Greys have no hue, black has no saturation either: the former ones are kept, the sliders don't jump
		if (hsv.s > 0 && hsv.v > 0) {
			this.hue = hsv.h;
		}
		if (hsv.v > 0) {
			this.saturation = hsv.s;
		}
		this.value = hsv.v;
		this.hex = hex;
		if (updateText) {
			this.hexText = hex.slice(1);
		}
	}

	private emitFromHsv(): void {
		const hex = hsvToHex(this.hue, this.saturation, this.value);
		this.hexText = hex.slice(1);
		if (hex !== this.hex) {
			this.hex = hex;
			this.colorChange.emit(hex);
		}
	}
}
