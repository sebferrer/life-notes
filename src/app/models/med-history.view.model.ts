import { IMedHistory } from './med.model';

export class MedHistoryViewModel {
	public readonly key: string;
	public readonly quantity: number;
	public readonly occurrences: number;
	public readonly lastEntry: string;
	public editable: boolean;

	constructor(med: IMedHistory) {
		this.key = med.key;
		this.quantity = med.quantity;
		this.occurrences = med.occurrences;
		this.lastEntry = med.lastEntry;
		this.editable = false;
	}

}
