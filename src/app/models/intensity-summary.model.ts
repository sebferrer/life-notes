import { CalendarPieChartViewModel } from './chartjs/calendar.pie.chart.view.model';
import { DayOverviewViewModel } from './day.overview.view.model';

// One level of intensity of a symptom in the month: its days, in the color of the level
export interface IIntensitySegment {
	level: number;
	// '0', '1-2'... as in the legend
	label: string;
	days: number;
	color: string;
}

// Month of a symptom, as its ring in the calendar of the V2 sums it up
export interface IIntensitySummary {
	// Levels having at least one day
	segments: IIntensitySegment[];
	// Days counted: every day of the month, only the days with a value on an inverted scale
	total: number;
	// Days with the symptom (intensity above 0), days with a value on an inverted scale
	days: number;
	// Values of these days on the scale of the settings (0-5 or 0-10), null without any day:
	// their average and the worst one (the highest, the lowest on an inverted scale)
	average: number;
	worst: number;
}

// The days are the ones of the pie chart of the symptom (same count, same colors, inverted scale included)
export function getIntensitySummary(chart: CalendarPieChartViewModel, dayOverviews: DayOverviewViewModel[],
	symptomKey: string, invertedScale: boolean, painScale: number): IIntensitySummary {
	const colors: string[] = chart.colors[0].backgroundColor;
	const segments = chart.data
		.map((days, level) => ({ level, label: chart.labels[level], days, color: colors[level] }))
		.filter(segment => segment.days > 0);
	// The 0-10 scale is saved in halves
	const factor = painScale === 10 ? 2 : 1;
	const values = dayOverviews
		.map(day => day.findSymptomPain(symptomKey))
		.filter(pain => pain != null && (invertedScale || pain > 0))
		.map(pain => pain * factor);
	return {
		segments,
		total: chart.data.reduce((sum, days) => sum + days, 0),
		days: values.length,
		average: values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length,
		worst: values.length === 0 ? null : (invertedScale ? Math.min(...values) : Math.max(...values))
	};
}
