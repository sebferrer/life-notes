import { ISymptomOverview } from './symptom.model';
import { IDayOverview } from './day.model';
import { IDetailedDate } from './detailed.date';
import { ILog } from './log.model';
import { IMed } from './med.model';
import { ISport } from './sport.model';
import { ICustomEntry } from './custom-type.model';

export class DayOverviewViewModel {

	public readonly date: string;
	public readonly detailedDate: IDetailedDate;
	public readonly symptomOverviews: ISymptomOverview[];
	public readonly wakeUpTime: string;
	public readonly bedTime: string;

	public readonly meds: IMed[];
	public readonly logs: ILog[];
	public readonly sports: ISport[];
	public readonly customs: ICustomEntry[];
	// Symptoms having at least one occurrence logged this day
	public readonly loggedSymptomKeys: string[];

	constructor(dayOverview: IDayOverview) {
		this.date = dayOverview.date;
		this.detailedDate = dayOverview.detailedDate;
		this.symptomOverviews = [...dayOverview.symptomOverviews];
		this.wakeUpTime = dayOverview.wakeUp;
		this.bedTime = dayOverview.goToBed;
		this.meds = (dayOverview as any).meds ? [...(dayOverview as any).meds] : [];
		this.logs = (dayOverview as any).logs ? [...(dayOverview as any).logs] : [];
		this.sports = (dayOverview as any).sports ? [...(dayOverview as any).sports] : [];
		this.customs = (dayOverview as any).customs ? [...(dayOverview as any).customs] : [];
		this.loggedSymptomKeys = ((dayOverview as any).symptoms || [])
			.filter(symptom => symptom.logs && symptom.logs.length > 0)
			.map(symptom => symptom.key);
	}

	// null when the symptom has no intensity this day
	public findSymptomPain(key: string): number {
		const symptomOverview = key == null ? null : this.symptomOverviews.find(s => s.key === key);
		return symptomOverview == null ? null : symptomOverview.pain;
	}

	public getSymptomPain(key: string): number {
		if (key == null) {
			return 0;
		}
		const symptomOverview = this.symptomOverviews.find(s => s.key === key);
		return symptomOverview == null ? 0 : symptomOverview.pain;
	}

}
