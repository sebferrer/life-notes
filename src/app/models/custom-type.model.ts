import { mixColors } from './event-colors.model';

// Event types created by the user, next to the built-in ones (symptoms, meals, medications, sports, notes).
// Their entries all have the generic 'custom' event type, and point to their type definition.
export const CUSTOM_EVENT_TYPE = 'custom';

export interface ICustomType {
	// Never changes: the entries refer to it
	key: string;
	label: string;
	// Name of a Material icon, among CUSTOM_TYPE_ICONS
	icon: string;
	// One color per theme
	colors: { light: string, dark: string };
	// Entries have an optional quantity, e.g. "1.5 L"
	quantity: boolean;
	unit: string;
	created: number;
}

export interface ICustomEntry {
	type: string;
	customType: string;
	time: string;
	// Name of the entry, e.g. "Water". Optional: the type label is shown instead.
	key: string;
	detail: string;
	quantity: number;
}

export interface ICustomEntryHistory {
	key: string;
	occurrences: number;
	lastEntry: string;
	lastQuantity: number;
}

// The built-in event types, in the order of the manage menu
export const BUILT_IN_EVENT_TYPES = ['symptomLog', 'meal', 'med', 'sport', 'log'];

// 10 event types at most, the built-in ones included
export const MAX_EVENT_TYPES = 10;
export const MAX_CUSTOM_TYPES = MAX_EVENT_TYPES - BUILT_IN_EVENT_TYPES.length;
export const MAX_CUSTOM_TYPE_LABEL_LENGTH = 30;
export const MAX_CUSTOM_TYPE_UNIT_LENGTH = 12;

// Icons of the "Material Icons" font, the one of every other icon of the app (no drawn icon).
// tests/e2e/custom-types.spec.ts checks that the font knows each of them.
export const CUSTOM_TYPE_ICONS = [
	// Food and drinks
	'water_drop', 'local_cafe', 'emoji_food_beverage', 'wine_bar', 'sports_bar',
	'restaurant', 'bakery_dining', 'cake', 'icecream',
	// Health
	'medication', 'vaccines', 'healing', 'medical_services', 'monitor_heart',
	'favorite', 'bloodtype', 'thermostat', 'psychology', 'visibility',
	'air', 'sick', 'monitor_weight', 'female',
	// Mood and rest
	'mood', 'sentiment_neutral', 'mood_bad', 'bedtime', 'hotel', 'self_improvement', 'bolt',
	// Activities and outdoors
	'directions_walk', 'directions_run', 'directions_bike', 'pool', 'hiking',
	'sports_tennis', 'park', 'wb_sunny', 'ac_unit', 'flight',
	// Daily life
	'smoking_rooms', 'shower', 'wc', 'work', 'computer',
	'smartphone', 'music_note', 'menu_book', 'pets', 'celebration'
];

// Ready-made colors, distinct from the built-in types: a saturated one for the light theme and a muted, darker one
// for the dark theme, drawn with white (as the default palettes)
export const CUSTOM_TYPE_COLORS: { light: string, dark: string }[] = [
	{ light: '#00897B', dark: '#337D75' },
	{ light: '#8E24AA', dark: '#965BA1' },
	{ light: '#3949AB', dark: '#646CAF' },
	{ light: '#43A047', dark: '#417E4B' },
	{ light: '#D81B60', dark: '#B64B7B' },
	{ light: '#F4511E', dark: '#BA5136' },
	{ light: '#FDD835', dark: '#807125' },
	{ light: '#6D4C41', dark: '#8A6A5C' },
	{ light: '#00ACC1', dark: '#287B88' },
	{ light: '#546E7A', dark: '#5E7580' }
];

// Former dark colors of the ready-made ones (pastel, too bright on dark surfaces), by light color
const LEGACY_CUSTOM_TYPE_DARK_COLORS: { [light: string]: string } = {
	'#00897B': '#4DB6AC', '#8E24AA': '#CE93D8', '#3949AB': '#9FA8DA', '#43A047': '#81C784', '#D81B60': '#F48FB1',
	'#F4511E': '#FF8A65', '#FDD835': '#FFF176', '#6D4C41': '#BCAAA4', '#00ACC1': '#80DEEA', '#546E7A': '#B0BEC5'
};

// Types made with a former ready-made color get its new dark variant, customized colors are left untouched
export function completeCustomTypeColors(customType: ICustomType): ICustomType {
	const colors = customType && customType.colors;
	if (colors == null || typeof colors.light !== 'string' || typeof colors.dark !== 'string') {
		return customType;
	}
	const light = colors.light.toUpperCase();
	if (LEGACY_CUSTOM_TYPE_DARK_COLORS[light] !== colors.dark.toUpperCase()) {
		return customType;
	}
	const preset = CUSTOM_TYPE_COLORS.find(other => other.light === light);
	return { ...customType, colors: { ...colors, dark: preset.dark } };
}

// Dark variant of a color: mixed with a mid grey, so dimmer and less saturated (close to the default palettes)
const DARK_VARIANT_GREY = '#6A6A6A';
// Part of the color in its dark variant
const DARK_VARIANT_WEIGHT = 0.6;

// Color chosen in one theme: the other theme gets a matching variant, muted for the dark one
export function getCustomTypeColors(color: string, darkTheme: boolean): { light: string, dark: string } {
	return darkTheme
		? { light: getLightVariant(color), dark: color.toUpperCase() }
		: { light: color.toUpperCase(), dark: mixColors(color, DARK_VARIANT_GREY, DARK_VARIANT_WEIGHT) };
}

// Inverse of the dark variant: removes the grey part
function getLightVariant(color: string): string {
	const match = /^#([0-9a-f]{6})$/i.exec(color);
	if (match == null) {
		return color;
	}
	const value = parseInt(match[1], 16);
	// Same value on every channel of a grey
	const grey = parseInt(DARK_VARIANT_GREY.slice(1, 3), 16);
	return '#' + [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(channel => {
		const light = Math.round((channel - grey * (1 - DARK_VARIANT_WEIGHT)) / DARK_VARIANT_WEIGHT);
		return ('0' + Math.min(255, Math.max(0, light)).toString(16)).slice(-2);
	}).join('').toUpperCase();
}

// Unique and safe in a CSS class name (see GlobalService.customTypeClass)
export function generateCustomTypeKey(): string {
	return 'ct' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
