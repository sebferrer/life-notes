import { test, expect } from '@playwright/test';
import {
	BUILT_IN_EVENT_TYPES, CUSTOM_TYPE_COLORS, CUSTOM_TYPE_ICONS, ICustomType, MAX_CUSTOM_TYPES, MAX_EVENT_TYPES,
	completeCustomTypeColors, generateCustomTypeKey, getCustomTypeColors
} from '../../src/app/models/custom-type.model';
import { DEFAULT_EVENT_PALETTES, getContrast, getEventOnColor, getLuminance } from '../../src/app/models/event-colors.model';

const HEX = /^#[0-9A-F]{6}$/;

function channels(color: string): number[] {
	const value = parseInt(color.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

test.describe('Custom event types', () => {

	test('10 event types at most, the built-in ones included', () => {
		expect(MAX_EVENT_TYPES).toBe(10);
		// Symptoms, meals, medications, sports and notes
		expect(BUILT_IN_EVENT_TYPES.length).toBe(5);
		expect(MAX_CUSTOM_TYPES).toBe(5);
	});

	test('about fifty icons, each one once, written as Material icon names', () => {
		expect(CUSTOM_TYPE_ICONS.length).toBeGreaterThanOrEqual(50);
		expect(new Set(CUSTOM_TYPE_ICONS).size).toBe(CUSTOM_TYPE_ICONS.length);
		for (const icon of CUSTOM_TYPE_ICONS) {
			expect(icon).toMatch(/^[a-z0-9_]+$/);
		}
		// The icons of the built-in types would make a custom type look like one of them
		for (const icon of ['spa', 'event_note', 'fitness_center']) {
			expect(CUSTOM_TYPE_ICONS).not.toContain(icon);
		}
	});

	test('the ready-made colors are valid, distinct, and differ from the built-in types', () => {
		const builtIn = [...Object.values(DEFAULT_EVENT_PALETTES.light), ...Object.values(DEFAULT_EVENT_PALETTES.dark)];
		for (const theme of ['light', 'dark']) {
			const colors = CUSTOM_TYPE_COLORS.map(preset => preset[theme]);
			expect(new Set(colors).size, theme).toBe(colors.length);
			for (const color of colors) {
				expect(color).toMatch(HEX);
				expect(builtIn).not.toContain(color);
			}
		}
		// At least one per custom type, so that each new type gets its own color
		expect(CUSTOM_TYPE_COLORS.length).toBeGreaterThanOrEqual(MAX_CUSTOM_TYPES);
		// Muted in the dark theme, as the default palettes: drawn with white, visible on the dark surfaces
		for (const preset of CUSTOM_TYPE_COLORS) {
			expect(getContrast(preset.dark, '#FFFFFF'), preset.dark).toBeGreaterThanOrEqual(4.5);
			expect(getContrast(preset.dark, '#1E1E1E'), preset.dark).toBeGreaterThanOrEqual(3);
		}
	});

	test('types made with a former ready-made color get its new dark variant, the others are kept', () => {
		const water: ICustomType = {
			key: 'ctwater', label: 'Eau', icon: 'water_drop', colors: { light: '#00897B', dark: '#4DB6AC' },
			quantity: true, unit: 'L', created: 1
		};
		expect(completeCustomTypeColors(water)).toEqual({ ...water, colors: { light: '#00897B', dark: '#337D75' } });
		// Chosen dark color, or light color customized: untouched
		for (const colors of [{ light: '#00897B', dark: '#123456' }, { light: '#123456', dark: '#4DB6AC' }]) {
			expect(completeCustomTypeColors({ ...water, colors })).toEqual({ ...water, colors });
		}
	});

	test('a color chosen in a theme is kept, the other theme gets a matching variant', () => {
		const fromLight = getCustomTypeColors('#00897b', false);
		expect(fromLight.light).toBe('#00897B');
		expect(fromLight.dark).toMatch(HEX);
		// Dimmer in the dark theme, drawn with white as the default palettes
		expect(getLuminance(getCustomTypeColors('#FF3154', false).dark)).toBeLessThan(getLuminance('#FF3154'));
		expect(getEventOnColor(fromLight.dark, true)).toBe('#FFFFFF');

		// The light variant of a dark variant gives the color back (rounding apart)
		const back = getCustomTypeColors(fromLight.dark, true);
		expect(back.dark).toBe(fromLight.dark);
		channels(back.light).forEach((channel, i) => expect(Math.abs(channel - channels('#00897B')[i])).toBeLessThanOrEqual(2));

		// Very dark colors chosen in the dark theme stay valid colors in the light one
		expect(getCustomTypeColors('#101010', true).light).toBe('#000000');
	});

	test('type keys are unique and usable in a CSS class name', () => {
		const keys = Array.from({ length: 500 }, () => generateCustomTypeKey());
		expect(new Set(keys).size).toBe(keys.length);
		for (const key of keys) {
			expect(key).toMatch(/^ct[a-z0-9]+$/);
		}
	});
});
