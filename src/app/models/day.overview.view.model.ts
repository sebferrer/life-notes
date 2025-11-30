import { ISymptomOverview } from './symptom.model';
import { IDayOverview } from './day.model';
import { IDetailedDate } from './detailed.date';

export class DayOverviewViewModel {

	public readonly date: string;
	public readonly detailedDate: IDetailedDate;
	public readonly symptomOverviews: ISymptomOverview[];
	public readonly wakeUpTime: string;
	public readonly bedTime: string;

	constructor(dayOverview: IDayOverview) {
		this.date = dayOverview.date;
		this.detailedDate = dayOverview.detailedDate;
		this.symptomOverviews = [...dayOverview.symptomOverviews];
		this.wakeUpTime = dayOverview.wakeUp;
		this.bedTime = dayOverview.goToBed;
	}

	public getSymptomPain(key: string): number {
		if (key == null) {
			return 0;
		}
		const symptomOverview = this.symptomOverviews.find(s => s.key === key);
		return symptomOverview == null ? 0 : symptomOverview.pain;
	}

}
