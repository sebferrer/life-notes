import { ISymptom, ISymptomOverview } from './symptom.model';
import { ILog } from './log.model';
import { IMed } from './med.model';
import { IMeal } from './meal.model';
import { IDetailedDate } from './detailed.date';

export interface IDayOverview {
	date: string;
	detailedDate?: IDetailedDate;
	symptomOverviews: ISymptomOverview[];
	wakeUp: string;
	goToBed: string;
}

export interface IDay extends IDayOverview {
	logs: ILog[];
	symptoms: ISymptom[];
	meds: IMed[];
	meals: IMeal[];
}
