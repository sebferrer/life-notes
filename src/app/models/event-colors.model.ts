export const CUSTOMIZABLE_EVENT_TYPES = ['symptomLog', 'med', 'log', 'sport'];

export interface IEventColors {
	symptomLog: string;
	med: string;
	log: string;
	sport: string;
}

// One palette per theme, each one can be customized and reset independently
export interface IEventPalettes {
	light: IEventColors;
	dark: IEventColors;
}

// Keep in sync with $light-event-colors / $dark-event-colors in styles.scss
export const DEFAULT_EVENT_PALETTES: IEventPalettes = {
	light: {
		symptomLog: '#FF3154',
		med: '#0096BF',
		log: '#98A2AE',
		sport: '#FF8C00'
	},
	// Lighter and softer tones: saturated colors look harsh on dark surfaces
	dark: {
		symptomLog: '#FF7A90',
		med: '#5CC8F2',
		log: '#AAB4C0',
		sport: '#FFAD5C'
	}
};

// Former defaults (dark: too close to the light palette). Users who kept them get the new defaults,
// customized colors are left untouched.
const LEGACY_DEFAULTS: { light: Partial<IEventColors>, dark: Partial<IEventColors> } = {
	light: {},
	dark: {
		symptomLog: '#E5485F',
		med: '#1A8FC4',
		log: '#6B7480',
		sport: '#E67E22'
	}
};

export function getDefaultEventPalettes(): IEventPalettes {
	return {
		light: { ...DEFAULT_EVENT_PALETTES.light },
		dark: { ...DEFAULT_EVENT_PALETTES.dark }
	};
}

// Fills missing entries (e.g. palettes saved before a new event type existed) with defaults
export function completeEventPalettes(palettes: IEventPalettes): IEventPalettes {
	const defaults = getDefaultEventPalettes();
	if (palettes == null) {
		return defaults;
	}
	const completed: IEventPalettes = {
		light: { ...defaults.light, ...(palettes.light || {}) },
		dark: { ...defaults.dark, ...(palettes.dark || {}) }
	};
	['light', 'dark'].forEach(theme => {
		CUSTOMIZABLE_EVENT_TYPES.forEach(type => {
			if ((completed[theme][type] || '').toUpperCase() === LEGACY_DEFAULTS[theme][type]) {
				completed[theme][type] = defaults[theme][type];
			}
		});
	});
	return completed;
}

// Derived colors, the same ones are computed in SCSS for the defaults (see event-color-tokens in styles.scss)
export const ON_COLOR_LIGHT = '#FFFFFF';
export const ON_COLOR_DARK = '#1A1A1A';
const LIGHT_SURFACE = '#FFFFFF';
const DARK_SURFACE = '#1E1E1E';

function parseColor(color: string): number[] {
	const match = /^#([0-9a-f]{6})$/i.exec((color || '').trim());
	if (match == null) {
		return null;
	}
	const value = parseInt(match[1], 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Same as the SCSS mix function: weight is the part of the first color
export function mixColors(color: string, base: string, weight: number): string {
	const rgb = parseColor(color);
	const baseRgb = parseColor(base);
	if (rgb == null || baseRgb == null) {
		return color;
	}
	return '#' + rgb.map((channel, i) => {
		const mixed = Math.round(channel * weight + baseRgb[i] * (1 - weight));
		return ('0' + mixed.toString(16)).slice(-2);
	}).join('').toUpperCase();
}

// WCAG relative luminance, from 0 (black) to 1 (white)
export function getLuminance(color: string): number {
	const rgb = parseColor(color);
	if (rgb == null) {
		return 0.5;
	}
	const [r, g, b] = rgb.map(channel => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Texts and icons drawn on an event color: white in the light theme, dark on the pastel colors
// of the dark theme, unless the chosen color would make them unreadable
export function getEventOnColor(color: string, darkTheme: boolean): string {
	const luminance = getLuminance(color);
	if (darkTheme) {
		return luminance < 0.2 ? ON_COLOR_LIGHT : ON_COLOR_DARK;
	}
	return luminance > 0.5 ? ON_COLOR_DARK : ON_COLOR_LIGHT;
}

// Svg icons (<img>) can't use the color property, they are recolored with a filter
export function getEventOnFilter(onColor: string): string {
	return onColor === ON_COLOR_DARK ? 'brightness(0) invert(0.1)' : 'brightness(0) invert(1)';
}

// Background of large surfaces (e.g. timeline cards): pastel in the light theme, tinted in the dark one
export function getEventSoftColor(color: string, darkTheme: boolean): string {
	return darkTheme ? mixColors(color, DARK_SURFACE, 0.3) : mixColors(color, LIGHT_SURFACE, 0.22);
}

// WCAG contrast ratio, from 1 (same color) to 21 (black on white)
export function getContrast(color: string, otherColor: string): number {
	const luminances = [getLuminance(color), getLuminance(otherColor)].sort((a, b) => b - a);
	return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

// Minimum contrast of normal text and of icons (WCAG AA)
const MIN_TEXT_CONTRAST = 4.5;
const MIN_ICON_CONTRAST = 3;

// Shade of the event color readable on a background: the color mixed with black (light theme) or white
// (dark theme), starting from the given part of the event color and lowering it while it isn't readable enough
function getReadableShade(color: string, background: string, darkTheme: boolean, minContrast: number,
	weight = 1): string {
	const base = darkTheme ? '#FFFFFF' : '#000000';
	let shade = mixColors(color, base, weight);
	while (weight > 0 && getContrast(shade, background) < minContrast) {
		weight = Math.max(0, weight - 0.05);
		shade = mixColors(color, base, weight);
	}
	return shade;
}

// Text drawn on the soft background: a very dark (light theme) or very pale (dark theme) shade of the event
// color rather than a neutral grey. Muted is for secondary texts (e.g. details).
// Weights are the part of the event color, see styles.scss.
export function getEventSoftTextColor(color: string, darkTheme: boolean, muted: boolean): string {
	const weight = darkTheme ? (muted ? 0.7 : 0.3) : (muted ? 0.55 : 0.35);
	return getReadableShade(color, getEventSoftColor(color, darkTheme), darkTheme, MIN_TEXT_CONTRAST, weight);
}

// Icons of the "tonal" bubbles (soft background): the event color, darkened (light theme) or lightened
// (dark theme) only as much as needed to stand out from the background
export function getEventTonalIconColor(color: string, darkTheme: boolean): string {
	return getReadableShade(color, getEventSoftColor(color, darkTheme), darkTheme, MIN_ICON_CONTRAST);
}

// Text of the badges (e.g. intensity, dose), drawn on a pill of the surface color: the event color, darkened
// or lightened only as much as needed to be readable (a soft look, not an alarming dark red)
export function getEventBadgeTextColor(color: string, darkTheme: boolean): string {
	return getReadableShade(color, darkTheme ? DARK_SURFACE : LIGHT_SURFACE, darkTheme, MIN_TEXT_CONTRAST);
}

// Every CSS variable of an event color, by suffix: --color-event-<type><suffix>
export function getEventColorVariables(color: string, darkTheme: boolean): { [suffix: string]: string } {
	const onColor = getEventOnColor(color, darkTheme);
	return {
		'': color,
		'-on': onColor,
		'-on-filter': getEventOnFilter(onColor),
		'-soft': getEventSoftColor(color, darkTheme),
		'-soft-text': getEventSoftTextColor(color, darkTheme, false),
		'-soft-text-muted': getEventSoftTextColor(color, darkTheme, true),
		'-icon': getEventTonalIconColor(color, darkTheme),
		'-badge-text': getEventBadgeTextColor(color, darkTheme)
	};
}
