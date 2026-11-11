import { test, expect } from '@playwright/test';
import { hexToHsv, hsvToHex, normalizeHex } from '../../src/app/util/color.utils';

test.describe('Conversions of the color picker', () => {

	test('codes are read with or without #, short or long, in any case', () => {
		expect(normalizeHex('#abcdef')).toBe('#ABCDEF');
		expect(normalizeHex('abcdef')).toBe('#ABCDEF');
		expect(normalizeHex('#f80')).toBe('#FF8800');
		expect(normalizeHex(' #12 34 56 ')).toBe('#123456');
		for (const invalid of ['', '#12', '#12345', '#1234567', '#GGGGGG', 'red', null, undefined]) {
			expect(normalizeHex(invalid), String(invalid)).toBeNull();
		}
	});

	test('known colors', () => {
		expect(hexToHsv('#FF0000')).toEqual({ h: 0, s: 1, v: 1 });
		expect(hexToHsv('#00FF00')).toEqual({ h: 120, s: 1, v: 1 });
		expect(hexToHsv('#000080')).toEqual({ h: 240, s: 1, v: 128 / 255 });
		expect(hexToHsv('#808080')).toEqual({ h: 0, s: 0, v: 128 / 255 });
		expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
		expect(hsvToHex(0, 1, 1)).toBe('#FF0000');
		expect(hsvToHex(60, 1, 1)).toBe('#FFFF00');
		expect(hsvToHex(300, 1, 1)).toBe('#FF00FF');
		// The end of the hue slider
		expect(hsvToHex(360, 1, 1)).toBe('#FF0000');
		expect(hsvToHex(200, 0, 1)).toBe('#FFFFFF');
		expect(hsvToHex(200, 1, 0)).toBe('#000000');
		// Out of range values are clamped
		expect(hsvToHex(-120, 2, 3)).toBe('#0000FF');
	});

	test('every color comes back the same after a round trip through HSV', () => {
		for (let r = 0; r <= 255; r += 17) {
			for (let g = 0; g <= 255; g += 17) {
				for (let b = 0; b <= 255; b += 17) {
					const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
					const { h, s, v } = hexToHsv(hex);
					expect(hsvToHex(h, s, v), hex).toBe(hex);
				}
			}
		}
	});
});
