import { IEventPalettes } from './event-colors.model';

export interface ISettings {
	targetSymptomKey: string;
	language: string;
	timeFormat: string;
	painScale: number;
	firstStart: boolean;
	lastInstall: string;
	lastUpdate: number;
	// DEVELOPER UPDATES NOTIFICATION FEATURE DISABLED
	// hideDeveloperUpdates: boolean;
	weeklyReminder: boolean;
	lastWeeklyReminder: number;
	dailyReminder: boolean;
	lastDailyReminder: number;
	showDeveloperMode: boolean;
	showAdvancedSettings: boolean;
	calendarStartOnSunday: boolean;
	calendarBlockView: boolean;
	painPalette: string;
	autoCalculateOverview: boolean;
	autoOverviewPopupSeen: boolean;
	timePicker: string;
	darkMode: boolean;
	landscapeMode: boolean;
	// 'v2', or 'v1' (the original interface) for the users of the former versions, see GlobalService.uiVersion
	uiVersion: string;
	// Users of the former versions are told once about the V2
	newUiPopupSeen: boolean;
	eventColors: IEventPalettes;
}
