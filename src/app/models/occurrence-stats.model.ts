// Statistics of the occurrences of an event (a medication, a note, a symptom...), see OccurrenceStatsComponent

export interface IStatsOccurrence {
	// YYYY-MM-DD
	date: string;
	// HH:mm
	time?: string;
	quantity?: number;
}

// An intensity of a symptom on a day
export interface IStatsIntensity {
	date: string;
	pain: number;
}

export type StatsPeriod = 'week' | 'month';

export interface IStatsBucket {
	// First day of the period
	start: string;
	count: number;
	quantity: number;
	// Average of the intensities of the period, null without any
	intensity: number;
}

export interface IStatsSummary {
	total: number;
	last30Days: number;
	// Since the week of the first occurrence, 0 without any
	perWeek: number;
	quantity: number;
}

// The dates are compared as UTC days, whatever the time zone
function parseDate(date: string): Date {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
	const result = parseDate(date);
	result.setUTCDate(result.getUTCDate() + days);
	return formatDate(result);
}

export function getPeriodStart(date: string, period: StatsPeriod, weekStartsOnSunday: boolean = false): string {
	const start = parseDate(date);
	if (period === 'month') {
		start.setUTCDate(1);
	} else {
		const weekDay = start.getUTCDay();
		start.setUTCDate(start.getUTCDate() - (weekStartsOnSunday ? weekDay : (weekDay + 6) % 7));
	}
	return formatDate(start);
}

// The last periods up to the one of today, the oldest first
export function getPeriodStarts(today: string, period: StatsPeriod, count: number,
	weekStartsOnSunday: boolean = false): string[] {
	const starts: string[] = [];
	const start = parseDate(getPeriodStart(today, period, weekStartsOnSunday));
	for (let i = 0; i < count; i++) {
		starts.unshift(formatDate(start));
		if (period === 'month') {
			start.setUTCMonth(start.getUTCMonth() - 1);
		} else {
			start.setUTCDate(start.getUTCDate() - 7);
		}
	}
	return starts;
}

// Number of periods from the one of a date to the one of another, both included
export function countPeriods(from: string, to: string, period: StatsPeriod, weekStartsOnSunday: boolean = false): number {
	const start = parseDate(getPeriodStart(from, period, weekStartsOnSunday));
	const end = parseDate(getPeriodStart(to, period, weekStartsOnSunday));
	if (period === 'month') {
		return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1;
	}
	return Math.round((end.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
}

export function getStatsBuckets(occurrences: IStatsOccurrence[], intensities: IStatsIntensity[], today: string,
	period: StatsPeriod, count: number, weekStartsOnSunday: boolean = false): IStatsBucket[] {
	const buckets = new Map<string, IStatsBucket & { intensities: number[] }>(
		getPeriodStarts(today, period, count, weekStartsOnSunday)
			.map(start => [start, { start, count: 0, quantity: 0, intensity: null, intensities: [] }]));
	occurrences.filter(occurrence => occurrence.date <= today).forEach(occurrence => {
		const bucket = buckets.get(getPeriodStart(occurrence.date, period, weekStartsOnSunday));
		if (bucket) {
			bucket.count++;
			bucket.quantity += occurrence.quantity || 0;
		}
	});
	intensities.filter(intensity => intensity.date <= today).forEach(intensity => {
		const bucket = buckets.get(getPeriodStart(intensity.date, period, weekStartsOnSunday));
		if (bucket) {
			bucket.intensities.push(intensity.pain);
		}
	});
	return [...buckets.values()].map(({ intensities: values, ...bucket }) => ({
		...bucket,
		intensity: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null
	}));
}

// Number of occurrences of each hour of the day (index 0 for midnight to 1am)
export function getHourCounts(occurrences: IStatsOccurrence[]): number[] {
	const counts = new Array<number>(24).fill(0);
	occurrences.forEach(occurrence => {
		const hour = parseInt((occurrence.time || '').split(':')[0], 10);
		if (hour >= 0 && hour < 24) {
			counts[hour]++;
		}
	});
	return counts;
}

export function getStatsSummary(occurrences: IStatsOccurrence[], today: string,
	weekStartsOnSunday: boolean = false): IStatsSummary {
	const past = occurrences.filter(occurrence => occurrence.date <= today);
	const monthAgo = addDays(today, -29);
	const first = past.reduce((min, occurrence) => occurrence.date < min ? occurrence.date : min, today);
	const weeks = countPeriods(first, today, 'week', weekStartsOnSunday);
	return {
		total: past.length,
		last30Days: past.filter(occurrence => occurrence.date >= monthAgo).length,
		perWeek: past.length > 0 ? past.length / weeks : 0,
		quantity: past.reduce((sum, occurrence) => sum + (occurrence.quantity || 0), 0)
	};
}
