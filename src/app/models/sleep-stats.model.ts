// Sleep of the nights of a month, see SleepStatsComponent

const DAY_MINUTES = 24 * 60;
// From this time of the day, a time belongs to the evening before midnight
const EVENING_START = 15 * 60;

// A day of the month with its wake-up time (in the morning) and its bedtime (in the evening, or after midnight)
export interface ISleepDay {
	day: number;
	wakeUp: string;
	bedTime: string;
}

// The night before a day of the month, in minutes from midnight (negative before midnight). null when unknown.
export interface ISleepNight {
	// Day of the wake-up
	day: number;
	bedTime: number;
	wakeUp: number;
	duration: number;
}

export interface ISleepRange {
	average: number;
	min: number;
	max: number;
}

// null for what has no value
export interface ISleepSummary {
	duration: ISleepRange;
	bedTime: ISleepRange;
	wakeUp: ISleepRange;
}

// e.g. 23:30 is -30, 00:30 is 30, 07:15 is 435
export function toNightMinutes(time: string): number {
	const match = /^(\d{1,2}):(\d{2})/.exec(time || '');
	if (match == null) {
		return null;
	}
	const minutes = Number(match[1]) * 60 + Number(match[2]);
	return minutes >= EVENING_START ? minutes - DAY_MINUTES : minutes;
}

// Back to a time of the day, e.g. -30 is 23:30
export function fromNightMinutes(minutes: number): string {
	const time = ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
	return String(Math.floor(time / 60)).padStart(2, '0') + ':' + String(time % 60).padStart(2, '0');
}

// The night before each day: from the bedtime of the day before (the last day of the previous month for the first one)
export function getSleepNights(days: ISleepDay[], previousBedTime: string): ISleepNight[] {
	return days.map((day, i) => {
		const bedTime = toNightMinutes(i === 0 ? previousBedTime : days[i - 1].bedTime);
		const wakeUp = toNightMinutes(day.wakeUp);
		const duration = bedTime != null && wakeUp != null && wakeUp > bedTime ? wakeUp - bedTime : null;
		return { day: day.day, bedTime, wakeUp, duration };
	});
}

function getRange(values: number[]): ISleepRange {
	const known = values.filter(value => value != null);
	if (known.length === 0) {
		return null;
	}
	return {
		average: Math.round(known.reduce((sum, value) => sum + value, 0) / known.length),
		min: Math.min(...known),
		max: Math.max(...known)
	};
}

// The bedtimes are the ones of the evenings of the month, as the wake-up times are the ones of its mornings
export function getSleepSummary(days: ISleepDay[], nights: ISleepNight[]): ISleepSummary {
	return {
		duration: getRange(nights.map(night => night.duration)),
		bedTime: getRange(days.map(day => toNightMinutes(day.bedTime))),
		wakeUp: getRange(nights.map(night => night.wakeUp))
	};
}
