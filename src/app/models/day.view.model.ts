import { IDay } from './day.model';
import { getSortOrder } from '../util/array.utils';
import { DayOverviewViewModel } from 'src/app/models/day.overview.view.model';
import { ISymptomLog, ISymptom } from './symptom.model';

export class DayViewModel extends DayOverviewViewModel {

	public readonly wakeUp: string;
	public readonly goToBed: string;
	public readonly content: Array<any>;
	public readonly symptoms: Array<ISymptom>;
	public removable: boolean;

	constructor(day: IDay) {
		super(day);

		this.wakeUp = day.wakeUp;
		this.goToBed = day.goToBed;

		this.content = [...day.logs];

		this.symptoms = [...day.symptoms];
		for (const symptom of day.symptoms) {
			this.content.push(...symptom.logs);
		}

		this.content.push(...day.meds);
		this.content.push(...day.meals);

		this.content.sort(getSortOrder('time'));

		this.removable = false;
	}

}
