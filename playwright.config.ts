import { defineConfig } from '@playwright/test';

// Regression tests, run against the production build (www) served locally. See tests/README.md.
const PORT = 4300;

const phone = {
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true
};

export default defineConfig({
	testDir: './tests',
	timeout: 60_000,
	expect: {
		timeout: 10_000,
		toHaveScreenshot: {
			// Antialiasing differences between runs
			maxDiffPixelRatio: 0.002,
			animations: 'disabled',
			caret: 'hide'
		}
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/report' }]],
	outputDir: 'tests/results',
	snapshotPathTemplate: '{testDir}/{testFileDir}/__screenshots__/{testFileName}/{arg}{ext}',
	use: {
		baseURL: `http://localhost:${PORT}`,
		// Installed Google Chrome; PW_CHANNEL=chromium uses the browser of "npx playwright install chromium"
		channel: process.env.PW_CHANNEL ?? 'chrome',
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		// Pure logic of src (no browser)
		{ name: 'unit', testDir: './tests/unit' },
		// User flows in the app
		{ name: 'e2e', testDir: './tests/e2e', use: phone },
		// Screens compared to the approved screenshots of tests/visual/__screenshots__
		{ name: 'visual', testDir: './tests/visual', use: phone }
	],
	webServer: {
		command: `node tests/support/serve.mjs ${PORT}`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000
	}
});
