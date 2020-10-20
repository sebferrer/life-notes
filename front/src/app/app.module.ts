import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DbContext, DaysService, SymptomsService } from './infra';
import { HomeComponent } from './ui';
import { CalendarComponent } from './ui/calendar';
import { DayComponent } from './ui/day';
import { TimelineComponent } from './ui/timeline';
import { DialogAddEventComponent } from './ui/timeline/dialog-add-event';
import { DialogDeleteEventComponent } from './ui/timeline/dialog-delete-event';
import { DialogShowEventComponent } from './ui/timeline/dialog-show-event';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { SymptomsComponent } from './ui/symptoms';
import { DialogAddSymptomComponent } from './ui/symptoms/dialog-add-symptom';
import { DialogDeleteSymptomComponent } from './ui/symptoms/dialog-delete-symptom';

@NgModule({
	declarations: [
		AppComponent,
		HomeComponent,
		DayComponent,
		CalendarComponent,
		TimelineComponent,
		SymptomsComponent,
		DialogAddEventComponent,
		DialogDeleteEventComponent,
		DialogShowEventComponent,
		DialogAddSymptomComponent,
		DialogDeleteSymptomComponent
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
		MatChipsModule,
		MatDialogModule,
		BrowserAnimationsModule,
		MatFormFieldModule,
		MatInputModule,
		MatSnackBarModule,
		MatSelectModule,
		NgxMaterialTimepickerModule
	],
	providers: [
		DaysService,
		SymptomsService,
		DbContext
	],
	entryComponents: [
		DialogAddEventComponent,
		DialogDeleteEventComponent,
		DialogShowEventComponent,
		DialogAddSymptomComponent,
		DialogDeleteSymptomComponent
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
