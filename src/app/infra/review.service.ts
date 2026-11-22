import { Injectable } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { Capacitor } from '@capacitor/core';
import { forkJoin, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { DbContext } from './database';
import { GlobalService } from './global.service';
import { SettingsService } from './settings.service';
import InAppReview from './in-app-review-plugin';
import { ICustomEvent } from '../models/customEvent.model';
import { isGoodMomentForReview, isReviewPromptDue } from '../models/review-prompt.model';
import { BottomSheetReviewPromptComponent } from '../ui/bottom-sheet/bottom-sheet-review-prompt';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.sebferrer.life_notes';

// Invitation to rate the app on Google Play, shown ONCE in the life of the app, whatever the answer:
// - only on Android, to the users who know the app (see REVIEW_PROMPT_RULES), never in a session where the app
//   already opened a dialog by itself (update notice, backup reminder...)
// - right after an event was added, the end of a task, unless it was a strong symptom
// - a sheet says why, that it won't come back, that there is no hurry for a new user and where to rate it later.
//   Its button opens the card of Google Play over the app (In-App Review API), or the page of the store when
//   Google Play doesn't show it.
// The card of Google Play can't be opened from a button anywhere else: Google Play shows it a limited number of
// times and silently ignores the other requests. The permanent buttons open the page of the store (openStorePage).
@Injectable({ providedIn: 'root' })
export class ReviewService {

	// The saved event appears in the timeline first
	private readonly DELAY_AFTER_ADD = 1200;
	// A review flow ending sooner was not shown by Google Play: nobody rates an app in less than a second
	private readonly MIN_SHOWN_FLOW_DURATION = 1000;

	// Checked at most once per session: the answer only changes from one day to the next
	private checked = false;
	private checking = false;
	private skippedSession = false;

	constructor(
		private readonly settingsService: SettingsService,
		private readonly dbContext: DbContext,
		private readonly globalService: GlobalService,
		private readonly bottomSheet: MatBottomSheet,
		private readonly dialog: MatDialog
	) { }

	private get nativeAndroid(): boolean {
		return Capacitor.getPlatform() === 'android';
	}

	// The app opened a dialog by itself at startup: that's enough for this session
	public skipThisSession(): void {
		this.skippedSession = true;
	}

	// Developer mode, once the date of the invitation is reset: it may come at the next event added, right away
	public resetSession(): void {
		this.checked = false;
		this.skippedSession = false;
	}

	public onEventAdded(event: ICustomEvent): void {
		if (!this.nativeAndroid || this.skippedSession || this.checked || this.checking
			|| !isGoodMomentForReview(event, this.globalService.isScaleInverted(event.key))) {
			return;
		}
		this.checking = true;
		forkJoin([
			this.settingsService.getSettings(),
			// Ids only: the days themselves are not read
			from(this.dbContext.daysCollection.allDocs()).pipe(map(result => result.rows.map((row: any) => row.id as string)))
		]).subscribe(([settings, dayIds]) => {
			this.checking = false;
			this.checked = true;
			if (settings == null || !isReviewPromptDue({
				alreadyShown: settings.reviewPromptDate > 0,
				firstStart: settings.firstStart,
				dayIds,
				today: new Date()
			})) {
				return;
			}
			setTimeout(() => this.showOnce(), this.DELAY_AFTER_ADD);
		}, () => {
			this.checking = false;
			this.checked = true;
		});
	}

	private showOnce(): void {
		// Something else is open meanwhile (the help of a first symptom, another sheet): at the next event added
		if (this.dialog.openDialogs.length > 0 || this.bottomSheet._openedBottomSheetRef != null) {
			this.checked = false;
			return;
		}
		this.settingsService.setReviewPromptDate(Date.now()).subscribe();
		// The card of Google Play is ready when the user answers
		InAppReview.prepare().catch(() => { });
		this.openPrompt();
	}

	// Also opened from the developer mode, to preview it: then it is not recorded as shown
	public openPrompt(): void {
		this.bottomSheet.open(BottomSheetReviewPromptComponent, {
			panelClass: ['event-bottom-sheet', 'review-prompt-panel']
		}).afterDismissed().subscribe(answer => {
			if (answer === 'rate') {
				this.requestReview();
			}
		});
	}

	// The card of Google Play over the app, or the page of the store when Google Play doesn't show it (the user
	// already rated the app or reached the quota, an app not installed from Google Play, no Google Play at all)
	private async requestReview(): Promise<void> {
		if (!this.nativeAndroid) {
			return this.openStorePage();
		}
		try {
			const result = await InAppReview.requestReview();
			if (result.duration < this.MIN_SHOWN_FLOW_DURATION) {
				await this.openStorePage();
			}
		} catch {
			await this.openStorePage();
		}
	}

	public async openStorePage(): Promise<void> {
		if (this.nativeAndroid) {
			try {
				await InAppReview.openStore();
				return;
			} catch {
				// The browser below
			}
		}
		window.open(STORE_URL, '_system');
	}
}
