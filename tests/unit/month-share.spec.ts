import { test, expect } from '@playwright/test';
import { DayOverviewViewModel } from '../../src/app/models/day.overview.view.model';
import { getMonthShareStats, getShareableSymptoms, hasSleepToShare } from '../../src/app/models/month-share.model';
import { ISymptom } from '../../src/app/models/symptom.model';

// Default palette of the intensities, from no pain to the worst
const COLORS = ['#8AF59C', '#F1F078', '#FFD940', '#FFB347', '#FF5C5C', '#B22222'];

const HEAD: ISymptom = { key: 'head', label: 'Tête' } as ISymptom;
const BELLY: ISymptom = { key: 'belly', label: 'Ventre' } as ISymptom;
const MOOD: ISymptom = { key: 'mood', label: 'Humeur', invertedScale: true } as ISymptom;

function day(date: string, pains: { [key: string]: number }): DayOverviewViewModel {
	return new DayOverviewViewModel({
		date,
		symptomOverviews: Object.entries(pains).map(([key, pain]) => ({ key, pain }))
	} as any);
}

// A day with its wake-up time and its bedtime (the night before a day ends at its wake-up time)
function sleepDay(day: number, wakeUp: string, goToBed: string): DayOverviewViewModel {
	return new DayOverviewViewModel({
		date: `2026-03-${String(day).padStart(2, '0')}`, detailedDate: { day }, symptomOverviews: [], wakeUp, goToBed
	} as any);
}

// 0-5 scale: head on 3 days (one at 0), mood on 2 days
const MARCH = [
	day('2026-03-01', { head: 2, mood: 4 }),
	day('2026-03-02', { head: 4 }),
	day('2026-03-03', { head: 0, mood: 2 }),
	day('2026-03-04', {})
];
// Head on 4 days, mood lower
const FEBRUARY = [
	day('2026-02-01', { head: 1, mood: 2 }),
	day('2026-02-02', { head: 3, mood: 2 }),
	day('2026-02-03', { head: 2 }),
	day('2026-02-04', { head: 5 })
];

// Image of the month of a symptom, shared from the calendar of the V2
test.describe('Share of a month as an image', () => {

	test('only the symptoms with an intensity in the month can be shared, in the given order', () => {
		expect(getShareableSymptoms([MOOD, BELLY, HEAD, null], MARCH)).toEqual([MOOD, HEAD]);
		// An intensity at 0 is an entry
		expect(getShareableSymptoms([HEAD], [day('2026-03-01', { head: 0 })])).toEqual([HEAD]);
		expect(getShareableSymptoms([HEAD, MOOD], [day('2026-03-01', {})])).toEqual([]);
	});

	test('has the figures of the ring of the calendar, and the legend of the scale', () => {
		const stats = getMonthShareStats(HEAD, MARCH, FEBRUARY, 5, COLORS, false);
		// Days above 0, their average and the highest value
		expect(stats.days).toBe(2);
		expect(stats.average).toBe(3);
		expect(stats.worst).toBe(4);
		expect(stats.legend).toEqual(['0', '1', '2', '3', '4', '5'].map((label, level) => ({ label, color: COLORS[level] })));

		const mood = getMonthShareStats(MOOD, MARCH, FEBRUARY, 5, COLORS, false);
		// Inverted scale: the days with a value, the lowest one, the colors reversed
		expect([mood.days, mood.average, mood.worst]).toEqual([2, 3, 2]);
		expect(mood.legend[0]).toEqual({ label: '0', color: '#B22222' });
	});

	test('on the 0-10 scale, the values are the ones of the scale and the legend has its ranges', () => {
		// Saved in halves: 2 is 4 out of 10
		const stats = getMonthShareStats(HEAD, MARCH, FEBRUARY, 10, COLORS, false);
		expect([stats.average, stats.worst]).toEqual([6, 8]);
		expect(stats.legend.map(item => item.label)).toEqual(['0', '1-2', '3-4', '5-6', '7-8', '9-10']);
	});

	test('tells the improvement on the previous month, once the month is over', () => {
		// 2 days with the symptom instead of 4
		expect(getMonthShareStats(HEAD, MARCH, FEBRUARY, 5, COLORS, true).improvement).toBe(-2);
		// Month in progress: its days so far are not compared to a whole month
		expect(getMonthShareStats(HEAD, MARCH, FEBRUARY, 5, COLORS, false).improvement).toBeNull();
		// Inverted scale: an average of 3 instead of 2
		expect(getMonthShareStats(MOOD, MARCH, FEBRUARY, 5, COLORS, true).improvement).toBe(1);
	});

	test('never tells a worse month, nor a comparison with a month without entry', () => {
		// More days with the symptom, a lower average on an inverted scale: no comparison
		expect(getMonthShareStats(HEAD, FEBRUARY, MARCH, 5, COLORS, true).improvement).toBeNull();
		expect(getMonthShareStats(MOOD, FEBRUARY, MARCH, 5, COLORS, true).improvement).toBeNull();
		// Same number of days
		expect(getMonthShareStats(HEAD, MARCH, MARCH, 5, COLORS, true).improvement).toBeNull();
		// Previous month without any intensity of the symptom: not "fewer days" than nothing tracked
		expect(getMonthShareStats(HEAD, MARCH, [day('2026-02-01', { mood: 3 })], 5, COLORS, true).improvement).toBeNull();
		expect(getMonthShareStats(HEAD, MARCH, [], 5, COLORS, true).improvement).toBeNull();
	});
});

// The sleep of a month, shared from the calendar of the V2 as its sleep card
test.describe('Share of the sleep of a month', () => {

	test('needs at least one complete night', () => {
		// The night before the 1st starts on the last evening of the previous month
		expect(hasSleepToShare([sleepDay(1, '07:00', '')], [sleepDay(28, '', '22:30')])).toBe(true);
		expect(hasSleepToShare([sleepDay(1, '07:00', '23:00'), sleepDay(2, '06:30', '')], [])).toBe(true);
		// A wake-up time without the bedtime of the evening before, a bedtime without the next wake-up time
		expect(hasSleepToShare([sleepDay(1, '07:00', ''), sleepDay(2, '', '23:00')], [])).toBe(false);
		expect(hasSleepToShare([], [])).toBe(false);
	});
});
