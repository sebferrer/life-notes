import { test, expect } from '@playwright/test';
import { MAX_PAIN_LEVEL, getPainColorLevel } from '../../src/app/models/symptom.model';
import { CalendarPieChartViewModel } from '../../src/app/models/chartjs/calendar.pie.chart.view.model';
import { DayOverviewViewModel } from '../../src/app/models/day.overview.view.model';

const COLORS = ['green', 'yellow', 'gold', 'orange', 'red', 'darkred'];

function day(date: string, pains: { [key: string]: number }): DayOverviewViewModel {
	return new DayOverviewViewModel({
		date,
		symptomOverviews: Object.entries(pains).map(([key, pain]) => ({ key, pain }))
	} as any);
}

// High values are the good ones on an inverted scale (e.g. a mood)
test.describe('Intensity scale of a symptom', () => {

	test('the colors of an inverted scale are the usual ones reversed', () => {
		for (let pain = 0; pain <= MAX_PAIN_LEVEL; pain++) {
			expect(getPainColorLevel(pain, false)).toBe(pain);
			expect(getPainColorLevel(pain, true)).toBe(MAX_PAIN_LEVEL - pain);
		}
		// Half levels of the 0-10 scale go up, out of range values are kept in the palette
		expect(getPainColorLevel(2.5, false)).toBe(3);
		expect(getPainColorLevel(2.5, true)).toBe(2);
		expect(getPainColorLevel(7, false)).toBe(MAX_PAIN_LEVEL);
		expect(getPainColorLevel(-1, true)).toBe(MAX_PAIN_LEVEL);
	});

	test('the doughnut of a usual scale counts the days without value as no pain', () => {
		const chart = new CalendarPieChartViewModel('doughnut', 'head', COLORS);
		chart.update([day('2026-03-01', { head: 5 }), day('2026-03-02', {}), day('2026-03-03', { mood: 1 })], 10);
		expect(chart.labels).toEqual(['0', '1-2', '3-4', '5-6', '7-8', '9-10']);
		expect(chart.data).toEqual([2, 0, 0, 0, 0, 1]);
		expect(chart.colors[0].backgroundColor).toEqual(COLORS);
	});

	test('the doughnut of an inverted scale has its colors reversed, without the days without value', () => {
		const chart = new CalendarPieChartViewModel('doughnut', 'mood', COLORS, true);
		chart.update([day('2026-03-01', { mood: 5 }), day('2026-03-02', {}), day('2026-03-03', { mood: 0 })], 10);
		expect(chart.labels).toEqual(['0', '1-2', '3-4', '5-6', '7-8', '9-10']);
		expect(chart.data).toEqual([1, 0, 0, 0, 0, 1]);
		expect(chart.colors[0].backgroundColor).toEqual([...COLORS].reverse());
	});
});
