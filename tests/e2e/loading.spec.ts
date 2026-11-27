import { test, expect, App } from '../support/app';

// While a page loads: a mock-up of the page in the V2 (skeleton), the spinner in the V1 (see PageSkeletonComponent).
// A page is held in its loading state by App.holdLoading.

interface ILoadingPage {
	name: string;
	open: (app: App) => Promise<void>;
	host: string;
	property: string;
	kind: string;
	// Shapes of the mock-up and how many of them
	shapes: string;
	count: number;
	// What the page shows outside of its content, kept above the mock-up
	kept?: string;
}

const PAGES: ILoadingPage[] = [
	{
		name: 'timeline', open: app => app.goToTimeline(), host: 'app-timeline', property: 'daysContents$', kind: 'timeline',
		shapes: '.sk-day', count: 3
	},
	{
		name: 'calendar', open: app => app.goToCalendar(), host: 'app-calendar', property: 'overviews$', kind: 'calendar',
		shapes: '.sk-calendar .sk-cell', count: 35
	},
	{
		name: 'Year in Pixels', open: async app => {
			// Away from the calendar held in its loading state first
			await app.goToTimeline();
			await app.goToCalendar();
			await app.page.locator('.year-in-pixels-button').click();
			await expect(app.page.locator('.pixel').first()).toBeVisible();
		}, host: 'app-year-in-pixels', property: 'monthDays', kind: 'year', shapes: '.sk-pixel', count: 12 * 31,
		kept: '.pixels-card .year-header'
	},
	{
		name: 'list of symptoms', open: app => app.goToManage('symptomLog'), host: 'app-symptoms', property: 'symptoms$',
		kind: 'list', shapes: '.sk-item', count: 5, kept: '.manage-list-title'
	},
	{
		name: 'list of medications', open: app => app.goToManage('med'), host: 'app-meds', property: 'meds$', kind: 'list',
		shapes: '.sk-item', count: 5, kept: '.manage-list-title'
	},
	{
		name: 'correlations', open: async app => {
			await app.page.goto('/#/correlations');
			await expect(app.page.locator('.state-card')).toBeVisible();
		}, host: 'app-correlations', property: 'analysis', kind: 'correlations', shapes: '.sk-correlation', count: 3,
		kept: '.correlations-page .intro'
	}
];

test.describe('Loading of the pages', () => {

	test('V2: a mock-up of each page while it loads, never a spinner', async ({ app, page }) => {
		await app.start();
		await app.addSymptom('Tête');
		for (const loading of PAGES) {
			await loading.open(app);
			await app.holdLoading(loading.host, loading.property);
			const skeleton = page.locator(`app-page-skeleton .page-skeleton.kind-${loading.kind}`);
			await expect(skeleton, loading.name).toBeVisible();
			await expect(skeleton.locator(loading.shapes), loading.name).toHaveCount(loading.count);
			await expect(page.locator('app-spinner'), loading.name).toHaveCount(0);
			if (loading.kept) {
				await expect(page.locator(loading.kept), loading.name).toBeVisible();
			}
		}
		// The analysis of the correlations says what it is doing
		await expect(page.locator('app-page-skeleton.loading .analyzing')).toHaveText('Analyse de vos données…');
	});

	test('V2: the mock-up appears after 150 ms only, its light runs apart from the page, the page then fades in',
		async ({ app, page }) => {
		await app.start();
		// Loaded: the page fades in
		await app.goToTimeline();
		expect(await page.locator('.timeline-grid').evaluate(element => getComputedStyle(element).animationName))
			.toBe('page-content-in');

		await app.holdLoading('app-timeline', 'daysContents$');
		const skeleton = page.locator('.page-skeleton');
		await expect(skeleton).toBeVisible();
		const animations = await skeleton.evaluate(root => document.getAnimations()
			.filter(animation => root.contains((animation.effect as KeyframeEffect).target))
			.map(animation => {
				const effect = animation.effect as KeyframeEffect;
				const timing = effect.getComputedTiming();
				return {
					name: (animation as CSSAnimation).animationName,
					target: (effect.target as Element).className + (effect.pseudoElement || ''),
					delay: timing.delay,
					fill: timing.fill,
					iterations: timing.iterations,
					properties: [...new Set(effect.getKeyframes().flatMap(frame => Object.keys(frame)))]
						.filter(key => !['offset', 'computedOffset', 'easing', 'composite'].includes(key))
				};
			}));
		// Shown after 150 ms (a quick load shows the page at once), faded in
		const appear = animations.find(animation => animation.name === 'page-skeleton-in');
		expect(appear).toEqual(expect.objectContaining({ delay: 150, fill: 'both', properties: ['opacity'] }));
		// A light sweeping each day card, endlessly
		const shine = animations.filter(animation => animation.name === 'page-skeleton-shine');
		expect(shine).toHaveLength(3);
		expect(shine[0]).toEqual(expect.objectContaining({ iterations: Infinity, properties: ['transform'] }));
		expect(shine[0].target).toContain('::after');
		// Only opacity and transform: the compositor runs them, so they don't freeze while the page loads
		expect(animations.flatMap(animation => animation.properties).every(property => ['opacity', 'transform'].includes(property)))
			.toBe(true);
	});

	test('V1: the spinner, as before, and no fading', async ({ app, page }) => {
		await app.start();
		await app.setUiVersion('V1');
		await app.goToTimeline();
		expect(await page.locator('.timeline-grid').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
		await app.holdLoading('app-timeline', 'daysContents$');
		await expect(page.locator('app-page-skeleton app-spinner.view-spinner')).toBeVisible();
		await expect(page.locator('.page-skeleton')).toHaveCount(0);
		await app.goToManage('med');
		await app.holdLoading('app-meds', 'meds$');
		await expect(page.locator('app-page-skeleton app-spinner.view-spinner')).toBeVisible();
		await expect(page.locator('.page-skeleton')).toHaveCount(0);
	});
});
