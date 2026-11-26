import { Injectable, NgZone } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

// Frames given to a page to draw what it shows again before it is scrolled back (about 2 s)
const MAX_SCROLL_FRAMES = 120;
// Frames the position must stay right before it is left alone (the last parts of the page drawn)
const STABLE_SCROLL_FRAMES = 3;

// Where the user was on a page (the day at the top of the timeline, the month of the calendar...), found again when
// they come back to it with a back button (of the app, of Android, of the browser). Kept by entry of the history, as
// the router does with the scroll positions (RouterScroller): the id of the navigation that displayed a page is saved
// in its entry of the history, and given back (restoredState) when this entry is displayed again. A page opened
// another way (toolbar, link) starts afresh.
@Injectable({
	providedIn: 'root'
})
export class NavigationMemoryService {

	// By page and id of the navigation that displayed it
	private readonly states = new Map<string, any>();
	// Navigation that displayed the current page
	private currentId = 0;
	// The navigation in progress goes back (or forward) to an entry of the history: the navigation that displayed it
	private restoredId: number = null;

	constructor(
		router: Router,
		private zone: NgZone
	) {
		router.events.subscribe(event => {
			if (event instanceof NavigationStart) {
				this.restoredId = event.navigationTrigger !== 'imperative' && event.restoredState != null
					? event.restoredState.navigationId : null;
			} else if (event instanceof NavigationEnd) {
				this.currentId = event.id;
			}
		});
	}

	// What the current page shows, saved as it is left (NavigationStart: the page is still there, not scrolled yet)
	public save<T>(page: string, state: T): void {
		this.states.set(this.key(page, this.currentId), state);
	}

	// While the page is created: its state when the user goes back to it, null when it is opened another way
	public restore<T>(page: string): T {
		if (this.restoredId == null) {
			return null;
		}
		const key = this.key(page, this.restoredId);
		const state = this.states.get(key);
		// Saved again under the id of this navigation when the page is left
		this.states.delete(key);
		return state != null ? state : null;
	}

	// Scrolls the window to the position given by target once the page can show it: the content of a page comes from
	// the database after its creation. target returns null while what it needs isn't drawn yet. Scrolled again while
	// the page is still being drawn (charts, fonts), until the position stays right.
	public scrollWhenReady(target: () => number): void {
		this.zone.runOutsideAngular(() => {
			let frames = 0;
			let stable = 0;
			const attempt = () => {
				frames++;
				const y = target();
				const max = document.documentElement.scrollHeight - window.innerHeight;
				if (y != null && (y <= max + 1 || frames >= MAX_SCROLL_FRAMES)) {
					if (Math.abs(window.scrollY - y) > 1) {
						window.scrollTo(0, y);
						stable = 0;
					} else if (++stable >= STABLE_SCROLL_FRAMES) {
						return;
					}
				}
				if (frames < MAX_SCROLL_FRAMES) {
					requestAnimationFrame(attempt);
				}
			};
			requestAnimationFrame(attempt);
		});
	}

	private key(page: string, navigationId: number): string {
		return page + ':' + navigationId;
	}
}
