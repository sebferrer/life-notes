import { IMealHistory } from './meal.model';
import { IDetailedDate } from './detailed.date';
import { getDetailedDate } from '../util/date.utils';

export class MealHistoryViewModel {
	public readonly key: string;
	public readonly occurrences: number;
	public readonly lastEntry: string;
	public readonly lastEntryDate: IDetailedDate;
	public editable: boolean;

	constructor(meal: IMealHistory) {
		this.key = meal.key;
		this.occurrences = meal.occurrences;
		this.lastEntry = meal.lastEntry;
		this.lastEntryDate = meal.lastEntry ? getDetailedDate(meal.lastEntry) : null;
		this.editable = false;
	}

}
