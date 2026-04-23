package com.gamefolio.app;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        boolean isDebuggable =
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebuggable);
        super.onCreate(savedInstanceState);
    }
}
