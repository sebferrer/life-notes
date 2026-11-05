import { Observable, forkJoin } from 'rxjs';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { IBackup } from '../models/backup.model';
import { DaysService } from './days.service';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';
import { CustomTypesService } from './custom-types.service';

@Injectable()
export class BackupService {

	constructor(
		private daysService: DaysService,
		private symptomsService: SymptomsService,
		private settingsService: SettingsService,
		private customTypesService: CustomTypesService
	) { }

	public getBackup(): Observable<IBackup> {
		return forkJoin([
			this.daysService.getDays(),
			this.symptomsService.getSymptoms(),
			this.settingsService.getSettings(),
			this.customTypesService.getCustomTypes()
		]).pipe(
			map(([days, symptoms, settings, customTypes]) => {
				return { days, symptoms, settings, customTypes };
			})
		);
	}
}
