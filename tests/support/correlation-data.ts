import { expect, App, TODAY, shiftDate } from './app';

// Days before today with entries giving two clear links: a curry for dinner followed by a stomach ache within a few
// hours, and short nights followed by headaches. Everything else is random (fixed seed).
export function correlationDays(count: number, symptoms: { head: string, stomach: string }): any[] {
	let seed = 12345;
	const random = () => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed / 2147483648;
	};
	const days: any[] = [];
	let previousBedTime = '23:00';
	for (let i = count; i >= 1; i--) {
		const date = shiftDate(TODAY, -i);
		const day: any = {
			_id: date, date, symptomOverviews: [], symptoms: [], logs: [], meds: [], sports: [], customs: [],
			meals: [{ type: 'meal', key: 'Tartines', time: '08:00', detail: '' }],
			wakeUp: '07:00', goToBed: ''
		};
		const curry = i % 5 === 0;
		day.meals.push({ type: 'meal', key: curry ? 'Curry' : (random() < 0.5 ? 'Pâtes' : 'Salade'), time: '20:00', detail: '' });
		if (random() < 0.3) {
			day.sports.push({ type: 'sport', key: 'Course', time: '18:00', detail: '' });
		}
		if (curry ? i % 15 !== 0 : random() < 0.08) {
			day.symptoms.push({
				type: 'symptom', key: symptoms.stomach,
				logs: [{ type: 'symptomLog', key: symptoms.stomach, time: curry ? '22:30' : '15:00', pain: 3, detail: '' }]
			});
		}
		// Short night: in bed after midnight the day before
		const shortNight = previousBedTime < '12:00';
		if (random() < (shortNight ? 0.75 : 0.1)) {
			day.symptomOverviews.push({ key: symptoms.head, pain: 3 });
		}
		previousBedTime = random() < 0.35 ? '01:00' : '22:30';
		day.goToBed = previousBedTime;
		days.push(day);
	}
	return days;
}

// A backup of the current app (it must have the symptoms Tête and Ventre, and a day: nothing is saved without any)
// with these days instead of its own ones, imported
export async function importCorrelationDays(app: App, count: number): Promise<void> {
	const { content } = await app.exportBackup();
	const key = (label: string) => content.symptoms.find((s: any) => s.label === label).key;
	content.days = correlationDays(count, { head: key('Tête'), stomach: key('Ventre') });
	await app.importBackup({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(content)) });
	await app.page.locator('.import-confirm .confirm-button').click();
	const snackBar = app.page.locator('simple-snack-bar');
	await expect(snackBar).toContainText('Les données ont été importées avec succès');
	// It would hide a part of the screens
	await snackBar.locator('button').click();
	await expect(snackBar).toHaveCount(0);
}

export const CORRELATIONS_SETTING = 'Corrélations (expérimental)';

// Settings > Advanced, the advanced settings shown first (in Customization)
export async function openAdvancedSettings(app: App): Promise<void> {
	await app.goToSettings('Personnalisation');
	await app.setToggle('Afficher les paramètres avancés', true);
	// Its own header, not the one of the manual backup inside it
	await app.settingsPanel('Avancé').locator('mat-expansion-panel-header.main-header').click();
}

// The correlations are off by default (experimental): turned on in the advanced settings, their warning accepted
export async function enableCorrelations(app: App): Promise<void> {
	await openAdvancedSettings(app);
	const toggle = app.settingsToggle(CORRELATIONS_SETTING);
	await expect(toggle.locator('input')).not.toBeChecked();
	await toggle.locator('label').click();
	const warning = app.page.locator('.correlations-warning');
	await warning.locator('.confirm-button').click();
	await expect(warning).toHaveCount(0);
	await expect(toggle.locator('input')).toBeChecked();
}

// Manage > Symptoms > Correlations, once analyzed
export async function openCorrelations(app: App): Promise<void> {
	await app.goToManage('symptomLog');
	await app.page.locator('.manage-list-header .correlations-button').click();
	await expect(app.page).toHaveURL(/#\/correlations$/);
	await expect(app.page.locator('.loading')).toHaveCount(0, { timeout: 20_000 });
}
