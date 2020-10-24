import { IDay } from './day.model';
import { getSortOrder } from '../util/array.utils';
import { ISymptomOverview } from './symptom.model';

export class DayViewModel {

	public readonly date: string;
	public readonly wakeUp: string;
	public readonly goToBed: string;
	public readonly content: Array<any>;
	public readonly symptomOverviews: ISymptomOverview[];
	public removable: boolean;

	constructor(day: IDay) {
		this.date = day.date;
		this.wakeUp = day.wakeUp;
		this.goToBed = day.goToBed;
		this.symptomOverviews = [...day.symptomOverviews];

		this.content = [...day.logs];

		for (const symptom of day.symptoms) {
			this.content.push(...symptom.logs);
		}

		this.content.push(...day.meds);
		this.content.push(...day.meals);

		this.content.sort(getSortOrder('time'));

		this.removable = false;
	}

	public getSymptomPain(key: string): number {
		if (key == null) {
			return 0;
		}
		const symptomOverview = this.symptomOverviews.find(s => s.key === key);
		return symptomOverview == null ? 0 : symptomOverview.pain;
	}

}
