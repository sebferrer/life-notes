import { defineConfig } from '@playwright/test';
import { execFileSync } from 'child_process';
import { cpus } from 'os';

// Regression tests, run against the production build (www) served locally. See tests/README.md.
const PORT = 4300;

// Browsers run in parallel. Playwright's default (half the logical cores: 6 Chromes on a 12-thread CPU) keeps
// the processor at 100%; 3 keep it under about 80%, slower but the computer stays usable. PW_WORKERS=n for one run.
export const TEST_WORKERS = Number(process.env.PW_WORKERS) || 3;

// Hard ceiling of the processor, whatever the number of Chromes (each one is 5 or 6 processes: browser, GPU,
// renderers...): on Windows, the runner of the tests only uses TEST_CPU_THREADS logical processors (7 of 12, 58 %),
// and every process it starts inherits it (workers, Chromes, server of the tests). The rest of the 80 % is left to
// what runs meanwhile (ng serve compiling, the editor): measured, 9 threads for the tests still made 83 % on average.
// Set once, in the runner: the workers load this file again. PW_CPU_THREADS=n for one run.
export const TEST_CPU_THREADS = Math.min(cpus().length,
	Number(process.env.PW_CPU_THREADS) || Math.max(1, Math.floor(cpus().length * 0.6)));
if (process.platform === 'win32' && !process.env.PW_CPU_LIMITED) {
	process.env.PW_CPU_LIMITED = String(TEST_CPU_THREADS);
	try {
		execFileSync('powershell.exe', ['-NoProfile', '-Command',
			`(Get-Process -Id ${process.pid}).ProcessorAffinity = ${2 ** TEST_CPU_THREADS - 1}`], { stdio: 'ignore' });
	} catch {
		// Without the ceiling rather than without the tests
	}
}

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
	workers: TEST_WORKERS,
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
