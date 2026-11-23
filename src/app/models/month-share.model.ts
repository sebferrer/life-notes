import { CalendarPieChartViewModel } from './chartjs/calendar.pie.chart.view.model';
import { DayOverviewViewModel } from './day.overview.view.model';
import { getIntensitySummary } from './intensity-summary.model';
import { ISleepDay, getSleepNights } from './sleep-stats.model';
import { ISymptom } from './symptom.model';

// Address given with the shared image of a month (on the image and in its message)
export const SHARE_SITE_URL = 'https://life-notes.fr';

// One level of the scale under the calendar of the image: its label ('0', '1-2'...) and its color
export interface IMonthShareLegendItem {
	label: string;
	color: string;
}

// Figures of a symptom on the image of a month (see the calendar of the V2, its ring has the same ones)
export interface IMonthShareStats {
	// Days with the symptom (intensity above 0), days with a value on an inverted scale
	days: number;
	// Values of these days on the scale of the settings, null without any day: their average, the worst one
	average: number;
	worst: number;
	// Change from the previous month, only when it is better and the month is over (fewer days with the symptom,
	// a higher average on an inverted scale), null otherwise: the image is meant to be shared
	improvement: number;
	legend: IMonthShareLegendItem[];
}

// Symptoms that can be shared for a month: the ones with at least one intensity entered, in the given order
export function getShareableSymptoms(symptoms: ISymptom[], dayOverviews: DayOverviewViewModel[]): ISymptom[] {
	return symptoms.filter(symptom => symptom != null && hasIntensity(symptom.key, dayOverviews));
}

export function getMonthShareStats(symptom: ISymptom, dayOverviews: DayOverviewViewModel[],
	previousDayOverviews: DayOverviewViewModel[], painScale: number, colors: string[],
	monthOver: boolean): IMonthShareStats {
	const invertedScale = !!symptom.invertedScale;
	const chart = summarize(symptom, dayOverviews, painScale, colors);
	const summary = getIntensitySummary(chart, dayOverviews, symptom.key, invertedScale, painScale);
	return {
		days: summary.days,
		average: summary.average,
		worst: summary.worst,
		improvement: monthOver && hasIntensity(symptom.key, previousDayOverviews)
			? getImprovement(symptom, summary.days, summary.average, previousDayOverviews, painScale, colors)
			: null,
		legend: chart.labels.map((label, level) => ({ label, color: chart.colors[0].backgroundColor[level] }))
	};
}

// The sleep of a month can be shared with at least one complete night (bedtime and wake-up time): its image is the
// sleep card of the calendar
export function hasSleepToShare(dayOverviews: DayOverviewViewModel[], previousDayOverviews: DayOverviewViewModel[]): boolean {
	const days: ISleepDay[] = dayOverviews.map(day =>
		({ day: day.detailedDate.day, wakeUp: day.wakeUpTime, bedTime: day.bedTime }));
	const previous = previousDayOverviews.length > 0 ? previousDayOverviews[previousDayOverviews.length - 1].bedTime : null;
	return getSleepNights(days, previous).some(night => night.duration != null);
}

function getImprovement(symptom: ISymptom, days: number, average: number,
	previousDayOverviews: DayOverviewViewModel[], painScale: number, colors: string[]): number {
	const invertedScale = !!symptom.invertedScale;
	const previous = getIntensitySummary(summarize(symptom, previousDayOverviews, painScale, colors),
		previousDayOverviews, symptom.key, invertedScale, painScale);
	if (!invertedScale) {
		return days < previous.days ? days - previous.days : null;
	}
	if (average == null || previous.average == null) {
		return null;
	}
	// As shown: one decimal
	const change = Math.round((average - previous.average) * 10) / 10;
	return change > 0 ? change : null;
}

function summarize(symptom: ISymptom, dayOverviews: DayOverviewViewModel[], painScale: number,
	colors: string[]): CalendarPieChartViewModel {
	const chart = new CalendarPieChartViewModel('doughnut', symptom.key, colors, !!symptom.invertedScale);
	chart.update(dayOverviews, painScale);
	return chart;
}

function hasIntensity(symptomKey: string, dayOverviews: DayOverviewViewModel[]): boolean {
	return dayOverviews.some(day => day.findSymptomPain(symptomKey) != null);
}
