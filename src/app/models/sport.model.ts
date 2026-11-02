export interface ISport {
	type: string;
	time: string;
	key: string;
	detail: string;
}

export interface ISportHistory {
	key: string;
	occurrences: number;
	lastEntry: string;
}
