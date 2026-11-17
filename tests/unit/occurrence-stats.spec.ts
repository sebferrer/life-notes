import { test, expect } from '@playwright/test';
import {
	countPeriods, getHourCounts, getPeriodStart, getPeriodStarts, getStatsBuckets, getStatsSummary
} from '../../src/app/models/occurrence-stats.model';

// Wednesday
const TODAY = '2026-03-18';

test.describe('Statistics of the occurrences of an event', () => {

	test('periods start on monday or sunday, or on the first of the month', () => {
		expect(getPeriodStart(TODAY, 'week')).toBe('2026-03-16');
		expect(getPeriodStart(TODAY, 'week', true)).toBe('2026-03-15');
		expect(getPeriodStart('2026-03-15', 'week')).toBe('2026-03-09');
		expect(getPeriodStart('2026-03-15', 'week', true)).toBe('2026-03-15');
		expect(getPeriodStart(TODAY, 'month')).toBe('2026-03-01');
		// Across a year
		expect(getPeriodStart('2026-01-01', 'week')).toBe('2025-12-29');
	});

	test('the last periods up to the current one, the oldest first', () => {
		expect(getPeriodStarts(TODAY, 'week', 3)).toEqual(['2026-03-02', '2026-03-09', '2026-03-16']);
		expect(getPeriodStarts('2026-02-10', 'month', 3)).toEqual(['2025-12-01', '2026-01-01', '2026-02-01']);
		expect(countPeriods('2026-02-06', TODAY, 'week', true)).toBe(7);
		expect(countPeriods('2025-11-30', TODAY, 'month')).toBe(5);
		expect(countPeriods(TODAY, TODAY, 'week')).toBe(1);
	});

	test('each period counts its occurrences, sums their quantities and averages the intensities', () => {
		const buckets = getStatsBuckets([
			{ date: '2026-03-18', quantity: 1.5 },
			{ date: '2026-03-16', quantity: 0.5 },
			{ date: '2026-03-10' },
			// Before the periods shown, and to come
			{ date: '2026-01-01' },
			{ date: '2026-03-20' }
		], [
			{ date: '2026-03-17', pain: 3 },
			{ date: '2026-03-18', pain: 4 }
		], TODAY, 'week', 3);
		expect(buckets).toEqual([
			{ start: '2026-03-02', count: 0, quantity: 0, intensity: null },
			{ start: '2026-03-09', count: 1, quantity: 0, intensity: null },
			{ start: '2026-03-16', count: 2, quantity: 2, intensity: 3.5 }
		]);
	});

	test('the hours of the day', () => {
		const counts = getHourCounts([{ date: TODAY, time: '08:15' }, { date: TODAY, time: '08:59' },
			{ date: TODAY, time: '23:00' }, { date: TODAY }]);
		expect(counts).toHaveLength(24);
		expect(counts[8]).toBe(2);
		expect(counts[23]).toBe(1);
		expect(counts.reduce((sum, count) => sum + count, 0)).toBe(3);
	});

	test('key figures: total, last 30 days, per week since the first one, quantities', () => {
		expect(getStatsSummary([], TODAY)).toEqual({ total: 0, last30Days: 0, perWeek: 0, quantity: 0 });
		const summary = getStatsSummary([
			{ date: TODAY, quantity: 2 },
			{ date: '2026-02-17', quantity: 1 },
			{ date: '2026-02-16' },
			{ date: '2026-03-25' }
		], TODAY);
		// 30 days with today: from the 17th of february. 5 weeks from the one of the 16th of february.
		expect(summary).toEqual({ total: 3, last30Days: 2, perWeek: 3 / 5, quantity: 3 });
	});
});
