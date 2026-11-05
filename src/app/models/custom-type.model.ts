import { CUSTOMIZABLE_EVENT_TYPES, mixColors } from './event-colors.model';

// Event types created by the user, next to the built-in ones (symptoms, medications, notes, sports).
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

// 10 event types at most, the built-in ones included
export const MAX_EVENT_TYPES = 10;
export const MAX_CUSTOM_TYPES = MAX_EVENT_TYPES - CUSTOMIZABLE_EVENT_TYPES.length;
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

// Ready-made colors, distinct from the built-in types: a saturated one for the light theme and a softer one
// for the dark theme (as the default palettes)
export const CUSTOM_TYPE_COLORS: { light: string, dark: string }[] = [
	{ light: '#00897B', dark: '#4DB6AC' },
	{ light: '#8E24AA', dark: '#CE93D8' },
	{ light: '#3949AB', dark: '#9FA8DA' },
	{ light: '#43A047', dark: '#81C784' },
	{ light: '#D81B60', dark: '#F48FB1' },
	{ light: '#F4511E', dark: '#FF8A65' },
	{ light: '#FDD835', dark: '#FFF176' },
	{ light: '#6D4C41', dark: '#BCAAA4' },
	{ light: '#00ACC1', dark: '#80DEEA' },
	{ light: '#546E7A', dark: '#B0BEC5' }
];

// Part of the light color in its dark variant (the rest is white), close to the default palettes
const DARK_VARIANT_WEIGHT = 0.65;

// Color chosen in one theme: the other theme gets a matching variant, softer for the dark one
export function getCustomTypeColors(color: string, darkTheme: boolean): { light: string, dark: string } {
	return darkTheme
		? { light: getLightVariant(color), dark: color.toUpperCase() }
		: { light: color.toUpperCase(), dark: mixColors(color, '#FFFFFF', DARK_VARIANT_WEIGHT) };
}

// Inverse of the dark variant: removes the white part
function getLightVariant(color: string): string {
	const match = /^#([0-9a-f]{6})$/i.exec(color);
	if (match == null) {
		return color;
	}
	const value = parseInt(match[1], 16);
	return '#' + [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(channel => {
		const light = Math.round((channel - 255 * (1 - DARK_VARIANT_WEIGHT)) / DARK_VARIANT_WEIGHT);
		return ('0' + Math.min(255, Math.max(0, light)).toString(16)).slice(-2);
	}).join('').toUpperCase();
}

// Unique and safe in a CSS class name (see GlobalService.customTypeClass)
export function generateCustomTypeKey(): string {
	return 'ct' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
