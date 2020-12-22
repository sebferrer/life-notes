import { HttpClientModule } from '@angular/common/http';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatExpansionModule } from '@angular/material/expansion';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DbContext, DaysService, SymptomsService, SettingsService } from './infra';
import { HomeComponent } from './ui';
import { CalendarComponent } from './ui/calendar';
import { DayComponent } from './ui/day';
import { TimelineComponent } from './ui/timeline';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { SymptomsComponent } from './ui/symptoms';
import { BottomSheetAddEventComponent } from './ui/time/bottom-sheet-add-event';
import { TranslocoRootModule } from './transloco/transloco-root.module';
import { TranslocoService } from '@ngneat/transloco';
import { GlobalService } from './infra/global.service';
import { SettingsComponent } from './ui/settings';
import { InfiniteScrollComponent } from './ui/infinite-scroll';
import { File as IonicFile } from '@ionic-native/file/ngx';
import { GoogleChartsModule } from 'angular-google-charts';
import { SleepChartComponent } from './ui/sleep-chart';
import { BackupService } from './infra/backup.service';
import { DialogAddEventComponent } from './ui/dialog/dialog-add-event';
import { DialogDeleteEventComponent } from './ui/dialog/dialog-delete-event';
import { DialogShowEventComponent } from './ui/dialog/dialog-show-event';
import { DialogAddSymptomComponent } from './ui/dialog/dialog-add-symptom';
import { DialogDeleteSymptomComponent } from './ui/dialog/dialog-delete-symptom';
import { DialogEditSymptomOverviewComponent } from './ui/dialog/dialog-edit-symptom-overview';
import { DialogImportConfirmComponent } from './ui/dialog/dialog-import-confirm';
import { DialogNoSymptomWarningComponent } from './ui/dialog/dialog-no-symptom-warning';
import { DialogSelectSymptomComponent } from './ui/dialog/dialog-select-symptom';
import { DialogSelectBackupComponent } from './ui/dialog/dialog-select-backup';

@NgModule({
	declarations: [
		AppComponent,
		HomeComponent,
		DayComponent,
		CalendarComponent,
		TimelineComponent,
		SymptomsComponent,
		SettingsComponent,
		SleepChartComponent,
		DialogAddEventComponent,
		DialogDeleteEventComponent,
		DialogShowEventComponent,
		DialogAddSymptomComponent,
		DialogDeleteSymptomComponent,
		DialogEditSymptomOverviewComponent,
		DialogImportConfirmComponent,
		DialogNoSymptomWarningComponent,
		DialogSelectSymptomComponent,
		DialogSelectBackupComponent,
		BottomSheetAddEventComponent,

		// Helpers
		InfiniteScrollComponent
	],
	imports: [
		BrowserModule,
		HttpClientModule,
		AppRoutingModule,
		FormsModule,
		MatMenuModule,
		MatButtonModule,
		MatIconModule,
		MatToolbarModule,
		MatProgressSpinnerModule,
		MatCardModule,
		MatGridListModule,
		MatListModule,
		MatTableModule,
		MatChipsModule,
		MatDialogModule,
		BrowserAnimationsModule,
		MatFormFieldModule,
		MatInputModule,
		MatSnackBarModule,
		MatSelectModule,
		MatSliderModule,
		MatBottomSheetModule,
		MatExpansionModule,
		NgxMaterialTimepickerModule,
		TranslocoRootModule,
		GoogleChartsModule
	],
	providers: [
		DaysService,
		SymptomsService,
		DbContext,
		AppComponent,
		GlobalService,
		SettingsService,
		BackupService,
		IonicFile,
		{
			provide: APP_INITIALIZER,
			useFactory: (translocoService: TranslocoService) => {
				return async () => {
					await translocoService.load('fr').toPromise();
					await translocoService.load('en').toPromise();
				};
			},
			deps: [TranslocoService],
			multi: true
		}
	],
	entryComponents: [
		DialogAddEventComponent,
		DialogDeleteEventComponent,
		DialogShowEventComponent,
		DialogAddSymptomComponent,
		DialogDeleteSymptomComponent,
		DialogEditSymptomOverviewComponent,
		DialogImportConfirmComponent,
		DialogNoSymptomWarningComponent,
		DialogSelectSymptomComponent,
		DialogSelectBackupComponent,
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
