import { test, expect } from '@playwright/test';
import {
	fromNightMinutes, getSleepNights, getSleepSummary, toNightMinutes
} from '../../src/app/models/sleep-stats.model';

test.describe('Sleep of the nights of a month', () => {

	test('times are counted from midnight, the evening ones before it', () => {
		expect(toNightMinutes('23:30')).toBe(-30);
		expect(toNightMinutes('00:30')).toBe(30);
		expect(toNightMinutes('07:15')).toBe(435);
		// From 15:00, a time belongs to the evening
		expect(toNightMinutes('14:59')).toBe(899);
		expect(toNightMinutes('15:00')).toBe(-540);
		expect(toNightMinutes('')).toBeNull();
		expect(toNightMinutes(null)).toBeNull();
		expect(fromNightMinutes(-30)).toBe('23:30');
		expect(fromNightMinutes(435)).toBe('07:15');
		expect(fromNightMinutes(-1440)).toBe('00:00');
	});

	test('a night goes from the bedtime of the day before to the wake-up time of the day', () => {
		const nights = getSleepNights([
			{ day: 1, wakeUp: '07:00', bedTime: '00:30' },
			{ day: 2, wakeUp: '07:30', bedTime: '' },
			{ day: 3, wakeUp: '08:00', bedTime: '22:00' },
			// Woken up before going to bed: no duration
			{ day: 4, wakeUp: '21:00', bedTime: '' }
		], '23:00');
		expect(nights).toEqual([
			// Bedtime of the last day of the previous month
			{ day: 1, bedTime: -60, wakeUp: 420, duration: 480 },
			{ day: 2, bedTime: 30, wakeUp: 450, duration: 420 },
			{ day: 3, bedTime: null, wakeUp: 480, duration: null },
			{ day: 4, bedTime: -120, wakeUp: -180, duration: null }
		]);
	});

	test('average, shortest and longest of the month', () => {
		const days = [
			{ day: 1, wakeUp: '07:00', bedTime: '23:00' },
			{ day: 2, wakeUp: '07:30', bedTime: '00:30' },
			{ day: 3, wakeUp: '06:30', bedTime: '' }
		];
		const summary = getSleepSummary(days, getSleepNights(days, null));
		expect(summary).toEqual({
			// 23:00 to 07:30, 00:30 to 06:30
			duration: { average: 435, min: 360, max: 510 },
			// The bedtimes of the evenings of the month
			bedTime: { average: -15, min: -60, max: 30 },
			wakeUp: { average: 420, min: 390, max: 450 }
		});
		expect(getSleepSummary([], [])).toEqual({ duration: null, bedTime: null, wakeUp: null });
	});
});
