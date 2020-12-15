import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { IDay } from '../models';
import { getFormattedDate } from 'src/app/util/date.utils';
import { map, switchMap, catchError, tap, mergeMap } from 'rxjs/operators';
import { IBackup } from '../models/backup.model';
import { DaysService } from './days.service';
import { SymptomsService } from './symptoms.service';
import { SettingsService } from './settings.service';

@Injectable()
export class BackupService {

	constructor(
		private daysSerice: DaysService,
		private symptomsService: SymptomsService,
		private settingsService: SettingsService
	) { }

	public getBackup(): Observable<IBackup> {
		return this.daysSerice.getDays().pipe(
			mergeMap(days => {
				return this.symptomsService.getSymptoms().pipe(
					mergeMap(symptoms => {
						return this.settingsService.getSettings().pipe(
							map(settings => {
								return { days, symptoms, settings }
							})
						)
					})
				)
			})
		);
	}

}
