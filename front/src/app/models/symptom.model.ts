export interface ISymptomOverview {
	key: string;
	pain: number;
}

export interface ISymptom {
	type: string;
	key: string;
	logs: ISymptomLog[];
}

export interface ISymptomLog {
	type: string;
	key: string;
	time: string;
	pain: number;
	detail: string;
}
