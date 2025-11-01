import { ILogHistory } from './log.model';

export class LogHistoryViewModel {
	public readonly key: string;
	public readonly occurrences: number;
	public readonly lastEntry: string;
	public editable: boolean;

	constructor(med: ILogHistory) {
		this.key = med.key;
		this.occurrences = med.occurrences;
		this.lastEntry = med.lastEntry;
		this.editable = false;
	}

}
