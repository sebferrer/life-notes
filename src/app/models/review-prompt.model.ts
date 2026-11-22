import { ICustomEvent } from './customEvent.model';
import { getPainColorLevel } from './symptom.model';

// Invitation to rate the app on Google Play, shown once in the life of the app to the users who know it well,
// right after they added an event (see ReviewService). Pure rules, tested in tests/unit/review-prompt.spec.ts.

export const REVIEW_PROMPT_RULES = {
	// Days stored with data: a day is stored once something is entered on it, removed with its last entry
	minDaysWithData: 15,
	// Days between the first day with data and today
	minDaysSinceFirstDay: 30,
	// A symptom entered at this level of the palette (1 to 5) or above: not the moment to ask
	maxSymptomLevel: 2
};

export interface IReviewPromptContext {
	// Already shown once, whatever the answer
	alreadyShown: boolean;
	// The welcome dialogs of the first launch are not over yet
	firstStart: boolean;
	// Ids of the days stored (their date, YYYY-MM-DD)
	dayIds: string[];
	today: Date;
}

const ONE_DAY = 24 * 60 * 60 * 1000;

function isDayId(id: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(id);
}

// Days from the day id (YYYY-MM-DD) to today, in local time
function daysSince(dayId: string, today: Date): number {
	const [year, month, day] = dayId.split('-').map(Number);
	const start = new Date(year, month - 1, day).getTime();
	const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
	return Math.round((end - start) / ONE_DAY);
}

// The user has used the app for a while: enough days with data, over long enough
export function isReviewPromptDue(context: IReviewPromptContext): boolean {
	if (context.alreadyShown || context.firstStart) {
		return false;
	}
	const days = context.dayIds.filter(isDayId).sort();
	if (days.length < REVIEW_PROMPT_RULES.minDaysWithData) {
		return false;
	}
	return daysSince(days[0], context.today) >= REVIEW_PROMPT_RULES.minDaysSinceFirstDay;
}

// The event just added: not right after a strong symptom (high level of the palette, the scale being inverted or
// not), when the user is in pain
export function isGoodMomentForReview(event: ICustomEvent, invertedScale: boolean): boolean {
	if (event.type !== 'symptomLog' || event.pain == null) {
		return true;
	}
	return getPainColorLevel(event.pain, invertedScale) <= REVIEW_PROMPT_RULES.maxSymptomLevel;
}
