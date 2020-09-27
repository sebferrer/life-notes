import { IDay } from './day.model';
import { getSortOrder } from './array.utils';

export class DayViewModel {

	public readonly date: string;
	public readonly wakeUp: string;
	public readonly goToBed: string;
	public readonly content: Array<any>;

	constructor(day: IDay) {
		this.date = day.date;
		this.wakeUp = day.wakeUp;
		this.goToBed = day.goToBed;

		this.content = [...day.logs];

		for (const symptom of day.symptoms) {
			this.content.push(...symptom.logs);
		}

		this.content.push(...day.meds);
		this.content.push(...day.meals);

		this.content.sort(getSortOrder('time'));
	}

}
