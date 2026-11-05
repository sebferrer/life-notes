import { IDay } from './day.model';
import { ISymptom } from './symptom.model';
import { ISettings } from './settings.model';
import { ICustomType } from './custom-type.model';

export interface IBackup {
	days: IDay[];
	symptoms: ISymptom[];
	settings: ISettings;
	// Optional: backups made before the custom event types don't have it
	customTypes?: ICustomType[];
}
