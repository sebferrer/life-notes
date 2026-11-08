import { HttpClientModule } from '@angular/common/http';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DbContext, DaysService, SymptomsService, SettingsService } from './infra';
import { HomeComponent } from './ui';
import { CalendarComponent } from './ui/calendar';
import { DayComponent } from './ui/day';
import { TimelineComponent } from './ui/timeline';
import { SymptomsComponent } from './ui/symptoms';
import { MedsComponent } from './ui/meds';
import { BottomSheetAddEventComponent } from './ui/time/bottom-sheet-add-event';
import { TranslocoRootModule } from './transloco/transloco-root.module';
import { TranslocoService } from '@ngneat/transloco';
import { GlobalService } from './infra/global.service';
import { SettingsComponent } from './ui/settings';
import { InfiniteScrollComponent } from './ui/infinite-scroll';
import { ChartsModule } from 'ng2-charts';
import { BackupService } from './infra/backup.service';
import { DialogAddEventComponent } from './ui/dialog/dialog-add-event';
import { DialogShowEventComponent } from './ui/dialog/dialog-show-event';


import { DialogNoSymptomWarningComponent } from './ui/dialog/dialog-no-symptom-warning';
import { DialogSelectSymptomComponent } from './ui/dialog/dialog-select-symptom';
import { DialogSelectBackupComponent } from './ui/dialog/dialog-select-backup';
import { PieChartComponent } from './ui/chart/pie-chart';
import { LineChartComponent } from './ui/chart/line-chart';
import { OccurrenceStatsComponent } from './ui/occurrence-stats';
import { SleepStatsComponent } from './ui/sleep-stats';
import { IntensityRingComponent } from './ui/intensity-ring';
import { DialogNoTargetSymptomWarningComponent } from './ui/dialog/dialog-no-target-symptom-warning';
import { DialogExportConfirmComponent } from './ui/dialog/dialog-export-confirm';
import { DialogInfoComponent } from './ui/dialog/dialog-info';
import { TutorialComponent } from './ui/tutorial';
import { TutorialSceneComponent } from './ui/tutorial/tutorial-scene';
import { IonicModule } from '@ionic/angular';
import { SwipingFingerComponent } from './ui/graphic/swiping-finger';
import { MedsService } from './infra/meds.service';
import { DialogConfirmComponent } from './ui/dialog/dialog-confirm';
import { DialogEditMedComponent } from './ui/dialog/dialog-edit-med/dialog-edit-med.component';
import { DialogEditLogComponent } from './ui/dialog/dialog-edit-log/dialog-edit-log.component';
import { LogsService } from './infra/logs.service';
import { LogsComponent } from './ui/logs/logs.component';
import { SportsService } from './infra/sports.service';
import { SportsComponent } from './ui/sports';
import { MealsService } from './infra/meals.service';
import { MealsComponent } from './ui/meals';
import { CustomTypesService } from './infra/custom-types.service';
import { CustomEntriesComponent } from './ui/custom-entries';
import { BottomSheetEditCustomTypeComponent } from './ui/bottom-sheet/bottom-sheet-edit-custom-type';
import { ManageComponent } from './ui/manage';
import { DialogSelectLanguageComponent } from './ui/dialog/dialog-select-language';
import { MonthlyReportComponent } from './ui/monthly-report';
import { YearInPixelsComponent } from './ui/year-in-pixels';
import { DialogUpdatesComponent } from './ui/dialog/dialog-updates';
import { AboutComponent } from './ui/about';

import { DialogTutorialNoticeComponent } from './ui/dialog/dialog-tutorial-notice';
import { DialogNewUiComponent } from './ui/dialog/dialog-new-ui';


import { DialogOccurrenceHistoryComponent } from './ui/dialog/dialog-occurrence-history';
import { BottomSheetDeleteEventComponent } from './ui/bottom-sheet/bottom-sheet-delete-event';

import { BottomSheetEditMedComponent } from './ui/bottom-sheet/bottom-sheet-edit-med';
import { BottomSheetEditLogComponent } from './ui/bottom-sheet/bottom-sheet-edit-log';
import { BottomSheetDeleteOverviewComponent } from './ui/bottom-sheet/bottom-sheet-delete-overview';
import { BottomSheetConfirmComponent } from './ui/bottom-sheet/bottom-sheet-confirm';
import { BottomSheetAutoOverviewHelpComponent } from './ui/bottom-sheet/bottom-sheet-auto-overview-help';
import { BottomSheetEditSymptomOverviewComponent } from './ui/bottom-sheet/bottom-sheet-edit-symptom-overview';
import { BottomSheetImportConfirmComponent } from './ui/bottom-sheet/bottom-sheet-import-confirm';
import { BottomSheetImportErrorComponent } from './ui/bottom-sheet/bottom-sheet-import-error';
import { BottomSheetExportPdfComponent } from './ui/bottom-sheet/bottom-sheet-export-pdf';
import { BottomSheetAddSymptomComponent } from './ui/bottom-sheet/bottom-sheet-add-symptom';
import { BottomSheetDeleteSymptomComponent } from './ui/bottom-sheet/bottom-sheet-delete-symptom';
import { BottomSheetForceLoadWarningComponent } from './ui/bottom-sheet/bottom-sheet-force-load-warning';
import { BottomSheetInfoComponent } from './ui/bottom-sheet/bottom-sheet-info';
import { BottomSheetDeleteTimelineEventComponent } from './ui/bottom-sheet/bottom-sheet-delete-timeline-event';
import { SpacerItemComponent } from './ui/shared/spacer-item';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';


@NgModule({
	declarations: [
		AppComponent,
		HomeComponent,
		DayComponent,
		CalendarComponent,
		TimelineComponent,
		SymptomsComponent,
		MedsComponent,
		LogsComponent,
		SportsComponent,
		MealsComponent,
		CustomEntriesComponent,
		ManageComponent,
		SettingsComponent,
		TutorialComponent,
		TutorialSceneComponent,
		AboutComponent,
		MonthlyReportComponent,
		YearInPixelsComponent,
		PieChartComponent,
		LineChartComponent,
		OccurrenceStatsComponent,
		SleepStatsComponent,
		IntensityRingComponent,
		SwipingFingerComponent,
		DialogAddEventComponent,
		DialogShowEventComponent,

		DialogExportConfirmComponent,
		DialogNoSymptomWarningComponent,
		DialogNoTargetSymptomWarningComponent,
		DialogSelectSymptomComponent,
		DialogSelectBackupComponent,
		DialogInfoComponent,
		DialogConfirmComponent,
		DialogSelectLanguageComponent,
		BottomSheetAddEventComponent,
		DialogEditMedComponent,
		DialogEditLogComponent,
		DialogUpdatesComponent,
		DialogTutorialNoticeComponent,
		DialogNewUiComponent,
		DialogOccurrenceHistoryComponent,
		BottomSheetDeleteEventComponent,
		BottomSheetEditMedComponent,
		BottomSheetEditLogComponent,
		BottomSheetDeleteOverviewComponent,
		BottomSheetConfirmComponent,
		BottomSheetAutoOverviewHelpComponent,

		// Helpers
		InfiniteScrollComponent,
		BottomSheetEditSymptomOverviewComponent,
		BottomSheetImportConfirmComponent,
		BottomSheetImportErrorComponent,

		BottomSheetExportPdfComponent,
		BottomSheetAddSymptomComponent,
		BottomSheetDeleteSymptomComponent,
		BottomSheetForceLoadWarningComponent,
		BottomSheetInfoComponent,
		BottomSheetDeleteTimelineEventComponent,
		BottomSheetEditCustomTypeComponent,
		SpacerItemComponent
	],
	imports: [
		BrowserModule,
		IonicModule.forRoot(),
		HttpClientModule,
		AppRoutingModule,
		FormsModule,
		MatMenuModule,
		MatButtonModule,
		MatIconModule,
		MatBadgeModule,
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
		MatTooltipModule,
		MatSelectModule,
		MatSliderModule,
		MatBottomSheetModule,
		MatExpansionModule,
		MatAutocompleteModule,
		MatSlideToggleModule,
		MatRadioModule,
		TranslocoRootModule,
		ChartsModule,
		ReactiveFormsModule,
		NgxMaterialTimepickerModule
	],
	providers: [
		DaysService,
		SymptomsService,
		DbContext,
		AppComponent,
		GlobalService,
		SettingsService,
		BackupService,
		MedsService,
		LogsService,
		SportsService,
		MealsService,
		CustomTypesService,
		SettingsService,
		BackupService,
		MedsService,
		LogsService,
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
		DialogShowEventComponent,

		DialogExportConfirmComponent,
		DialogNoSymptomWarningComponent,
		DialogNoTargetSymptomWarningComponent,
		DialogSelectSymptomComponent,
		DialogSelectBackupComponent,
		DialogInfoComponent,
		DialogConfirmComponent,
		DialogEditMedComponent,
		DialogUpdatesComponent,
		DialogTutorialNoticeComponent,
		DialogNewUiComponent,
		BottomSheetEditMedComponent,
		BottomSheetEditLogComponent,
		BottomSheetDeleteOverviewComponent,
		BottomSheetConfirmComponent,
		BottomSheetAutoOverviewHelpComponent,
		BottomSheetEditSymptomOverviewComponent,
		BottomSheetImportConfirmComponent,
		BottomSheetImportErrorComponent,

		BottomSheetExportPdfComponent,
		BottomSheetAddSymptomComponent,
		BottomSheetDeleteSymptomComponent,
		BottomSheetForceLoadWarningComponent,
		BottomSheetInfoComponent,
		BottomSheetDeleteTimelineEventComponent
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
