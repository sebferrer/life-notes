export interface ILog {
	type: string;
	time: string;
	key: string;
	detail: string;
}

export interface ILogHistory {
	key: string;
	occurrences: number;
	lastEntry: string;
}
