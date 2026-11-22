import { registerPlugin } from '@capacitor/core';

// Google Play In-App Review API (android/app/src/main/java/com/sebferrer/life_notes/InAppReviewPlugin.java)
export interface InAppReviewPlugin {
	// Asks Google Play for the review flow in advance, so that its card opens at once
	prepare(): Promise<void>;
	// Shows the card of Google Play over the app (stars, then an optional comment). Google Play may not show it
	// (quota per user, app not installed from Google Play...) and doesn't say so: duration is how long the flow
	// lasted, in ms.
	requestReview(): Promise<{ duration: number }>;
	// Page of the app in the Play Store app (in the browser without it)
	openStore(): Promise<void>;
}

const InAppReview = registerPlugin<InAppReviewPlugin>('InAppReview');

export default InAppReview;
