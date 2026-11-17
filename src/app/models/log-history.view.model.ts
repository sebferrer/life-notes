import { ILogHistory } from './log.model';
import { IDetailedDate } from './detailed.date';
import { getDetailedDate } from '../util/date.utils';

export class LogHistoryViewModel {
	public readonly key: string;
	public readonly occurrences: number;
	public readonly lastEntry: string;
	public readonly lastEntryDate: IDetailedDate;
	public editable: boolean;

	constructor(med: ILogHistory) {
		this.key = med.key;
		this.occurrences = med.occurrences;
		this.lastEntry = med.lastEntry;
		this.lastEntryDate = med.lastEntry ? getDetailedDate(med.lastEntry) : null;
		this.editable = false;
	}

}
