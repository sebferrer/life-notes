package com.sebferrer.life_notes;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.activity.result.ActivityResult;
import java.io.OutputStream;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename");
        String contentType = call.getString("contentType", "application/octet-stream");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(contentType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        startActivityForResult(call, intent, "handleSaveFileResult");
    }

    @ActivityCallback
    private void handleSaveFileResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                try {
                    String base64Data = call.getString("base64Data");
                    byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                    
                    OutputStream os = getContext().getContentResolver().openOutputStream(uri);
                    if (os != null) {
                        os.write(data);
                        os.close();
                        JSObject ret = new JSObject();
                        ret.put("uri", uri.toString());
                        call.resolve(ret);
                    } else {
                        call.reject("Could not open output stream");
                    }
                } catch (Exception e) {
                    call.reject("Error writing file: " + e.getMessage());
                }
            } else {
                call.reject("No URI returned");
            }
        } else {
            call.reject("User cancelled");
        }
    }
}
