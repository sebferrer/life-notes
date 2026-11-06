import { test, expect, App, YESTERDAY } from '../support/app';
import { Page } from '@playwright/test';

// Settings > Import / Export > Export as PDF, for the current month (March 2026)
async function openReport(app: App, page: Page): Promise<void> {
	await app.goToSettings('Importer / Exporter');
	await page.locator('mat-list-option', { hasText: 'Exporter en PDF' }).click();
	await page.locator('.export-pdf .confirm-button').click();
	await expect(page).toHaveURL(/#\/monthlyreport\/2026-0?3$/);
}

// Save button of the report: the PDF downloaded by the browser
async function savePdf(page: Page): Promise<Buffer> {
	const [download] = await Promise.all([
		page.waitForEvent('download', { timeout: 30_000 }),
		page.locator('.fab-container button').nth(1).click()
	]);
	expect(download.suggestedFilename()).toBe('LifeNotes_Report_2026-3.pdf');
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks);
}

test.describe('PDF report', () => {

	test.beforeEach(async ({ app }) => {
		await app.start();
		await app.addSymptom('Tête');
		await app.targetSymptom('Tête');
		await app.goToTimeline();
		await app.addEvent('med', { key: 'Doliprane', quantity: '1000' });
		await app.setDayIntensity(6);
	});

	test('in V2, each symptom is shown as in the calendar', async ({ app, page }) => {
		// March 1st, 2026 is a Sunday: 6 days of February before it in a week starting on Monday
		await app.goToSettings('Apparence');
		await app.setToggle('Commencer la semaine par dimanche', false);
		await openReport(app, page);

		const report = page.locator('.modern-report');
		await expect(report.locator('.report-title')).toHaveText('mars 2026');
		const symptom = report.locator('.sympmtom-container', { hasText: 'Tête' });
		await expect(symptom.locator('.weekday')).toHaveText(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
		await expect(symptom.locator('.day-cell.empty')).toHaveCount(6);
		const days = symptom.locator('.day-cell:not(.empty)');
		await expect(days).toHaveCount(31);
		await expect(days.nth(17)).toHaveText('18');
		await expect(days.nth(17)).toHaveClass(/color-pain-[1-5]/);
		await expect(days.nth(16)).toHaveClass(/color-default/);
		// Days to come: neutral, as in the calendar
		await expect(symptom.locator('.day-cell.future')).toHaveCount(13);
		await expect(days.nth(18)).toHaveClass(/future/);
		// Legend of the doughnut: number of days of each level
		await expect(symptom.locator('.legend-row').first()).toContainText('30');

		await expect(report.locator('.stat-card', { hasText: 'Médicaments les plus utilisés' })).toContainText('Doliprane');
		await expect(report.locator('.classic-report')).toHaveCount(0);
	});

	test('in V2, the report is saved as a PDF', async ({ app, page }) => {
		await app.addEvent('log', { key: 'Rendez-vous médecin' }, YESTERDAY);
		await openReport(app, page);
		await expect(page.locator('.modern-report .stats-container')).toContainText('Rendez-vous médecin');
		const pdf = await savePdf(page);
		expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
		await expect(page.locator('.loading-overlay')).toBeHidden();
	});

	test('in V1, the classic report is kept', async ({ app, page }) => {
		await app.setUiVersion('V1');
		await openReport(app, page);
		await expect(page.locator('.classic-report .sympmtom-container label').filter({ hasText: /\S/ })).toHaveText(['Tête']);
		await expect(page.locator('.modern-report')).toHaveCount(0);
		const pdf = await savePdf(page);
		expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
	});
});

test('the report of a month without data says so', async ({ app, page }) => {
	await app.start();
	await openReport(app, page);
	await expect(page.locator('.modern-report .report-empty')).toHaveText('Aucune donnée ce mois-ci.');
});
