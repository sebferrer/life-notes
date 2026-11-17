import { test, expect } from '@playwright/test';
import { CalendarPieChartViewModel } from '../../src/app/models/chartjs/calendar.pie.chart.view.model';
import { DayOverviewViewModel } from '../../src/app/models/day.overview.view.model';
import { getIntensitySummary } from '../../src/app/models/intensity-summary.model';

// Default palette of the intensities, from no pain to the worst
const COLORS = ['#8AF59C', '#F1F078', '#FFD940', '#FFB347', '#FF5C5C', '#B22222'];

function day(date: string, pains: { [key: string]: number }): DayOverviewViewModel {
	return new DayOverviewViewModel({
		date,
		symptomOverviews: Object.entries(pains).map(([key, pain]) => ({ key, pain }))
	} as any);
}

function summary(key: string, days: DayOverviewViewModel[], invertedScale: boolean, painScale: number) {
	const chart = new CalendarPieChartViewModel('doughnut', key, COLORS, invertedScale);
	chart.update(days, painScale);
	return getIntensitySummary(chart, days, key, invertedScale, painScale);
}

// Rings of the intensities of the month (calendar of the V2)
test.describe('Intensities of a symptom in the month', () => {

	// 0-10 scale, saved in halves: 4, 10 and 3 out of 10, a day without value and a day at 0
	const DAYS = [
		day('2026-03-01', { head: 2 }),
		day('2026-03-02', { head: 5 }),
		day('2026-03-03', { head: 1.5, mood: 4 }),
		day('2026-03-04', {}),
		day('2026-03-05', { head: 0, mood: 0 })
	];

	test('has the days of the pie chart, level by level, without the empty levels', () => {
		const head = summary('head', DAYS, false, 10);
		expect(head.segments.map(s => [s.label, s.days, s.color])).toEqual([
			['0', 2, '#8AF59C'],
			['3-4', 2, '#FFD940'],
			['9-10', 1, '#B22222']
		]);
		// Every day of the month is counted, a day without value as no pain
		expect(head.total).toBe(5);
	});

	test('sums up the days with the symptom, their average and the highest value on the scale of the settings', () => {
		const head = summary('head', DAYS, false, 10);
		expect(head.days).toBe(3);
		expect(head.average).toBeCloseTo((4 + 10 + 3) / 3);
		expect(head.worst).toBe(10);
		// 0-5 scale: the values as saved
		const fiveScale = summary('head', [day('2026-03-01', { head: 2 }), day('2026-03-02', { head: 5 })], false, 5);
		expect(fiveScale.average).toBe(3.5);
		expect(fiveScale.worst).toBe(5);
	});

	test('an inverted scale counts the days with a value only, 0 included, in reversed colors', () => {
		const mood = summary('mood', DAYS, true, 10);
		expect(mood.total).toBe(2);
		expect(mood.days).toBe(2);
		expect(mood.average).toBe(4);
		// The worst value is the lowest one
		expect(mood.worst).toBe(0);
		expect(mood.segments.map(s => [s.label, s.days, s.color])).toEqual([
			['0', 1, '#B22222'],
			['7-8', 1, '#F1F078']
		]);
	});

	test('without any day, nothing is counted and there is no average', () => {
		const mood = summary('mood', [day('2026-03-01', {})], true, 10);
		expect(mood.segments).toEqual([]);
		expect([mood.total, mood.days, mood.average, mood.worst]).toEqual([0, 0, null, null]);
		// On a normal scale, the days without value are days without the symptom
		const head = summary('head', [day('2026-03-01', {})], false, 10);
		expect(head.segments.map(s => [s.label, s.days])).toEqual([['0', 1]]);
		expect([head.days, head.average, head.worst]).toEqual([0, null, null]);
	});
});
