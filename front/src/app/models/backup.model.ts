import { IDay } from './day.model';
import { ISymptom } from './symptom.model';
import { ISettings } from './settings.model';

export interface IBackup {
	days: IDay[];
	symptoms: ISymptom[];
	settings: ISettings;
}
