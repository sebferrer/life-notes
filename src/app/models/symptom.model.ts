export interface ISymptomOverview {
	key: string;
	pain: number;
}

export interface ISymptom {
	type: string;
	key: string;
	pain?: string;
	label?: string;
	logs?: ISymptomLog[];
	// High values are the good ones (e.g. a mood): the intensity colors are reversed
	invertedScale?: boolean;
}

// Highest level of the pain palettes (the intensities are stored from 0 to 5)
export const MAX_PAIN_LEVEL = 5;

// Level of the pain palette showing an intensity, reversed on an inverted scale
export function getPainColorLevel(pain: number, invertedScale: boolean): number {
	const level = Math.min(Math.max(Math.ceil(pain), 0), MAX_PAIN_LEVEL);
	return invertedScale ? MAX_PAIN_LEVEL - level : level;
}

export interface ISymptomLog {
	type: string;
	key: string;
	time: string;
	pain: number;
	detail: string;
}
