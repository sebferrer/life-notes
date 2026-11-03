import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import {
	CUSTOMIZABLE_EVENT_TYPES, DEFAULT_EVENT_PALETTES, completeEventPalettes, getContrast, getDefaultEventPalettes,
	getEventBadgeTextColor, getEventOnColor, getEventSoftColor, getEventSoftTextColor, getEventTonalIconColor
} from '../../src/app/models/event-colors.model';

const LIGHT_SURFACE = '#FFFFFF';
const DARK_SURFACE = '#1E1E1E';

// Sass maps of styles.scss, e.g. $light-event-colors: (symptomLog: #FF3154, ...)
function scssMap(name: string): { [key: string]: string } {
	const scss = readFileSync('src/styles.scss', 'utf-8');
	const match = new RegExp(`\\$${name}:\\s*\\(([^)]*)\\)`).exec(scss);
	if (match == null) {
		// Alias of another map, e.g. $dark-event-icons: $dark-event-colors;
		const alias = new RegExp(`\\$${name}:\\s*\\$([\\w-]+);`).exec(scss);
		return scssMap(alias[1]);
	}
	const entries = match[1].split(',').map(entry => entry.split(':').map(part => part.trim()));
	return Object.fromEntries(entries.map(([key, value]) => [key, value.toUpperCase()]));
}

// Every color of a coarse RGB grid: covers very light, very dark and saturated customized colors
const COLOR_GRID: string[] = [];
for (let r = 0; r <= 255; r += 51) {
	for (let g = 0; g <= 255; g += 51) {
		for (let b = 0; b <= 255; b += 51) {
			COLOR_GRID.push('#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase());
		}
	}
}

test.describe('Event colors', () => {

	test('the default palettes of the code and of styles.scss are the same', () => {
		for (const theme of ['light', 'dark']) {
			const scss = scssMap(`${theme}-event-colors`);
			for (const type of CUSTOMIZABLE_EVENT_TYPES) {
				expect(DEFAULT_EVENT_PALETTES[theme][type], `${theme} ${type}`).toBe(scss[type]);
			}
		}
	});

	test('the icon and badge colors precomputed in styles.scss match the code', () => {
		for (const theme of ['light', 'dark']) {
			const colors = scssMap(`${theme}-event-colors`);
			const icons = scssMap(`${theme}-event-icons`);
			const badges = scssMap(`${theme}-event-badge-texts`);
			for (const [type, color] of Object.entries(colors)) {
				expect(getEventTonalIconColor(color, theme === 'dark'), `${theme} ${type} icon`).toBe(icons[type]);
				expect(getEventBadgeTextColor(color, theme === 'dark'), `${theme} ${type} badge`).toBe(badges[type]);
			}
		}
	});

	test('saved palettes are completed and migrated', () => {
		expect(completeEventPalettes(null)).toEqual(getDefaultEventPalettes());
		// Palette saved before the sport type existed
		const old = completeEventPalettes({ light: { symptomLog: '#111111' }, dark: {} } as any);
		expect(old.light).toEqual({ ...DEFAULT_EVENT_PALETTES.light, symptomLog: '#111111' });
		// The first dark defaults (too close to the light ones) are replaced, customized colors are kept
		const legacy = completeEventPalettes({
			light: { ...DEFAULT_EVENT_PALETTES.light },
			dark: { symptomLog: '#e5485f', med: '#123456', log: '#6B7480', sport: '#E67E22' }
		});
		expect(legacy.dark).toEqual({ ...DEFAULT_EVENT_PALETTES.dark, med: '#123456' });
	});

	test('the contrast ratio follows WCAG', () => {
		expect(getContrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
		expect(getContrast('#777777', '#777777')).toBeCloseTo(1, 5);
	});

	test('texts and icons drawn on the default colors keep the theme convention', () => {
		for (const type of CUSTOMIZABLE_EVENT_TYPES) {
			expect(getEventOnColor(DEFAULT_EVENT_PALETTES.light[type], false), type).toBe('#FFFFFF');
			expect(getEventOnColor(DEFAULT_EVENT_PALETTES.dark[type], true), type).toBe('#1A1A1A');
		}
		// Unless the chosen color would make them unreadable
		expect(getEventOnColor('#FFEE58', false)).toBe('#1A1A1A');
		expect(getEventOnColor('#1A237E', true)).toBe('#FFFFFF');
	});

	for (const theme of ['light', 'dark']) {
		test(`texts and icons stay readable on any customized color (${theme} theme)`, () => {
			const dark = theme === 'dark';
			for (const color of COLOR_GRID) {
				const soft = getEventSoftColor(color, dark);
				expect(getContrast(getEventSoftTextColor(color, dark, false), soft), `${color} title`).toBeGreaterThanOrEqual(4.5);
				expect(getContrast(getEventSoftTextColor(color, dark, true), soft), `${color} detail`).toBeGreaterThanOrEqual(4.5);
				expect(getContrast(getEventTonalIconColor(color, dark), soft), `${color} icon`).toBeGreaterThanOrEqual(3);
				const surface = dark ? DARK_SURFACE : LIGHT_SURFACE;
				expect(getContrast(getEventBadgeTextColor(color, dark), surface), `${color} badge`).toBeGreaterThanOrEqual(4.5);
			}
		});
	}
});
