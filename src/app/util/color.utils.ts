// Conversions used by the color picker. HSV: hue from 0 to 360, saturation and value (brightness) from 0 to 1.
export interface IHsv {
	h: number;
	s: number;
	v: number;
}

// '#AABBCC' from '#aabbcc', 'aabbcc', '#abc' or 'abc' (spaces ignored), null if it isn't a color
export function normalizeHex(color: string): string {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((color || '').replace(/\s/g, ''));
	if (match == null) {
		return null;
	}
	const digits = match[1].length === 3 ? match[1].split('').map(digit => digit + digit).join('') : match[1];
	return '#' + digits.toUpperCase();
}

export function hexToHsv(color: string): IHsv {
	const hex = normalizeHex(color);
	if (hex == null) {
		return null;
	}
	const value = parseInt(hex.slice(1), 16);
	const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(channel => channel / 255);
	const max = Math.max(r, g, b);
	const delta = max - Math.min(r, g, b);
	let h = 0;
	if (delta > 0) {
		if (max === r) {
			h = ((g - b) / delta) % 6;
		} else if (max === g) {
			h = (b - r) / delta + 2;
		} else {
			h = (r - g) / delta + 4;
		}
		h = (h * 60 + 360) % 360;
	}
	return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
	const hue = ((h % 360) + 360) % 360;
	const saturation = Math.min(1, Math.max(0, s));
	const value = Math.min(1, Math.max(0, v));
	const channel = (n: number) => {
		const k = (n + hue / 60) % 6;
		return value - value * saturation * Math.max(0, Math.min(k, 4 - k, 1));
	};
	return '#' + [channel(5), channel(3), channel(1)]
		.map(c => ('0' + Math.round(c * 255).toString(16)).slice(-2))
		.join('').toUpperCase();
}
