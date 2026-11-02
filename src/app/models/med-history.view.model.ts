import { IMedHistory } from './med.model';
import { IDetailedDate } from './detailed.date';
import { getDetailedDate } from '../util/date.utils';

export class MedHistoryViewModel {
	public readonly key: string;
	public readonly quantity: number;
	public readonly occurrences: number;
	public readonly lastEntry: string;
	public readonly lastEntryDate: IDetailedDate;
	public editable: boolean;

	constructor(med: IMedHistory) {
		this.key = med.key;
		this.quantity = med.quantity;
		this.occurrences = med.occurrences;
		this.lastEntry = med.lastEntry;
		this.lastEntryDate = med.lastEntry ? getDetailedDate(med.lastEntry) : null;
		this.editable = false;
	}

}
