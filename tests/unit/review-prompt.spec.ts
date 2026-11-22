import { test, expect } from '@playwright/test';
import {
	REVIEW_PROMPT_RULES, isGoodMomentForReview, isReviewPromptDue
} from '../../src/app/models/review-prompt.model';
import { ICustomEvent } from '../../src/app/models/customEvent.model';

const TODAY = new Date(2026, 10, 21, 10, 30);

// Ids of `count` days, one every `step` days, the last one `lastDaysAgo` days before TODAY
function dayIds(count: number, step = 1, lastDaysAgo = 0): string[] {
	return Array.from({ length: count }, (_, i) => {
		const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - lastDaysAgo - i * step);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	});
}

function event(type: string, pain?: number): ICustomEvent {
	return { type, time: '10:00', key: 'k', detail: '', pain, quantity: null };
}

// Invitation to rate the app: once, to the users who know the app, never right after a strong symptom
test.describe('Invitation to rate the app', () => {

	const context = (ids: string[], options: { alreadyShown?: boolean, firstStart?: boolean } = {}) => ({
		alreadyShown: false, firstStart: false, dayIds: ids, today: TODAY, ...options
	});

	test('due for a user with enough days of data over a month', () => {
		// 15 days of data spread over 6 weeks
		expect(isReviewPromptDue(context(dayIds(15, 3)))).toBe(true);
		// Years of data
		expect(isReviewPromptDue(context(dayIds(1500)))).toBe(true);
	});

	test('never twice, nor during the first launch', () => {
		expect(isReviewPromptDue(context(dayIds(1500), { alreadyShown: true }))).toBe(false);
		expect(isReviewPromptDue(context(dayIds(1500), { firstStart: true }))).toBe(false);
	});

	test('not for a new user', () => {
		expect(isReviewPromptDue(context([]))).toBe(false);
		// Every day for 3 weeks: not long enough
		expect(isReviewPromptDue(context(dayIds(21)))).toBe(false);
		// Two months, but only a few days with data
		expect(isReviewPromptDue(context(dayIds(REVIEW_PROMPT_RULES.minDaysWithData - 1, 5)))).toBe(false);
	});

	test('the limits', () => {
		const { minDaysWithData, minDaysSinceFirstDay } = REVIEW_PROMPT_RULES;
		// The first day exactly minDaysSinceFirstDay days ago
		const justEnough = [...dayIds(minDaysWithData - 1), ...dayIds(1, 1, minDaysSinceFirstDay)];
		expect(isReviewPromptDue(context(justEnough))).toBe(true);
		const tooRecent = [...dayIds(minDaysWithData - 1), ...dayIds(1, 1, minDaysSinceFirstDay - 1)];
		expect(isReviewPromptDue(context(tooRecent))).toBe(false);
	});

	test('the ids that are not days are ignored, in any order', () => {
		const ids = [...dayIds(15, 3)].reverse();
		expect(isReviewPromptDue(context([...ids, '_design/x']))).toBe(true);
		expect(isReviewPromptDue(context([...dayIds(14, 3), '_design/a', 'x', 'y']))).toBe(false);
	});

	test('not right after a strong symptom', () => {
		// Any other event
		for (const type of ['med', 'meal', 'log', 'sport', 'custom', 'wakeUp', 'goToBed']) {
			expect(isGoodMomentForReview(event(type), false), type).toBe(true);
		}
		// Intensities stored from 0 to 5 (half steps on the 0-10 scale)
		expect(isGoodMomentForReview(event('symptomLog', 0), false)).toBe(true);
		expect(isGoodMomentForReview(event('symptomLog', 2), false)).toBe(true);
		expect(isGoodMomentForReview(event('symptomLog', 2.5), false)).toBe(false);
		expect(isGoodMomentForReview(event('symptomLog', 5), false)).toBe(false);
		expect(isGoodMomentForReview(event('symptomLog'), false)).toBe(true);
		// Inverted scale (e.g. a mood): the high values are the good ones
		expect(isGoodMomentForReview(event('symptomLog', 5), true)).toBe(true);
		expect(isGoodMomentForReview(event('symptomLog', 3), true)).toBe(true);
		expect(isGoodMomentForReview(event('symptomLog', 1), true)).toBe(false);
	});

	// Each value of the slider of the sheet adding a symptom, stored as it stores it (half of it on the 0-10 scale)
	test('every intensity of both scales: up to 2 of 5, up to 4 of 10', () => {
		const cases = [
			{ scale: 5, allowed: [0, 1, 2], allowedInverted: [3, 4, 5] },
			{ scale: 10, allowed: [0, 1, 2, 3, 4], allowedInverted: [5, 6, 7, 8, 9, 10] }
		];
		for (const { scale, allowed, allowedInverted } of cases) {
			for (let value = 0; value <= scale; value++) {
				const stored = scale === 10 ? value / 2 : value;
				expect(isGoodMomentForReview(event('symptomLog', stored), false), `${value}/${scale}`)
					.toBe(allowed.includes(value));
				expect(isGoodMomentForReview(event('symptomLog', stored), true), `${value}/${scale}, inverted`)
					.toBe(allowedInverted.includes(value));
			}
		}
	});
});
