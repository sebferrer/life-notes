package com.sebferrer.life_notes;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FileSaverPlugin.class);
        registerPlugin(InAppReviewPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
