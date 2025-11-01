export interface IMed {
	type: string;
	key: string;
	time: string;
	quantity: number;
}

export interface IMedHistory {
	key: string;
	quantity: number;
	occurrences: number;
	lastEntry: string;
}