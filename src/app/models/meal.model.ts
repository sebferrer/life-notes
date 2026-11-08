export interface IMeal {
	type: string;
	time: string;
	key: string;
	detail: string;
}

export interface IMealHistory {
	key: string;
	occurrences: number;
	lastEntry: string;
}
