import { IDay } from './day.model';
import { MAX_PAIN_LEVEL } from './symptom.model';
import { toNightMinutes } from './sleep-stats.model';
import {
	benjaminiHochberg, hashString, median, midRanks, quantile, stratifiedPermutationTest
} from '../util/stats.utils';

// Correlation engine: what the user logs (meals, medications, sports, notes, entries of their own types, sleep)
// compared with each symptom. Raw correlations, not causes: see CorrelationsComponent and its help.
//
// Each factor is compared with each symptom in several ways, as long as the data allows it:
// - the same day: the days with the factor against the others (not the medications: they are mostly taken because
//   of a symptom, so they would always come out as "linked" to it)
// - the next day: the symptom the day after the factor
// - the hours after: a symptom logged within CORRELATION_HOURS after an entry of the factor, against the same hours
//   of the other days (far from any entry of the factor). The same hours, because the symptoms are not logged evenly
//   over the day (hardly ever at night): a dinner compared with a lunch would always look harmless. Only the new
//   symptoms count: an entry made while the symptom was already there in the previous hours is left out, as are the
//   same hours of the other days when it was.
// - the night before: its duration (short or long), its bedtime, its wake-up time, how far its duration is from the
//   usual one (a night too short or too long: both can be bad, which a duration alone can't show), how shifted its
//   schedule is from the one of the week before (an irregular sleep)
// - the quantity of the day, for the custom types with a quantity
//
// Statistics (see stats.utils.ts):
// - an occasional symptom is compared by its frequency (days with it), a symptom present most days by its average
//   intensity, a symptom on an inverted scale (e.g. a mood) by its level
// - stratified permutation test: the days are only compared within periods of BLOCK_DAYS days (a season, a stressful
//   month raising both a habit and a symptom don't make a link) and with days that followed a day as good or as bad
//   (a symptom lasting several days, or keeping you awake, doesn't make a link either)
// - the false discovery rate (Benjamini-Hochberg) over every comparison made: hundreds of comparisons give some
//   "significant" ones by chance alone, the confidence takes their number into account
// - only the links large enough to matter are shown, and for each factor and symptom only the strongest way

// Days with entries needed before looking for correlations
export const CORRELATION_MIN_DAYS = 14;
// Days (or entries) needed with the factor, and without it, for a comparison
export const CORRELATION_MIN_GROUP = 4;
// Window after an entry
export const CORRELATION_HOURS = 6;
const WINDOW_MINUTES = CORRELATION_HOURS * 60;
const BLOCK_DAYS = 28;
// Above this share of days with the symptom, its intensity is compared rather than its frequency
const FREQUENCY_MAX_SHARE = 0.6;
// Highest q-value and p-value of each confidence level: 1 (weak lead) to 3 (strong signal). The p-value matters when
// few comparisons are made (their q-values are close to their p-values).
const CONFIDENCE_LEVELS = [{ q: 0.3, p: 0.05 }, { q: 0.1, p: 0.01 }, { q: 0.05, p: 0.002 }];
// Days (or entries) needed with the factor and without it for each confidence level (see cappedConfidence)
const CONFIDENCE_MIN_GROUPS = [CORRELATION_MIN_GROUP, 8, 12];
// A correlation must still hold within the days exposed alike to this many stronger ones of the same symptom
const MAX_EXPLAINING = 3;
// Exposures to a stronger correlation: its factor or not, unknown (2); for a measured factor, its fifth of the values
// split at the threshold shown (0 to 5), unknown (6)
const EXPOSURE_LEVELS = 7;
const EXPOSURE_SHARES = [0.2, 0.4, 0.6, 0.8];
// Equally strong ways of a factor and a symptom: the most precise one is shown
const RELATION_PRIORITY: CorrelationRelation[] = ['hours', 'night', 'sameDay', 'nextDay'];
// Smallest differences shown: frequencies (difference and ratio), average intensities (stored scale, 0 to 5)
const MIN_RATE_DIFFERENCE = 0.1;
const MIN_RATE_RATIO = 1.3;
const MIN_INTENSITY_DIFFERENCE = 0.4;
// The hours after an entry are only compared with the same hour of the day (from 0 to 23)
const HOURS_PER_DAY = 24;
// Measures of a bad night: only their high values can be "linked" to a symptom (a night close to the usual one, or a
// regular schedule, are not shown as harmful)
const BAD_NIGHT_MEASURES: CorrelationMeasure[] = ['durationGap', 'irregularity'];
// Shares of the values tried as the threshold shown for a measured factor, the middle one first (see bestThreshold)
const MEASURE_SHARES = [0.5, 1 / 3, 2 / 3, 0.2, 0.8];
const BAD_NIGHT_SHARES = [2 / 3, 0.5, 0.8, 0.9];
// The usual schedule of a night: the nights of the week before it, at least 3 of them
const SCHEDULE_NIGHTS = 7;
const SCHEDULE_MIN_NIGHTS = 3;
// The most frequent factors, to keep the analysis fast
const MAX_FACTORS = 150;
// The latest days behind a link, shown under it
const MAX_DATES = 15;
const DAY_MS = 24 * 3600 * 1000;

export type CorrelationFactorKind = 'meal' | 'med' | 'sport' | 'log' | 'custom' | 'sleep';
export type CorrelationRelation = 'hours' | 'sameDay' | 'nextDay' | 'night';
// durationGap: minutes between the duration of the night and the usual one. irregularity: minutes between its bedtime
// or wake-up time (the farthest) and the usual ones of the week before.
export type CorrelationMeasure = 'duration' | 'bedTime' | 'wakeUp' | 'durationGap' | 'irregularity' | 'quantity';

export interface ICorrelationFactor {
	// e.g. 'meal:curry', 'custom:<type>:beer', 'custom:<type>:*', 'quantity:<type>', 'sleep:duration'
	id: string;
	kind: CorrelationFactorKind;
	// Name of the entries, in their most frequent spelling. Empty for the sleep and the whole types.
	label: string;
	customType?: string;
	// Every entry of a type: one of the user's types, or the sports
	wholeType?: boolean;
	// Factors measured by a value rather than present or not
	measure?: CorrelationMeasure;
}

export interface ICorrelationGroup {
	// Days compared (entries, for the hours after an entry)
	total: number;
	// Those with the symptom
	count: number;
	// Average intensity of the symptom on the stored scale (0 to 5), null for the hours after an entry
	average: number;
}

export interface ICorrelation {
	factor: ICorrelationFactor;
	symptomKey: string;
	relation: CorrelationRelation;
	// Frequency of the symptom, or its average intensity
	mode: 'frequency' | 'intensity';
	// Symptom more frequent or intense (lower on an inverted scale) with the factor, or the opposite
	direction: 'worse' | 'better';
	// Measured factors: the side of the threshold where the symptom is worse ('worse' direction). Minutes for the sleep:
	// duration, or from midnight for the times (negative before midnight).
	side?: 'low' | 'high';
	threshold?: number;
	// durationGap: the usual duration of the nights (minutes)
	usual?: number;
	// The hours after an entry are compared with the same hours of the other days
	withFactor: ICorrelationGroup;
	withoutFactor: ICorrelationGroup;
	pValue: number;
	qValue: number;
	// 1 (weak lead) to 3 (strong signal)
	confidence: number;
	// How far from chance (standard deviations): orders the correlations of the same confidence
	score: number;
	// Days of the factor followed by the symptom (by its absence for a 'better' direction), the latest first. The day of
	// the entry, the day after the night.
	dates: string[];
}

export interface ICorrelationAnalysis {
	// Days with at least one entry
	trackedDays: number;
	firstDate: string;
	lastDate: string;
	// Factors and symptoms having enough data to be compared
	factors: number;
	symptoms: number;
	// Comparisons made
	tests: number;
	// Strongest first
	correlations: ICorrelation[];
}

export interface ICorrelationSymptom {
	key: string;
	invertedScale?: boolean;
}

interface IDayData {
	index: number;
	date: string;
	// Intensities of the symptoms on the stored scale, when known
	values: Map<string, number>;
	factors: Set<string>;
	// Total quantity of each custom type having a quantity
	quantities: Map<string, number>;
	// Minutes from midnight, negative before it (see toNightMinutes)
	wakeUp: number;
	bedTime: number;
}

interface ITimedEntry {
	// From the first day of the epoch
	minute: number;
	dayIndex: number;
}

// The night before a day, its measures in minutes, null when unknown
interface INight {
	// From midnight, negative before it (see toNightMinutes)
	bedTime: number;
	wakeUp: number;
	duration: number;
	durationGap: number;
	irregularity: number;
}

interface ISymptomSeries {
	key: string;
	invertedScale: boolean;
	mode: 'frequency' | 'intensity';
	// Higher is worse (the intensity, reversed on an inverted scale)
	badness: Map<number, number>;
	medianBadness: number;
	// Minutes of the timed entries, sorted
	logs: number[];
}

interface IObservation {
	x: number;
	// Raw value of a measured factor
	value?: number;
	y: number;
	// Intensity on the stored scale (not reversed)
	intensity?: number;
	stratum: number;
	date: string;
	// Day of the symptom compared
	outcomeIndex: number;
}

interface ITest {
	factor: ICorrelationFactor;
	symptom: ISymptomSeries;
	relation: CorrelationRelation;
	observations: IObservation[];
	mode: 'frequency' | 'intensity';
	// durationGap: the usual duration of the nights
	usual?: number;
}

function dayIndex(date: string): number {
	const [year, month, day] = date.split('-').map(Number);
	return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

function parseTime(time: string): number {
	const match = /^(\d{1,2}):(\d{2})/.exec(time || '');
	return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function normalizeKey(key: string): string {
	return (key || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isTracked(day: IDay): boolean {
	const lists = [day.logs, day.meds, day.meals, day.sports, day.customs, day.symptomOverviews];
	return lists.some(list => Array.isArray(list) && list.length > 0)
		|| (day.symptoms || []).some(symptom => (symptom.logs || []).length > 0)
		|| !!day.wakeUp || !!day.goToBed;
}

function isNumber(value: any): boolean {
	return value != null && value !== '' && isFinite(Number(value));
}

// Intensity of a symptom on a day: the overview of the day, otherwise the average of its entries. Unknown on an
// inverted scale without any (0 is its worst value), none on a normal scale.
function symptomValue(day: IDay, symptom: ICorrelationSymptom): number {
	const overview = (day.symptomOverviews || []).find(s => s.key === symptom.key);
	if (overview != null && isNumber(overview.pain)) {
		return Number(overview.pain);
	}
	const logs = ((day.symptoms || []).find(s => s.key === symptom.key) || { logs: [] }).logs || [];
	const pains = logs.map(log => log.pain).filter(isNumber).map(Number);
	if (pains.length > 0) {
		return pains.reduce((sum, pain) => sum + pain, 0) / pains.length;
	}
	return symptom.invertedScale ? null : 0;
}

class CorrelationData {
	public readonly days = new Map<number, IDayData>();
	// Entries having a time, by factor, the earliest first
	public readonly entries = new Map<string, ITimedEntry[]>();
	public readonly factors: ICorrelationFactor[] = [];
	public readonly symptoms: ISymptomSeries[] = [];
	// The night before each day
	public readonly nights = new Map<number, INight>();
	// Minutes of the timed entries of every symptom, sorted
	public allLogs: number[] = [];
	// Median duration of the nights, null without any complete night
	public usualDuration: number = null;
	public firstIndex: number;
	private readonly spellings = new Map<string, Map<string, number>>();
	// Fifths of the values of each measured factor (see exposure)
	private readonly measureCuts = new Map<string, number[]>();

	constructor(days: IDay[], symptoms: ICorrelationSymptom[]) {
		const logs = new Map<string, number[]>(symptoms.map(symptom => [symptom.key, []]));
		// In the order of the dates: the results don't depend on the order of the days given
		const sortedDays = days.filter(day => day != null && typeof day.date === 'string')
			.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
		for (const day of sortedDays) {
			if (!isTracked(day) || this.days.has(dayIndex(day.date))) {
				continue;
			}
			const index = dayIndex(day.date);
			if (!isFinite(index)) {
				continue;
			}
			const data: IDayData = {
				index, date: day.date, values: new Map(), factors: new Set(), quantities: new Map(),
				wakeUp: toNightMinutes(day.wakeUp), bedTime: toNightMinutes(day.goToBed)
			};
			for (const symptom of symptoms) {
				const value = symptomValue(day, symptom);
				if (value != null) {
					data.values.set(symptom.key, value);
				}
				const symptomDay = (day.symptoms || []).find(s => s.key === symptom.key);
				for (const log of (symptomDay && symptomDay.logs) || []) {
					const minute = parseTime(log.time);
					if (minute != null) {
						logs.get(symptom.key).push(index * 1440 + minute);
					}
				}
			}
			const add = (entry: { time: string, key: string }, ids: string[]) => {
				this.addSpelling(ids[0], entry.key);
				const minute = parseTime(entry.time);
				ids.forEach(id => {
					data.factors.add(id);
					if (minute != null) {
						const entries = this.entries.get(id) || [];
						entries.push({ minute: index * 1440 + minute, dayIndex: index });
						this.entries.set(id, entries);
					}
				});
			};
			const named = (entry: { key: string }) => normalizeKey(entry && entry.key) !== '';
			(day.meals || []).filter(named).forEach(meal => add(meal, ['meal:' + normalizeKey(meal.key)]));
			(day.meds || []).filter(named).forEach(med => add(med, ['med:' + normalizeKey(med.key)]));
			(day.logs || []).filter(named).forEach(log => add(log, ['log:' + normalizeKey(log.key)]));
			(day.sports || []).filter(named).forEach(sport =>
				add(sport, ['sport:' + normalizeKey(sport.key), 'sport:*']));
			(day.customs || []).filter(entry => entry && entry.customType).forEach(entry => {
				const type = entry.customType;
				add(entry, [`custom:${type}:${normalizeKey(entry.key)}`, `custom:${type}:*`]);
				if (isNumber(entry.quantity)) {
					data.quantities.set(type, (data.quantities.get(type) || 0) + Number(entry.quantity));
				}
			});
			this.days.set(index, data);
		}
		this.firstIndex = Math.min(...this.days.keys());
		this.entries.forEach(entries => entries.sort((a, b) => a.minute - b.minute));
		this.allLogs = [].concat(...logs.values()).sort((a: number, b: number) => a - b);
		this.buildNights();
		this.buildFactors();
		for (const symptom of symptoms) {
			const series = this.buildSymptom(symptom, logs.get(symptom.key));
			if (series) {
				this.symptoms.push(series);
			}
		}
	}

	private addSpelling(id: string, key: string): void {
		const spelling = (key || '').trim().replace(/\s+/g, ' ');
		const counts = this.spellings.get(id) || new Map<string, number>();
		counts.set(spelling, (counts.get(spelling) || 0) + 1);
		this.spellings.set(id, counts);
	}

	private label(id: string): string {
		const counts = this.spellings.get(id);
		if (counts == null) {
			return '';
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
	}

	private buildFactors(): void {
		const dayCounts = new Map<string, number>();
		this.days.forEach(day => day.factors.forEach(id => dayCounts.set(id, (dayCounts.get(id) || 0) + 1)));
		// A whole type only when it has several kinds of entries (otherwise the same as its only one)
		const itemsOfType = new Map<string, number>();
		dayCounts.forEach((_, id) => {
			if (!id.endsWith(':*')) {
				const type = id.slice(0, id.lastIndexOf(':')) + ':*';
				itemsOfType.set(type, (itemsOfType.get(type) || 0) + 1);
			}
		});
		const total = this.days.size;
		const candidates = [...dayCounts.entries()]
			.filter(([id, count]) => count >= CORRELATION_MIN_GROUP && total - count >= CORRELATION_MIN_GROUP
				&& (!id.endsWith(':*') || (itemsOfType.get(id) || 0) >= 2))
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.slice(0, MAX_FACTORS);
		for (const [id] of candidates) {
			const parts = id.split(':');
			const kind = parts[0] as CorrelationFactorKind;
			const wholeType = id.endsWith(':*');
			this.factors.push({
				id, kind, wholeType,
				label: wholeType ? '' : this.label(id),
				customType: kind === 'custom' ? parts[1] : undefined
			});
		}
		this.factors.push(
			{ id: 'sleep:duration', kind: 'sleep', label: '', measure: 'duration' },
			{ id: 'sleep:bedTime', kind: 'sleep', label: '', measure: 'bedTime' },
			{ id: 'sleep:wakeUp', kind: 'sleep', label: '', measure: 'wakeUp' },
			{ id: 'sleep:durationGap', kind: 'sleep', label: '', measure: 'durationGap' },
			{ id: 'sleep:irregularity', kind: 'sleep', label: '', measure: 'irregularity' });
		const quantityTypes = new Set<string>();
		this.days.forEach(day => day.quantities.forEach((_, type) => quantityTypes.add(type)));
		[...quantityTypes].sort().forEach(type =>
			this.factors.push({ id: 'quantity:' + type, kind: 'custom', label: '', customType: type, measure: 'quantity' }));
	}

	private buildSymptom(symptom: ICorrelationSymptom, logs: number[]): ISymptomSeries {
		const badness = new Map<number, number>();
		this.days.forEach(day => {
			const value = day.values.get(symptom.key);
			if (value != null) {
				badness.set(day.index, symptom.invertedScale ? MAX_PAIN_LEVEL - value : value);
			}
		});
		const values = [...badness.values()];
		if (values.length < CORRELATION_MIN_DAYS || values.every(value => value === values[0])) {
			return null;
		}
		const share = values.filter(value => value > 0).length / values.length;
		return {
			key: symptom.key,
			invertedScale: !!symptom.invertedScale,
			mode: !symptom.invertedScale && share <= FREQUENCY_MAX_SHARE ? 'frequency' : 'intensity',
			badness,
			medianBadness: median(values),
			logs: logs.sort((a, b) => a - b)
		};
	}

	public block(index: number): number {
		return Math.floor((index - this.firstIndex) / BLOCK_DAYS);
	}

	// Symptom of a day: better than usual (0), worse (1) or unknown (2)
	public state(symptom: ISymptomSeries, index: number): number {
		const badness = symptom.badness.get(index);
		return badness == null ? 2 : badness > symptom.medianBadness ? 1 : 0;
	}

	public outcome(symptom: ISymptomSeries, index: number): number {
		const badness = symptom.badness.get(index);
		if (badness == null) {
			return null;
		}
		return symptom.mode === 'frequency' ? (badness > 0 ? 1 : 0) : badness;
	}

	public intensity(symptom: ISymptomSeries, index: number): number {
		const badness = symptom.badness.get(index);
		return badness == null ? null : symptom.invertedScale ? MAX_PAIN_LEVEL - badness : badness;
	}

	// The night before each day: from the bedtime of the day before to the wake-up time of the day, then how far it is
	// from the usual duration, and from the schedule of the week before
	private buildNights(): void {
		const indexes = [...this.days.keys()].sort((a, b) => a - b);
		for (const index of indexes) {
			const evening = this.days.get(index - 1);
			const bedTime = evening ? evening.bedTime : null;
			// Times of the evening are no wake-up times
			const morning = this.days.get(index).wakeUp;
			const wakeUp = morning != null && morning >= 0 ? morning : null;
			const duration = bedTime != null && wakeUp != null && wakeUp > bedTime ? wakeUp - bedTime : null;
			this.nights.set(index, { bedTime, wakeUp, duration, durationGap: null, irregularity: null });
		}
		const durations = [...this.nights.values()].map(night => night.duration).filter(value => value != null);
		this.usualDuration = median(durations);
		this.nights.forEach((night, index) => {
			if (night.duration != null) {
				night.durationGap = Math.abs(night.duration - this.usualDuration);
			}
			// The farthest of the bedtime and the wake-up time from their usual value
			const shifts: number[] = [];
			for (const time of ['bedTime', 'wakeUp'] as const) {
				const before: number[] = [];
				for (let previous = index - SCHEDULE_NIGHTS; previous < index; previous++) {
					const value = (this.nights.get(previous) || { [time]: null })[time];
					if (value != null) {
						before.push(value);
					}
				}
				if (night[time] != null && before.length >= SCHEDULE_MIN_NIGHTS) {
					shifts.push(Math.abs(night[time] - median(before)));
				}
			}
			night.irregularity = shifts.length > 0 ? Math.max(...shifts) : null;
		});
	}

	// Exposure of a day to a correlation found, for the symptom of that day: its factor that day or not (the day before
	// for the next day), 2 when unknown. A measured factor: the fifth of its values, the one of its threshold split at it
	// (0 to 5), 6 when unknown: finer than the side of the threshold, so that what remains of its effect within a side
	// isn't taken for another factor's.
	public exposure(correlation: ICorrelation, index: number): number {
		const factor = correlation.factor;
		const day = this.days.get(correlation.relation === 'nextDay' ? index - 1 : index);
		if (!factor.measure) {
			return day == null ? 2 : day.factors.has(factor.id) ? 1 : 0;
		}
		const value = day == null ? null : this.measure(factor, day);
		if (value == null) {
			return EXPOSURE_LEVELS - 1;
		}
		if (!this.measureCuts.has(factor.id)) {
			const values = [...this.days.values()].map(other => this.measure(factor, other)).filter(other => other != null);
			this.measureCuts.set(factor.id, EXPOSURE_SHARES.map(share => quantile(values, share)));
		}
		return [...this.measureCuts.get(factor.id), correlation.threshold].filter(cut => value >= cut).length;
	}

	// Value of a measured factor on a day: the night before it for the sleep
	public measure(factor: ICorrelationFactor, day: IDayData): number {
		if (factor.measure === 'quantity') {
			const quantity = day.quantities.get(factor.customType);
			return quantity == null ? null : quantity;
		}
		const night = this.nights.get(day.index);
		const value = night ? night[factor.measure] : null;
		return value == null ? null : value;
	}
}

// Comparisons of a factor with a symptom, day by day
function dayTests(data: CorrelationData, factor: ICorrelationFactor, symptom: ISymptomSeries): ITest[] {
	const tests: ITest[] = [];
	const observation = (x: number, day: IDayData, outcomeIndex: number, stateIndex: number,
		value?: number): IObservation => {
		const y = data.outcome(symptom, outcomeIndex);
		return y == null ? null : {
			x, value, y, intensity: data.intensity(symptom, outcomeIndex),
			stratum: data.block(day.index) * 3 + data.state(symptom, stateIndex), date: day.date, outcomeIndex
		};
	};
	const days = [...data.days.values()];
	if (factor.measure) {
		const observations = days
			.map(day => {
				const value = data.measure(factor, day);
				return value == null ? null : observation(0, day, day.index, day.index - 1, value);
			})
			.filter(o => o != null);
		const ranks = midRanks(observations.map(o => o.value));
		observations.forEach((o, i) => o.x = ranks[i]);
		tests.push({
			factor, symptom, relation: factor.kind === 'sleep' ? 'night' : 'sameDay', observations, mode: symptom.mode,
			usual: factor.measure === 'durationGap' ? Math.round(data.usualDuration / 5) * 5 : undefined
		});
		return tests;
	}
	// Medications are mostly taken because of a symptom: never compared with the symptom of the same day
	if (factor.kind !== 'med') {
		tests.push({
			factor, symptom, relation: 'sameDay', mode: symptom.mode,
			observations: days.map(day => observation(day.factors.has(factor.id) ? 1 : 0, day, day.index, day.index - 1))
				.filter(o => o != null)
		});
	}
	tests.push({
		factor, symptom, relation: 'nextDay', mode: symptom.mode,
		observations: days.filter(day => data.days.has(day.index + 1))
			.map(day => observation(day.factors.has(factor.id) ? 1 : 0, day, day.index + 1, day.index))
			.filter(o => o != null)
	});
	return tests;
}

// First index of a sorted list whose value is at least the given one
function lowerBound(values: number[], value: number): number {
	let low = 0;
	let high = values.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		if (values[middle] < value) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
}

// An entry is followed by the symptom when it is logged within the window after it. Entries made while the symptom was
// logged in the window before are left out (null): only new symptoms count.
function followedBySymptom(logs: number[], minute: number): number {
	const before = lowerBound(logs, minute - WINDOW_MINUTES);
	if (before < logs.length && logs[before] <= minute) {
		return null;
	}
	const after = lowerBound(logs, minute + 1);
	return after < logs.length && logs[after] <= minute + WINDOW_MINUTES ? 1 : 0;
}

// Entries of a list far enough from each other: an entry within the window of the previous one adds nothing
function spacedEntries(entries: ITimedEntry[]): ITimedEntry[] {
	const kept: ITimedEntry[] = [];
	for (const entry of entries) {
		if (kept.length === 0 || entry.minute > kept[kept.length - 1].minute + WINDOW_MINUTES) {
			kept.push(entry);
		}
	}
	return kept;
}

// Symptom in the hours after the entries of the factor, against the same hours of the other days. Each hour of the day
// is its own stratum (with the period of the year).
function hoursTest(data: CorrelationData, factor: ICorrelationFactor, symptom: ISymptomSeries): ITest {
	const entries = data.entries.get(factor.id) || [];
	if (factor.measure || symptom.logs.length < 3 || entries.length < CORRELATION_MIN_GROUP) {
		return null;
	}
	const observations: IObservation[] = [];
	const observe = (x: number, minute: number, index: number, hour: number) => {
		const y = followedBySymptom(symptom.logs, minute);
		// A medication taken while any symptom was there was probably taken because of it: the hours after it say
		// nothing about the medication (a painkiller after a headache, on a day already bad for other symptoms too).
		// The same hours of the other days are left out alike.
		if (y != null && !(factor.kind === 'med' && followedBySymptom(data.allLogs, minute) == null)) {
			observations.push({
				x, y, stratum: data.block(index) * HOURS_PER_DAY + hour, date: data.days.get(index).date, outcomeIndex: index
			});
		}
	};
	// The time of the entries of each hour of the day: on average, to the minute
	const times = new Map<number, number[]>();
	for (const entry of spacedEntries(entries)) {
		const time = entry.minute - entry.dayIndex * 1440;
		const hour = Math.floor(time / 60);
		times.set(hour, [...(times.get(hour) || []), time]);
		observe(1, entry.minute, entry.dayIndex, hour);
	}
	// The same hours of the other days, unless an entry of the factor is near: its own effect would be in them
	const minutes = entries.map(entry => entry.minute);
	times.forEach((hourTimes, hour) => {
		const time = Math.round(mean(hourTimes));
		data.days.forEach(day => {
			const minute = day.index * 1440 + time;
			const near = lowerBound(minutes, minute - WINDOW_MINUTES);
			if (near >= minutes.length || minutes[near] > minute + WINDOW_MINUTES) {
				observe(0, minute, day.index, hour);
			}
		});
	});
	return { factor, symptom, relation: 'hours', observations, mode: 'frequency' };
}

function group(observations: IObservation[]): ICorrelationGroup {
	const intensities = observations.map(o => o.intensity).filter(value => value != null);
	return {
		total: observations.length,
		count: observations.filter(o => o.y > 0).length,
		average: intensities.length > 0 ? intensities.reduce((sum, value) => sum + value, 0) / intensities.length : null
	};
}

function mean(values: number[]): number {
	return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// What is shown of a comparison: its two groups, when both are large enough and their difference matters, in the
// direction found by the test
// Threshold shown for a measured factor, on the side where the symptom is worse: among a few shares of the values (the
// most unusual nights only, for a bad night), the one where the symptom differs the most between both sides, each
// keeping a tenth of the days at least. Rounded to 5 minutes for the sleep. null when no share keeps both sides.
function bestThreshold(test: ITest, side: 'low' | 'high', badNight: boolean): number {
	const observations = test.observations;
	const values = observations.map(o => o.value);
	const minGroup = Math.max(CORRELATION_MIN_GROUP, Math.ceil(observations.length / 10));
	let best: number = null;
	let bestScore = -Infinity;
	for (const share of badNight ? BAD_NIGHT_SHARES : MEASURE_SHARES) {
		let threshold = quantile(values, share);
		if (test.factor.measure !== 'quantity') {
			threshold = Math.max(5, Math.round(threshold / 5) * 5);
		}
		const worse = observations.filter(o => (o.value >= threshold) === (side === 'high'));
		const other = observations.filter(o => (o.value >= threshold) !== (side === 'high'));
		if (worse.length < minGroup || other.length < minGroup) {
			continue;
		}
		const score = mean(worse.map(o => o.y)) - mean(other.map(o => o.y));
		// The first share wins a tie: the middle one comes first
		if (score > bestScore + 1e-9) {
			best = threshold;
			bestScore = score;
		}
	}
	return best;
}

function describe(test: ITest, effect: number, pValue: number, z: number): ICorrelation {
	const observations = test.observations;
	let withFactor: IObservation[];
	let withoutFactor: IObservation[];
	let side: 'low' | 'high';
	let threshold: number;
	if (test.factor.measure) {
		// A bad night: only when the symptom is worse after the most unusual ones
		const badNight = BAD_NIGHT_MEASURES.includes(test.factor.measure);
		if (badNight && effect <= 0) {
			return null;
		}
		side = effect > 0 ? 'high' : 'low';
		threshold = bestThreshold(test, side, badNight);
		if (threshold == null) {
			return null;
		}
		const isHigh = (o: IObservation) => o.value >= threshold;
		withFactor = observations.filter(o => isHigh(o) === (side === 'high'));
		withoutFactor = observations.filter(o => isHigh(o) !== (side === 'high'));
	} else {
		withFactor = observations.filter(o => o.x === 1);
		withoutFactor = observations.filter(o => o.x === 0);
	}
	if (withFactor.length < CORRELATION_MIN_GROUP || withoutFactor.length < CORRELATION_MIN_GROUP) {
		return null;
	}
	const direction = effect > 0 || test.factor.measure ? 'worse' : 'better';
	const sign = direction === 'worse' ? 1 : -1;
	const meanWith = mean(withFactor.map(o => o.y));
	const meanWithout = mean(withoutFactor.map(o => o.y));
	const difference = (meanWith - meanWithout) * sign;
	if (test.mode === 'frequency') {
		const ratio = Math.max(meanWith, meanWithout) / Math.max(Math.min(meanWith, meanWithout), 0.01);
		if (difference < MIN_RATE_DIFFERENCE || ratio < MIN_RATE_RATIO) {
			return null;
		}
	} else if (difference < MIN_INTENSITY_DIFFERENCE) {
		return null;
	}
	// The days supporting the link: worse than the days without the factor, or better
	const dates = withFactor.filter(o => (o.y - meanWithout) * sign > 0).map(o => o.date);
	return {
		factor: test.factor,
		symptomKey: test.symptom.key,
		relation: test.relation,
		mode: test.mode,
		direction,
		side,
		threshold,
		usual: test.usual,
		withFactor: group(withFactor),
		withoutFactor: group(withoutFactor),
		pValue,
		qValue: 1,
		confidence: 0,
		score: Math.abs(z),
		dates: [...new Set(dates)].sort().reverse().slice(0, MAX_DATES)
	};
}

// Enough observations on both sides, and a symptom that varies
function isComparable(test: ITest): boolean {
	const observations = test.observations;
	if (new Set(observations.map(o => o.y)).size < 2) {
		return false;
	}
	if (test.factor.measure) {
		return observations.length >= 2 * CORRELATION_MIN_GROUP && new Set(observations.map(o => o.value)).size > 1;
	}
	const withFactor = observations.filter(o => o.x === 1).length;
	return withFactor >= CORRELATION_MIN_GROUP && observations.length - withFactor >= CORRELATION_MIN_GROUP
		&& (test.relation !== 'hours' || observations.filter(o => o.y > 0).length >= 2);
}

// Level of a correlation from its q-value and p-value
function confidence(qValue: number, pValue: number): number {
	let level = 0;
	while (level < CONFIDENCE_LEVELS.length && qValue <= CONFIDENCE_LEVELS[level].q
		&& pValue <= CONFIDENCE_LEVELS[level].p) {
		level++;
	}
	return level;
}

// Level shown: few days on one side (with the factor, or without it) make a weak lead, whatever the statistics
function cappedConfidence(correlation: ICorrelation): number {
	const days = Math.min(correlation.withFactor.total, correlation.withoutFactor.total);
	return Math.min(correlation.confidence, CONFIDENCE_MIN_GROUPS.filter(min => days >= min).length);
}

// Strongest first: the most likely, then the farthest from chance. As far (e.g. a curry and the soup eaten every other
// evening, the same days the other way round): a harmful one first, then the rarest, then the most precise way.
function compareStrength(a: ICorrelation, b: ICorrelation): number {
	const scores = Math.abs(a.score - b.score) > 1e-6 * Math.max(a.score, b.score) ? b.score - a.score : 0;
	return b.confidence - a.confidence || scores
		|| (a.direction === b.direction ? 0 : a.direction === 'worse' ? -1 : 1)
		|| a.withFactor.total - b.withFactor.total
		|| RELATION_PRIORITY.indexOf(a.relation) - RELATION_PRIORITY.indexOf(b.relation);
}

interface ICandidate {
	test: ITest;
	effect: number;
	correlation: ICorrelation;
}

// The correlations of a symptom one after the other, the strongest first: each one must still hold within the days
// exposed alike to the stronger ones kept (compared within the same strata of exposure). Otherwise they explain it:
// a dinner eaten on the days without curry is not "protective", a short night coming with a late bedtime does not
// need a card of its own.
function explainAway(data: CorrelationData, candidates: ICandidate[]): ICorrelation[] {
	const kept: ICandidate[] = [];
	for (const candidate of [...candidates].sort((a, b) => compareStrength(a.correlation, b.correlation))) {
		const correlation = candidate.correlation;
		const stronger = kept.filter(other => other.correlation.symptomKey === correlation.symptomKey)
			.slice(0, MAX_EXPLAINING);
		if (stronger.length > 0) {
			const observations = candidate.test.observations;
			const result = stratifiedPermutationTest(observations.map(o => o.x), observations.map(o => o.y),
				observations.map(o => stronger.reduce((stratum, other) =>
					stratum * EXPOSURE_LEVELS + data.exposure(other.correlation, o.outcomeIndex), o.stratum)),
				hashString(`${correlation.factor.id}|${correlation.symptomKey}|${correlation.relation}|explained`));
			const level = CONFIDENCE_LEVELS.filter(levels => result.pValue <= levels.p).length;
			if (level === 0 || Math.sign(result.effect) !== Math.sign(candidate.effect)) {
				continue;
			}
			correlation.confidence = Math.min(correlation.confidence, level);
		}
		kept.push(candidate);
	}
	return kept.map(candidate => candidate.correlation);
}

// Every correlation between the factors and the symptoms. days: every day stored, in any order.
export function analyzeCorrelations(days: IDay[], symptoms: ICorrelationSymptom[]): ICorrelationAnalysis {
	const data = new CorrelationData(days || [], symptoms || []);
	const dates = [...data.days.values()].map(day => day.date).sort();
	const analysis: ICorrelationAnalysis = {
		trackedDays: dates.length,
		firstDate: dates[0] || null,
		lastDate: dates[dates.length - 1] || null,
		factors: 0,
		symptoms: 0,
		tests: 0,
		correlations: []
	};
	if (dates.length < CORRELATION_MIN_DAYS) {
		return analysis;
	}
	// Each comparison possible, one after the other: its p-value, and what would be shown of it. Only the observations
	// of the possible correlations are kept, for the second pass (explainAway).
	const results: { pValue: number, candidate: ICandidate }[] = [];
	const factors = new Set<string>();
	const symptomKeys = new Set<string>();
	for (const symptom of data.symptoms) {
		for (const factor of data.factors) {
			for (const test of [...dayTests(data, factor, symptom), hoursTest(data, factor, symptom)]) {
				if (test == null || !isComparable(test)) {
					continue;
				}
				const observations = test.observations;
				const result = stratifiedPermutationTest(observations.map(o => o.x), observations.map(o => o.y),
					observations.map(o => o.stratum), hashString(`${factor.id}|${symptom.key}|${test.relation}`));
				const correlation = result.effect === 0 || result.pValue > CONFIDENCE_LEVELS[0].p ? null
					: describe(test, result.effect, result.pValue, result.z);
				results.push({ pValue: result.pValue, candidate: correlation && { test, effect: result.effect, correlation } });
				factors.add(factor.id);
				symptomKeys.add(symptom.key);
			}
		}
	}
	const qValues = benjaminiHochberg(results.map(result => result.pValue));
	analysis.tests = results.length;
	analysis.factors = factors.size;
	analysis.symptoms = symptomKeys.size;
	// The strongest way of each factor and symptom
	const best = new Map<string, ICandidate>();
	results.forEach(({ pValue, candidate }, i) => {
		if (candidate == null) {
			return;
		}
		const correlation = candidate.correlation;
		correlation.qValue = qValues[i];
		correlation.confidence = confidence(qValues[i], pValue);
		if (correlation.confidence === 0) {
			return;
		}
		const key = correlation.factor.id + '|' + correlation.symptomKey;
		const other = best.get(key);
		if (other == null || compareStrength(correlation, other.correlation) < 0) {
			best.set(key, candidate);
		}
	});
	const correlations = explainAway(data, [...best.values()]);
	correlations.forEach(correlation => correlation.confidence = cappedConfidence(correlation));
	analysis.correlations = correlations.sort((a, b) => compareStrength(a, b)
		|| a.factor.id.localeCompare(b.factor.id) || a.symptomKey.localeCompare(b.symptomKey));
	return analysis;
}
