import { ISportHistory } from './sport.model';
import { IDetailedDate } from './detailed.date';
import { getDetailedDate } from '../util/date.utils';

export class SportHistoryViewModel {
	public readonly key: string;
	public readonly occurrences: number;
	public readonly lastEntry: string;
	public readonly lastEntryDate: IDetailedDate;
	public editable: boolean;

	constructor(sport: ISportHistory) {
		this.key = sport.key;
		this.occurrences = sport.occurrences;
		this.lastEntry = sport.lastEntry;
		this.lastEntryDate = sport.lastEntry ? getDetailedDate(sport.lastEntry) : null;
		this.editable = false;
	}

}
