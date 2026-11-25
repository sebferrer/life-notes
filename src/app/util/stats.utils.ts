// Statistics of the correlation engine (see correlation.model.ts): no library, deterministic results

// Seeded pseudo-random numbers between 0 and 1 (mulberry32): the same data always gives the same results
export function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6D2B79F5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Seed of a test, from its name (FNV-1a): each test gets its own numbers, whatever the order of the tests
export function hashString(text: string): number {
	let hash = 0x811C9DC5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

export function median(values: number[]): number {
	return quantile(values, 0.5);
}

// Value below which a share of the values lies (0.5: the median), interpolated between two values
export function quantile(values: number[], share: number): number {
	if (values.length === 0) {
		return null;
	}
	const sorted = [...values].sort((a, b) => a - b);
	const position = (sorted.length - 1) * share;
	const below = Math.floor(position);
	const above = Math.ceil(position);
	return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}

// Ranks from 1, the tied values sharing the average of their ranks
export function midRanks(values: number[]): number[] {
	const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
	const ranks = new Array<number>(values.length);
	let i = 0;
	while (i < order.length) {
		let j = i;
		while (j + 1 < order.length && order[j + 1].value === order[i].value) {
			j++;
		}
		const rank = (i + j) / 2 + 1;
		for (let k = i; k <= j; k++) {
			ranks[order[k].index] = rank;
		}
		i = j + 1;
	}
	return ranks;
}

export interface IPermutationTestOptions {
	// Most random permutations drawn: the smallest p-value is about 1 / maxPermutations
	maxPermutations?: number;
	// Permutations stop once this many of them are as extreme as the data (sequential test of Besag and Clifford):
	// a test far from significant ends after a few dozen permutations
	hits?: number;
	// A large sample still significant after this many permutations takes the p-value of the normal distribution of
	// its statistic (as precise there, much faster than drawing tens of thousands of permutations)
	normalAfter?: number;
}

export interface IPermutationTestResult {
	// Statistic minus its expected value without any link: positive when high x go with high y
	effect: number;
	// Two-sided
	pValue: number;
	// Effect in standard deviations of the statistic: how far from chance, still telling apart the strongest links
	// when their p-values are all at their smallest
	z: number;
}

// Two-sided p-value of a standard normal deviate: erfc(|z| / sqrt(2)), relative error below 1.2e-7 (Numerical Recipes)
export function normalPValue(z: number): number {
	const x = Math.abs(z) / Math.SQRT2;
	const t = 1 / (1 + 0.5 * x);
	const erfc = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418
		+ t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223
		+ t * 0.17087277)))))))));
	return Math.min(1, erfc);
}

// A sample large enough for the normal distribution: observations on both sides of x, and of y
const NORMAL_MIN_GROUP = 15;

// Stratified permutation test of the link between x and y. The statistic is the sum of x * y. Without any link,
// x could be shuffled between the observations of a stratum without changing anything: the p-value is the share of
// such shuffles giving a statistic at least as far from its expected value as the data.
// The strata keep apart what must not be mixed (periods of the year, days following a bad day...), so that a link
// coming only from them is not found. Exact for small samples, no assumption on the distributions, ties included.
export function stratifiedPermutationTest(x: number[], y: number[], strata: number[], seed: number,
	options: IPermutationTestOptions = {}): IPermutationTestResult {
	const maxPermutations = options.maxPermutations || 20000;
	const hits = options.hits || 10;
	const normalAfter = options.normalAfter || 2000;
	const groups = new Map<number, number[]>();
	strata.forEach((stratum, i) => {
		const group = groups.get(stratum);
		if (group) {
			group.push(i);
		} else {
			groups.set(stratum, [i]);
		}
	});
	const binary = x.every(value => value === 0 || value === 1);
	// The strata whose x or y are all the same can't change the statistic: left out
	const blocks: { xs: number[], ys: number[], ones: number, total: number }[] = [];
	let observed = 0;
	let expected = 0;
	// Variance of the statistic over the permutations: sum over the strata of Sxx * Syy / (n - 1)
	let variance = 0;
	// Observations with x above (and below) its mean, with y above (and below) its mean: the smallest of these counts
	let smallestSide = Infinity;
	groups.forEach(indexes => {
		const xs = indexes.map(i => x[i]);
		const ys = indexes.map(i => y[i]);
		const sumX = xs.reduce((sum, value) => sum + value, 0);
		const sumY = ys.reduce((sum, value) => sum + value, 0);
		if (xs.every(value => value === xs[0]) || ys.every(value => value === ys[0])) {
			return;
		}
		const n = indexes.length;
		observed += xs.reduce((sum, value, i) => sum + value * ys[i], 0);
		expected += sumX * sumY / n;
		const meanX = sumX / n;
		const meanY = sumY / n;
		variance += xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0)
			* ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0) / (n - 1);
		blocks.push({ xs, ys, ones: sumX, total: sumY });
	});
	const effect = observed - expected;
	if (blocks.length === 0) {
		return { effect: 0, pValue: 1, z: 0 };
	}
	const z = variance > 0 ? effect / Math.sqrt(variance) : 0;
	const all = (key: 'xs' | 'ys') => blocks.reduce((values, block) => values.concat(block[key]), [] as number[]);
	for (const values of [all('xs'), all('ys')]) {
		const average = values.reduce((sum, value) => sum + value, 0) / values.length;
		const above = values.filter(value => value > average).length;
		smallestSide = Math.min(smallestSide, above, values.length - above);
	}
	// Rounding errors must not make the data itself less extreme than its own permutation
	const threshold = Math.abs(effect) - 1e-9 * (1 + Math.abs(observed));
	const random = seededRandom(seed);
	// A permutation within each stratum. Binary x: the sum of y over a random subset of the size of the ones, drawn by
	// a partial Fisher-Yates shuffle of the smallest side.
	const permutedStatistic = (): number => {
		let statistic = 0;
		for (const block of blocks) {
			const ys = block.ys;
			const n = ys.length;
			if (binary) {
				const draws = Math.min(block.ones, n - block.ones);
				let sum = 0;
				for (let i = 0; i < draws; i++) {
					const j = i + Math.floor(random() * (n - i));
					const value = ys[j];
					ys[j] = ys[i];
					ys[i] = value;
					sum += value;
				}
				statistic += draws === block.ones ? sum : block.total - sum;
			} else {
				for (let i = n - 1; i > 0; i--) {
					const j = Math.floor(random() * (i + 1));
					const value = ys[j];
					ys[j] = ys[i];
					ys[i] = value;
				}
				const xs = block.xs;
				for (let i = 0; i < n; i++) {
					statistic += xs[i] * ys[i];
				}
			}
		}
		return statistic;
	};
	let extreme = 0;
	for (let permutation = 1; permutation <= maxPermutations; permutation++) {
		if (Math.abs(permutedStatistic() - expected) >= threshold) {
			extreme++;
			if (extreme >= hits) {
				return { effect, pValue: extreme / permutation, z };
			}
		}
		if (permutation === normalAfter && smallestSide >= NORMAL_MIN_GROUP) {
			return { effect, pValue: normalPValue(z), z };
		}
	}
	return { effect, pValue: (extreme + 1) / (maxPermutations + 1), z };
}

// q-values of Benjamini and Hochberg: the false discovery rate of the results kept up to each p-value. Many
// comparisons give some small p-values by chance alone, the q-values take their number into account.
export function benjaminiHochberg(pValues: number[]): number[] {
	const m = pValues.length;
	const order = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);
	const qValues = new Array<number>(m);
	let minimum = 1;
	for (let rank = m; rank >= 1; rank--) {
		const { p, index } = order[rank - 1];
		minimum = Math.min(minimum, p * m / rank);
		qValues[index] = minimum;
	}
	return qValues;
}
