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
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
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
                    String path = call.getString("path");
                    String base64Data = call.getString("base64Data");
                    OutputStream os = getContext().getContentResolver().openOutputStream(uri);

                    if (os != null) {
                        if (path != null && !path.isEmpty()) {
                            // Copy from file path
                            java.io.File sourceFile = new java.io.File(Uri.parse(path).getPath());
                            java.io.InputStream is = new java.io.FileInputStream(sourceFile);
                            byte[] buffer = new byte[1024];
                            int length;
                            while ((length = is.read(buffer)) > 0) {
                                os.write(buffer, 0, length);
                            }
                            is.close();
                        } else if (base64Data != null && !base64Data.isEmpty()) {
                            // Write base64 data
                            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                            os.write(data);
                        } else {
                            os.close();
                            call.reject("No data provided (path or base64Data)");
                            return;
                        }
                        
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
