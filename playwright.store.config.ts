import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// Screenshots of the Google Play listing (not a test): npm run screenshots:store. See tests/store/README.md.
export default defineConfig({
	...baseConfig,
	testDir: './tests/store',
	timeout: 300_000,
	fullyParallel: false,
	retries: 0,
	reporter: [['list']],
	projects: [{ name: 'store', testDir: './tests/store' }]
});
