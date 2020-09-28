import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MatButtonModule, MatCardModule, MatGridListModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, MatToolbarModule, MatListModule, MatChipsModule, MatDialogModule, MatFormFieldModule, MatSnackBarModule, MatInputModule } from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './ui';
import { DayComponent } from './ui/day';
import { DaysService } from './infra';
import { CalendarComponent } from './ui/calendar';
import { TimelineComponent } from './ui/timeline';
import { DialogAddEventComponent } from './ui/timeline/dialog-add-event';
import { FormsModule } from '@angular/forms';
import { DialogDeleteEventComponent } from './ui/timeline/dialog-delete-event';

@NgModule({
	declarations: [
		AppComponent,
		HomeComponent,
		DayComponent,
		CalendarComponent,
		TimelineComponent,
		DialogAddEventComponent,
		DialogDeleteEventComponent
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
		MatSnackBarModule
	],
	providers: [
		DaysService
	],
	entryComponents: [
		DialogAddEventComponent,
		DialogDeleteEventComponent
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
