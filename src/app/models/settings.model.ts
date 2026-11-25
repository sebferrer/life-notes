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
	// No longer used (its popup was removed): kept so the settings and backups stay readable by the 0.3.7
	autoOverviewPopupSeen: boolean;
	timePicker: string;
	darkMode: boolean;
	landscapeMode: boolean;
	// 'v2', or 'v1' (the original interface) for the users of the former versions, see GlobalService.uiVersion
	uiVersion: string;
	// 'bars' or 'curves': charts of the sleep shown first (V2)
	sleepChartMode: string;
	// Users of the former versions are told once about the V2
	newUiPopupSeen: boolean;
	eventColors: IEventPalettes;
	// When the invitation to rate the app was shown (ms), 0 if never: it is shown only once (see ReviewService)
	reviewPromptDate: number;
	// V2: the buttons opening the correlations (list of symptoms, statistics of a symptom). Missing in the settings
	// saved before them: shown.
	showCorrelations?: boolean;
}
