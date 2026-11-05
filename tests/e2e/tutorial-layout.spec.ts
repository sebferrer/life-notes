import { test, expect, TODAY } from '../support/app';

// Arrows expected in each illustrated slide (see SCENE_ARROWS in tutorial-scene.component.ts)
const SCENE_ARROWS = {
	'create-symptom': 2, 'target-symptom': 2, 'day-overview': 2, 'calendar': 1, 'add-event': 2, 'edit-event': 2,
	'manage': 1, 'settings': 1, 'backup-why': 0, 'backup-save': 2, 'backup-restore': 3, 'pdf-report': 2
};

// A translation key shown instead of its text (e.g. TUTORIAL_CALENDAR_TITLE)
const UNTRANSLATED = /\b[A-Z][A-Z0-9]+(_[A-Z0-9]+)+\b/;

const VARIANTS = [
	{ language: 'fr', classic: false },
	{ language: 'en', classic: false },
	// The tutorial follows the version of the interface: the scenes showing a day have a V1 design too
	{ language: 'fr', classic: true }
] as const;

for (const { language, classic } of VARIANTS) {
	test(`tutorial (${language}${classic ? ', classic design' : ''}): every slide is illustrated, linked by arrows and translated`,
		async ({ app, page }) => {
		await app.start(language);
		if (classic) {
			await app.setUiVersion('V1');
		}
		await page.goto('/#/tutorial');
		await expect(page.locator('.scene.classic')).toHaveCount(classic ? Object.keys(SCENE_ARROWS).length : 0);
		await expect(page.locator('ion-slide')).toHaveCount(2 + Object.keys(SCENE_ARROWS).length);

		const scenes = page.locator('app-tutorial-scene');
		await expect(scenes).toHaveCount(Object.keys(SCENE_ARROWS).length);
		for (const [scene, arrows] of Object.entries(SCENE_ARROWS)) {
			const root = page.locator(`.scene-${scene}`);
			await root.scrollIntoViewIfNeeded();
			await expect(root.locator('.arrow-line'), scene).toHaveCount(arrows);
			// Each arrow stays inside its scene
			const viewBox = (await root.locator('svg.arrows').getAttribute('viewBox')).split(' ').map(Number);
			for (const d of await root.locator('.arrow-line').evaluateAll(paths => paths.map(p => p.getAttribute('d')))) {
				const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
				for (let i = 0; i < numbers.length; i += 2) {
					expect(numbers[i], `${scene} x`).toBeGreaterThanOrEqual(-20);
					expect(numbers[i], `${scene} x`).toBeLessThanOrEqual(viewBox[2] + 20);
					expect(numbers[i + 1], `${scene} y`).toBeGreaterThanOrEqual(-20);
					expect(numbers[i + 1], `${scene} y`).toBeLessThanOrEqual(viewBox[3] + 20);
				}
			}
		}
		expect(await page.locator('ion-slides').innerText()).not.toMatch(UNTRANSLATED);
		// No pressure to rate the app before using it
		await expect(page.locator('.slide-text-rateit p').nth(3)).not.toBeEmpty();
	});
}

test('no screen is wider than a small phone', async ({ app, page }) => {
	await page.setViewportSize({ width: 320, height: 640 });
	await app.start();
	await app.addSymptom('Douleurs articulaires chroniques du genou');
	await app.targetSymptom('Douleurs articulaires chroniques du genou');
	await app.goToTimeline();
	await app.addEvent('med', { key: 'Un médicament au nom vraiment très long', quantity: '1000' });

	for (const route of ['/', '/calendar', '/manage', '/symptoms', '/meds', '/settings', '/tutorial', `/${TODAY}`]) {
		await page.goto(`/#${route}`);
		await page.waitForTimeout(500);
		const width = await page.evaluate(() => document.documentElement.scrollWidth);
		expect(width, route).toBeLessThanOrEqual(320);
	}

	// Every toolbar button stays reachable, the symptom name is cut instead
	for (const id of ['timeline', 'calendar', 'manage', 'target-symptom', 'settings']) {
		const box = await page.locator(`#menu-icon-${id}`).boundingBox();
		expect(box.x + box.width, id).toBeLessThanOrEqual(320);
	}
	const label = page.locator('#menu-icon-target-symptom .targetSymptomKey');
	expect(await label.evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true);
});
