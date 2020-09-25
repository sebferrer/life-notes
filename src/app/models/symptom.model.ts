export interface ISymptomOverview {
	key: string;
	pain: number;
}

export interface ISymptom {
	key: string;
	logs: ISymptomLog[];
}

export interface ISymptomLog {
	time: string;
	pain: number;
	detail: string;
}
