import { defineConfig } from '@playwright/test';
import { COMPAT_PORT as PORT, compatBuildsFile } from './tests/compat/support/builds';

// Compatibility of the backups between the published version (V1) and the current one (V2), see tests/compat/README.md.
// The two builds come from tests/compat/build.mjs, served on a single origin by tests/compat/serve.mjs.

export default defineConfig({
	testDir: './tests/compat',
	// Imports of a thousand days, in two apps
	timeout: 240_000,
	expect: { timeout: 15_000 },
	fullyParallel: true,
	workers: process.env.COMPAT_WORKERS ? Number(process.env.COMPAT_WORKERS) : 4,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/compat/report' }]],
	outputDir: 'tests/compat/results',
	use: {
		baseURL: `http://localhost:${PORT}`,
		channel: process.env.PW_CHANNEL ?? 'chrome',
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris',
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		acceptDownloads: true,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: `node tests/compat/serve.mjs ${PORT} "${compatBuildsFile()}"`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: false,
		timeout: 30_000
	}
});
