import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { HomeComponent } from './ui';
import { DayComponent } from './ui/day';
import { CalendarComponent } from './ui/calendar';
import { TimelineComponent } from './ui/timeline';
import { SymptomsComponent } from './ui/symptoms';
import { SettingsComponent } from './ui/settings';
import { TutorialComponent } from './ui/tutorial';
import { MedsComponent } from './ui/meds';
import { LogsComponent } from './ui/logs';

const routes: Routes = [
	{
		path: '',
		component: HomeComponent
	},
	{
		path: 'calendar',
		component: CalendarComponent
	},
	{
		path: 'timeline',
		component: TimelineComponent
	},
	{
		path: 'symptoms',
		component: SymptomsComponent
	},
	{
		path: 'meds',
		component: MedsComponent
	},
	{
		path: 'logs',
		component: LogsComponent
	},
	{
		path: 'settings',
		component: SettingsComponent
	},
	{
		path: 'tutorial',
		component: TutorialComponent
	},
	{
		path: ':date',
		component: DayComponent
	},
];

@NgModule({
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		MatMenuModule,
		RouterModule.forRoot(routes,
			{
				useHash: true,
				scrollPositionRestoration: 'enabled',
				relativeLinkResolution: 'legacy'
			}
		)
	],
	exports: [RouterModule],
	schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppRoutingModule { }
