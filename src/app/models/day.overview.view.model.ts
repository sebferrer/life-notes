import { ISymptomOverview } from './symptom.model';
import { IDayOverview } from './day.model';
import { IDetailedDate } from './detailed.date';
import { ILog } from './log.model';
import { IMed } from './med.model';

export class DayOverviewViewModel {

	public readonly date: string;
	public readonly detailedDate: IDetailedDate;
	public readonly symptomOverviews: ISymptomOverview[];
	public readonly wakeUpTime: string;
	public readonly bedTime: string;

	public readonly meds: IMed[];
	public readonly logs: ILog[];

	constructor(dayOverview: IDayOverview) {
		this.date = dayOverview.date;
		this.detailedDate = dayOverview.detailedDate;
		this.symptomOverviews = [...dayOverview.symptomOverviews];
		this.wakeUpTime = dayOverview.wakeUp;
		this.bedTime = dayOverview.goToBed;
		this.meds = (dayOverview as any).meds ? [...(dayOverview as any).meds] : [];
		this.logs = (dayOverview as any).logs ? [...(dayOverview as any).logs] : [];
	}

	public getSymptomPain(key: string): number {
		if (key == null) {
			return 0;
		}
		const symptomOverview = this.symptomOverviews.find(s => s.key === key);
		return symptomOverview == null ? 0 : symptomOverview.pain;
	}

}
