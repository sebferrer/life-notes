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
	showDeveloperMode: boolean;
	showAdvancedSettings: boolean;
	calendarStartOnSunday: boolean;
	calendarBlockView: boolean;
	painPalette: string;
	autoCalculateOverview: boolean;
	autoOverviewPopupSeen: boolean;
}
