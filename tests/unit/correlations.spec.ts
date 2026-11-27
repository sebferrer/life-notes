import { test, expect } from '@playwright/test';
import { IDay } from '../../src/app/models/day.model';
import {
	analyzeCorrelations, CORRELATION_MIN_DAYS, ICorrelation, ICorrelationAnalysis
} from '../../src/app/models/correlation.model';
import {
	benjaminiHochberg, median, midRanks, seededRandom, stratifiedPermutationTest
} from '../../src/app/util/stats.utils';

// Days built for the tests: from 2026-01-01, with the entries given by the callback
interface IDayBuilder {
	meal(key: string, time: string): void;
	med(key: string, time: string): void;
	sport(key: string, time: string): void;
	note(key: string, time: string): void;
	custom(type: string, key: string, time: string, quantity?: number): void;
	// Symptom entry with its time, intensity on the stored scale (0 to 5)
	symptom(key: string, time: string, pain: number): void;
	// Intensity of the day
	overview(key: string, pain: number): void;
	sleep(wakeUp: string, goToBed: string): void;
}

function date(index: number): string {
	return new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
}

function buildDays(count: number, fill: (index: number, day: IDayBuilder) => void): IDay[] {
	const days: IDay[] = [];
	for (let i = 0; i < count; i++) {
		const day: IDay = {
			date: date(i), symptomOverviews: [], symptoms: [], logs: [], meds: [], meals: [], sports: [], customs: [],
			wakeUp: '', goToBed: ''
		};
		fill(i, {
			meal: (key, time) => day.meals.push({ type: 'meal', key, time, detail: '' }),
			med: (key, time) => day.meds.push({ type: 'med', key, time, quantity: 1 }),
			sport: (key, time) => day.sports.push({ type: 'sport', key, time, detail: '' }),
			note: (key, time) => day.logs.push({ type: 'log', key, time, detail: '' }),
			custom: (customType, key, time, quantity) =>
				day.customs.push({ type: 'custom', customType, key, time, detail: '', quantity }),
			symptom: (key, time, pain) => {
				let symptom = day.symptoms.find(s => s.key === key);
				if (symptom == null) {
					symptom = { type: 'symptom', key, logs: [] };
					day.symptoms.push(symptom);
				}
				symptom.logs.push({ type: 'symptomLog', key, time, pain, detail: '' });
			},
			overview: (key, pain) => day.symptomOverviews.push({ key, pain }),
			sleep: (wakeUp, goToBed) => {
				day.wakeUp = wakeUp;
				day.goToBed = goToBed;
			}
		});
		days.push(day);
	}
	return days;
}

function find(analysis: ICorrelationAnalysis, factorId: string, symptomKey: string): ICorrelation {
	return analysis.correlations.find(c => c.factor.id === factorId && c.symptomKey === symptomKey);
}

function time(minutes: number): string {
	const m = ((minutes % 1440) + 1440) % 1440;
	return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

test.describe('Statistics of the correlations', () => {

	test('ranks, median and q-values', () => {
		expect(midRanks([10, 20, 20, 5])).toEqual([2, 3.5, 3.5, 1]);
		expect(median([3, 1, 2])).toBe(2);
		expect(median([4, 1, 2, 3])).toBe(2.5);
		expect(median([])).toBeNull();
		// Benjamini-Hochberg: p * m / rank, made monotonous
		const q = benjaminiHochberg([0.01, 0.04, 0.03, 0.5]);
		expect(q[0]).toBeCloseTo(0.04);
		expect(q[1]).toBeCloseTo(0.0533, 3);
		expect(q[2]).toBeCloseTo(0.0533, 3);
		expect(q[3]).toBeCloseTo(0.5);
	});

	test('the permutation test finds a strong link and not an absent one, always with the same result', () => {
		const random = seededRandom(1);
		const x = Array.from({ length: 60 }, (_, i) => i % 3 === 0 ? 1 : 0);
		const linked = x.map(value => value === 1 ? (random() < 0.8 ? 1 : 0) : (random() < 0.1 ? 1 : 0));
		const strata = x.map(() => 0);
		const strong = stratifiedPermutationTest(x, linked, strata, 42);
		expect(strong.effect).toBeGreaterThan(0);
		expect(strong.pValue).toBeLessThan(0.001);
		expect(stratifiedPermutationTest(x, linked, strata, 42)).toEqual(strong);
		// Opposite link: negative effect
		expect(stratifiedPermutationTest(x, linked.map(value => 1 - value), strata, 42).effect).toBeLessThan(0);
		const independent = x.map(() => random() < 0.3 ? 1 : 0);
		expect(stratifiedPermutationTest(x, independent, strata, 42).pValue).toBeGreaterThan(0.05);
		// Nothing varies: no link
		expect(stratifiedPermutationTest(x, x.map(() => 1), strata, 42)).toEqual({ effect: 0, pValue: 1, z: 0 });
	});

	test('the p-values of independent data are spread evenly (no false alarm)', () => {
		const random = seededRandom(7);
		let small = 0;
		const runs = 200;
		for (let run = 0; run < runs; run++) {
			const x = Array.from({ length: 50 }, () => random() < 0.3 ? 1 : 0);
			const y = Array.from({ length: 50 }, () => Math.floor(random() * 3));
			if (stratifiedPermutationTest(x, y, x.map((_, i) => i % 2), run).pValue < 0.05) {
				small++;
			}
		}
		// About 5 %
		expect(small / runs).toBeLessThan(0.1);
	});

	test('the strata keep apart what must not be compared', () => {
		// Both high in the first stratum, both low in the second one, but independent inside each of them
		const random = seededRandom(3);
		const strata = Array.from({ length: 120 }, (_, i) => i < 60 ? 0 : 1);
		const x = strata.map(s => random() < (s === 0 ? 0.6 : 0.1) ? 1 : 0);
		const y = strata.map(s => random() < (s === 0 ? 0.6 : 0.1) ? 1 : 0);
		expect(stratifiedPermutationTest(x, y, strata.map(() => 0), 5).pValue).toBeLessThan(0.01);
		expect(stratifiedPermutationTest(x, y, strata, 5).pValue).toBeGreaterThan(0.05);
	});
});

test.describe('Correlation engine', () => {

	test('needs enough days with entries', () => {
		const days = buildDays(CORRELATION_MIN_DAYS - 1, (i, day) => day.meal('Pâtes', '12:00'));
		// Days without any entry don't count
		days.push(...buildDays(3, () => undefined).map(day => ({ ...day, date: '2025-12-0' + (day.date.slice(-1)) })));
		const analysis = analyzeCorrelations(days, [{ key: 'head' }]);
		expect(analysis.trackedDays).toBe(CORRELATION_MIN_DAYS - 1);
		expect(analysis.firstDate).toBe('2026-01-01');
		expect(analysis.correlations).toEqual([]);
		expect(analysis.tests).toBe(0);
	});

	test('a meal followed by a stomach ache within a few hours', () => {
		const random = seededRandom(11);
		const days = buildDays(70, (i, day) => {
			day.meal('Pain', '08:00');
			day.meal(random() < 0.5 ? 'Salade' : 'Pâtes', '12:30');
			// A curry for dinner one day out of five, then often a stomach ache
			if (i % 5 === 0) {
				day.meal(i % 15 === 5 ? 'curry ' : 'Curry', '20:00');
				if (i % 15 !== 0) {
					day.symptom('stomach', '22:30', 3);
				}
			} else {
				day.meal('Soupe', '20:00');
				if (random() < 0.08) {
					day.symptom('stomach', '15:00', 2);
				}
			}
		});
		const analysis = analyzeCorrelations(days, [{ key: 'stomach' }]);
		expect(analysis.trackedDays).toBe(70);
		const curry = find(analysis, 'meal:curry', 'stomach');
		expect(curry).toBeTruthy();
		// The most frequent spelling, whatever the case and the spaces
		expect(curry.factor.label).toBe('Curry');
		expect(curry.direction).toBe('worse');
		expect(curry.confidence).toBe(3);
		expect(['hours', 'sameDay']).toContain(curry.relation);
		expect(curry.withFactor.count / curry.withFactor.total).toBeGreaterThan(0.6);
		expect(curry.withoutFactor.count / curry.withoutFactor.total).toBeLessThan(0.2);
		// The days of the curry followed by the stomach ache, the latest first
		expect(curry.dates[0]).toBe(date(65));
		expect(curry.dates).not.toContain(date(60));
		// The meals that are always there or never linked to it are not found. The soup, eaten on the days without curry,
		// has fewer stomach aches only because of that: explained by the curry, it is not shown.
		expect(find(analysis, 'meal:pain', 'stomach')).toBeUndefined();
		expect(analysis.correlations.map(c => c.factor.id)).toEqual(['meal:curry']);
	});

	test('the hours after an entry are compared with the same hours of the other days', () => {
		const random = seededRandom(5);
		// Times entered, but symptoms of the whole day: only the hours after the curry tell them apart
		const days = buildDays(80, (i, day) => {
			day.meal('Pâtes', '12:00');
			const curry = i % 4 === 0;
			day.meal(curry ? 'Curry' : 'Riz', '19:30');
			if (random() < 0.15) {
				day.symptom('stomach', '09:00', 2);
			}
			if (curry && random() < 0.8) {
				day.symptom('stomach', '23:00', 3);
			}
		});
		const curry = find(analyzeCorrelations(days, [{ key: 'stomach' }]), 'meal:curry', 'stomach');
		expect(curry.relation).toBe('hours');
		expect(curry.mode).toBe('frequency');
		// The days of the curry, and the evenings of the other days
		expect(curry.withFactor.total).toBe(20);
		expect(curry.withoutFactor.total).toBe(60);
		expect(curry.withFactor.average).toBeNull();
	});

	test('short nights followed by headaches', () => {
		const random = seededRandom(21);
		const durations: number[] = [];
		const days = buildDays(90, (i, day) => {
			// Bedtime between 22:00 and 01:30, wake-up at 07:00: from 5h30 to 9h of sleep
			const bedTime = -120 + Math.floor(random() * 8) * 30;
			day.sleep('07:00', time(bedTime));
			durations.push(420 - bedTime);
			day.meal('Pâtes', '12:00');
			// The night before day i: the bedtime of day i - 1
			const night = i > 0 ? durations[i - 1] : 480;
			if (random() < (night < 420 ? 0.7 : 0.1)) {
				day.overview('head', 3);
			}
		});
		const analysis = analyzeCorrelations(days, [{ key: 'head' }]);
		// The short nights are the late bedtimes (same wake-up time): one of them explains the other, a single card
		const sleep = analysis.correlations.filter(c => c.factor.kind === 'sleep');
		expect(sleep.length).toBe(1);
		expect(sleep[0].relation).toBe('night');
		expect(sleep[0].direction).toBe('worse');
		expect(sleep[0].confidence).toBe(3);
		expect(`${sleep[0].factor.measure} ${sleep[0].side}`).toMatch(/^(duration low|bedTime high)$/);
		// Rounded to 5 minutes, at the limit of the short nights (7 h, a bedtime at midnight)
		expect(sleep[0].threshold % 5).toBe(0);
		expect(sleep[0].threshold).toBe(sleep[0].factor.measure === 'duration' ? 420 : 30);
		expect(sleep[0].withFactor.count / sleep[0].withFactor.total)
			.toBeGreaterThan(sleep[0].withoutFactor.count / sleep[0].withoutFactor.total + 0.4);
	});

	test('nights too short or too long for the person, both followed by fatigue', () => {
		const random = seededRandom(61);
		const count = 150;
		// Usually about 8 h (in bed at 23:00, up at 07:00), sometimes 5 h 30 (in bed at 01:30), sometimes 11 h (up at 10:00)
		const bedTimes = Array.from({ length: count }, () => random() < 0.15 ? 90 : -60 + Math.floor(random() * 3) * 15);
		const wakeUps = Array.from({ length: count }, () => random() < 0.15 ? 600 : 420);
		const days = buildDays(count, (i, day) => {
			day.sleep(time(wakeUps[i]), time(bedTimes[i]));
			day.meal('Pâtes', '12:00');
			// The night before day i: from the bedtime of day i - 1
			const night = i > 0 ? wakeUps[i] - bedTimes[i - 1] : 480;
			if (random() < (Math.abs(night - 465) >= 120 ? 0.75 : 0.08)) {
				day.overview('fatigue', 2);
			}
		});
		const analysis = analyzeCorrelations(days, [{ key: 'fatigue' }]);
		const gap = find(analysis, 'sleep:durationGap', 'fatigue');
		expect(gap).toBeTruthy();
		expect(gap.direction).toBe('worse');
		expect(gap.side).toBe('high');
		// Far from the usual duration (about 8 h), in both directions: the strongest link, the others explained by it
		expect(analysis.correlations[0]).toBe(gap);
		expect(gap.usual).toBeGreaterThanOrEqual(450);
		expect(gap.usual).toBeLessThanOrEqual(480);
		expect(gap.threshold).toBeGreaterThanOrEqual(60);
		expect(gap.withFactor.count / gap.withFactor.total).toBeGreaterThan(0.5);
	});

	test('an irregular schedule followed by dizziness', () => {
		const random = seededRandom(71);
		const days = buildDays(180, (i, day) => {
			// Trips: 5 days every 30 days, shifted by 3 hours (later, then earlier the next time), for nights as long
			const trip = i % 30 >= 20 && i % 30 < 25;
			const later = Math.floor(i / 30) % 2 === 0;
			day.sleep(trip ? (later ? '10:00' : '04:00') : '07:00', trip ? (later ? '02:00' : '20:00') : '23:00');
			day.meal('Pâtes', '12:00');
			// Dizzy after the shifted nights
			const shifted = i % 30 >= 21 && i % 30 <= 25;
			if (random() < (shifted ? 0.7 : 0.05)) {
				day.overview('dizzy', 2);
			}
		});
		const analysis = analyzeCorrelations(days, [{ key: 'dizzy' }]);
		const sleep = analysis.correlations.filter(c => c.factor.kind === 'sleep');
		expect(sleep[0].factor.measure).toBe('irregularity');
		expect(sleep[0].side).toBe('high');
		expect(sleep[0].threshold).toBeGreaterThanOrEqual(60);
	});

	test('a habit and a symptom of the same season are not linked', () => {
		const random = seededRandom(8);
		// Winter: soup one day out of two and headaches one day out of two, independently. Then neither.
		const days = buildDays(168, (i, day) => {
			day.meal('Pain', '08:00');
			const winter = i < 84;
			if (winter && random() < 0.5) {
				day.meal('Soupe', '19:00');
			}
			if (random() < (winter ? 0.5 : 0.05)) {
				day.overview('head', 2);
			}
		});
		const analysis = analyzeCorrelations(days, [{ key: 'head' }]);
		expect(find(analysis, 'meal:soupe', 'head')).toBeUndefined();
	});

	test('medications taken because of a symptom are not linked to it', () => {
		const random = seededRandom(13);
		const days = buildDays(90, (i, day) => {
			day.meal('Pâtes', '12:00');
			if (random() < 0.3) {
				day.symptom('head', '10:00', 3);
				// The medication after the headache
				day.med('Doliprane', '10:30');
			}
		});
		const analysis = analyzeCorrelations(days, [{ key: 'head' }]);
		expect(analysis.correlations.filter(c => c.factor.id === 'med:doliprane' && c.direction === 'worse')).toEqual([]);
	});

	test('nor to the other symptoms of the same bad days', () => {
		const random = seededRandom(19);
		const days = buildDays(150, (i, day) => {
			day.meal('Pâtes', '12:00');
			// A bad day: a headache in the morning, the painkiller, then often fatigue in the afternoon
			if (random() < 0.3) {
				day.symptom('head', '09:00', 3);
				day.med('Doliprane', '09:30');
				if (random() < 0.7) {
					day.symptom('fatigue', '13:00', 2);
				}
			} else if (random() < 0.1) {
				day.symptom('fatigue', '13:00', 2);
			}
		});
		const analysis = analyzeCorrelations(days, [{ key: 'head' }, { key: 'fatigue' }]);
		expect(analysis.correlations.filter(c => c.factor.kind === 'med')).toEqual([]);
	});

	test('a few days make a weak lead, however striking', () => {
		const random = seededRandom(29);
		const days = buildDays(120, (i, day) => {
			day.meal('Pâtes', '12:00');
			// 5 days of raclette, each followed by a stomach ache
			const raclette = i % 24 === 3;
			if (raclette) {
				day.meal('Raclette', '20:00');
			}
			if (raclette || random() < 0.05) {
				day.overview('stomach', 3);
			}
		});
		const raclette = find(analyzeCorrelations(days, [{ key: 'stomach' }]), 'meal:raclette', 'stomach');
		expect(raclette.withFactor.total).toBe(5);
		expect(raclette.confidence).toBe(1);
	});

	test('a mood (inverted scale) lower the day after a drink', () => {
		const random = seededRandom(17);
		let drink = false;
		const days = buildDays(100, (i, day) => {
			day.meal('Pâtes', '12:00');
			day.overview('mood', drink ? 1 + Math.floor(random() * 2) : 3 + Math.floor(random() * 3));
			drink = random() < 0.25;
			if (drink) {
				day.custom('alcohol', 'Bière', '21:00', 2);
			}
		});
		const analysis = analyzeCorrelations(days, [{ key: 'mood', invertedScale: true }]);
		const beer = find(analysis, 'custom:alcohol:bière', 'mood');
		expect(beer.relation).toBe('nextDay');
		expect(beer.mode).toBe('intensity');
		expect(beer.direction).toBe('worse');
		// Averages of the mood itself, not reversed
		expect(beer.withFactor.average).toBeLessThan(2.5);
		expect(beer.withoutFactor.average).toBeGreaterThan(3);
		// The latest 15 days behind the link, of the 20 or so
		expect(beer.withFactor.total).toBeGreaterThan(15);
		expect(beer.dates).toHaveLength(15);
		expect([...beer.dates].sort().reverse()).toEqual(beer.dates);
		// A single kind of entries: the type as a whole adds nothing
		expect(analysis.correlations.find(c => c.factor.id === 'custom:alcohol:*')).toBeUndefined();
	});

	test('something linked to fewer symptoms', () => {
		const random = seededRandom(23);
		const days = buildDays(90, (i, day) => {
			const sport = i % 3 === 0;
			if (sport) {
				day.sport('Course', '18:00');
			}
			if (random() < 0.5) {
				day.note('Travail', '09:00');
			}
			if (random() < (sport ? 0.05 : 0.6)) {
				day.overview('back', 2);
			}
		});
		const sport = find(analyzeCorrelations(days, [{ key: 'back' }]), 'sport:course', 'back');
		expect(sport.direction).toBe('better');
		expect(sport.relation).toBe('sameDay');
		// The days of sport without back pain
		expect(sport.dates.length).toBeGreaterThan(5);
	});

	test('random data gives no strong correlation', () => {
		const random = seededRandom(99);
		const meals = ['Pâtes', 'Riz', 'Salade', 'Curry', 'Pizza', 'Soupe', 'Poisson', 'Poulet', 'Burger', 'Sushi'];
		const days = buildDays(120, (i, day) => {
			meals.forEach((meal, m) => random() < 0.2 + m * 0.04 && day.meal(meal, time(600 + m * 60)));
			['Course', 'Vélo', 'Yoga'].forEach(sport => random() < 0.25 && day.sport(sport, '18:00'));
			['Stress', 'Travail', 'Sortie'].forEach(note => random() < 0.3 && day.note(note, '20:00'));
			day.sleep(time(360 + Math.floor(random() * 6) * 30), time(-90 + Math.floor(random() * 6) * 30));
			['head', 'stomach', 'back'].forEach(key => random() < 0.3
				&& day.symptom(key, time(480 + Math.floor(random() * 12) * 60), 1 + Math.floor(random() * 4)));
		});
		const analysis = analyzeCorrelations(days, [{ key: 'head' }, { key: 'stomach' }, { key: 'back' }]);
		expect(analysis.tests).toBeGreaterThan(100);
		expect(analysis.factors).toBeGreaterThan(15);
		expect(analysis.symptoms).toBe(3);
		expect(analysis.correlations.filter(c => c.confidence >= 2)).toEqual([]);
		expect(analysis.correlations.length).toBeLessThanOrEqual(2);
	});

	test('the same data always gives the same results, in any order of the days', () => {
		const random = seededRandom(31);
		const days = buildDays(60, (i, day) => {
			if (i % 4 === 0) {
				day.meal('Curry', '20:00');
				day.overview('stomach', random() < 0.8 ? 3 : 0);
			} else {
				day.meal('Riz', '20:00');
				day.overview('stomach', random() < 0.1 ? 2 : 0);
			}
		});
		const first = analyzeCorrelations(days, [{ key: 'stomach' }]);
		expect(first.correlations.length).toBeGreaterThan(0);
		expect(analyzeCorrelations([...days].reverse(), [{ key: 'stomach' }])).toEqual(first);
	});

	test('the quantity of a day of a custom type', () => {
		const random = seededRandom(41);
		const days = buildDays(90, (i, day) => {
			const liters = 0.5 + Math.floor(random() * 5) * 0.5;
			day.custom('water', '', '12:00', liters);
			if (random() < (liters < 1.5 ? 0.7 : 0.1)) {
				day.overview('head', 2);
			}
		});
		const water = find(analyzeCorrelations(days, [{ key: 'head' }]), 'quantity:water', 'head');
		expect(water.factor.measure).toBe('quantity');
		expect(water.side).toBe('low');
		expect(water.relation).toBe('sameDay');
	});

	test('a large history is analyzed quickly', () => {
		const random = seededRandom(51);
		const meals = Array.from({ length: 40 }, (_, i) => 'Repas ' + i);
		const days = buildDays(730, (i, day) => {
			for (let m = 0; m < 4; m++) {
				day.meal(meals[Math.floor(random() * meals.length)], time(420 + m * 240));
			}
			['Course', 'Vélo'].forEach(sport => random() < 0.3 && day.sport(sport, '18:00'));
			random() < 0.5 && day.med('Doliprane', '10:00');
			day.custom('water', '', '12:00', 1 + Math.floor(random() * 4) * 0.5);
			day.sleep(time(360 + Math.floor(random() * 6) * 30), time(-90 + Math.floor(random() * 6) * 30));
			['head', 'stomach', 'back', 'mood'].forEach(key => random() < 0.3
				&& day.symptom(key, time(480 + Math.floor(random() * 12) * 60), 1 + Math.floor(random() * 4)));
			if (i % 7 === 0) {
				day.symptom('head', '21:00', 4);
			}
		});
		const start = Date.now();
		const analysis = analyzeCorrelations(days, [{ key: 'head' }, { key: 'stomach' }, { key: 'back' },
			{ key: 'mood', invertedScale: true }]);
		expect(analysis.tests).toBeGreaterThan(300);
		// About 0.3 s on a desktop computer
		expect(Date.now() - start).toBeLessThan(5000);
	});
});
