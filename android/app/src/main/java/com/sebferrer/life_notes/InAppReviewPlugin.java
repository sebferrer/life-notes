package com.sebferrer.life_notes;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

// Rating of the app with the Google Play In-App Review API: the card of Google Play (stars, then an optional
// comment) shown over the app, without opening the store. See ReviewService on the web side.
// Google Play decides alone whether the card is shown (a quota per user, an app not installed from Google Play...)
// and never says it: requestReview gives the duration of the flow, a flow ending at once was not shown.
@CapacitorPlugin(name = "InAppReview")
public class InAppReviewPlugin extends Plugin {

    private ReviewManager manager;
    // Asked in advance by prepare, so that the card opens without delay. Valid for one launch only.
    private ReviewInfo reviewInfo;

    @Override
    public void load() {
        manager = ReviewManagerFactory.create(getContext());
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        manager.requestReviewFlow().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                reviewInfo = task.getResult();
                call.resolve();
            } else {
                reviewInfo = null;
                call.reject("Review flow unavailable", task.getException());
            }
        });
    }

    @PluginMethod
    public void requestReview(PluginCall call) {
        if (reviewInfo != null) {
            ReviewInfo info = reviewInfo;
            reviewInfo = null;
            launch(call, info);
            return;
        }
        manager.requestReviewFlow().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                launch(call, task.getResult());
            } else {
                call.reject("Review flow unavailable", task.getException());
            }
        });
    }

    private void launch(PluginCall call, ReviewInfo info) {
        getActivity().runOnUiThread(() -> {
            long start = SystemClock.elapsedRealtime();
            manager.launchReviewFlow(getActivity(), info).addOnCompleteListener(task -> {
                JSObject result = new JSObject();
                result.put("duration", SystemClock.elapsedRealtime() - start);
                call.resolve(result);
            });
        });
    }

    // Page of the app in the Play Store app, in the browser without it
    @PluginMethod
    public void openStore(PluginCall call) {
        String packageName = getContext().getPackageName();
        Intent store = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + packageName));
        store.setPackage("com.android.vending");
        try {
            getActivity().startActivity(store);
            call.resolve();
            return;
        } catch (ActivityNotFoundException e) {
            // No Play Store on the phone
        }
        Intent browser = new Intent(Intent.ACTION_VIEW,
                Uri.parse("https://play.google.com/store/apps/details?id=" + packageName));
        try {
            getActivity().startActivity(browser);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("No app to open the store page", e);
        }
    }
}
