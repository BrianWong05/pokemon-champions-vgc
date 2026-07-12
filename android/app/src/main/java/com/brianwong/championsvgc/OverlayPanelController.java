package com.brianwong.championsvgc;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Second overlay window hosting the app's /overlay route. Window states:
 * hidden (removed), strip (short docked bottom bar, not focusable),
 * panel (fullscreen, focusable). The web layer drives all transitions.
 */
public class OverlayPanelController {
    private final ScreenCaptureService service;
    private final Bridge bridge;
    private final WindowManager wm;
    private final Handler main = new Handler(Looper.getMainLooper());
    private WebView webView;
    private boolean attached = false;
    private volatile String pendingFrame;

    public OverlayPanelController(ScreenCaptureService service, Bridge bridge) {
        this.service = service;
        this.bridge = bridge;
        wm = (WindowManager) service.getSystemService(Context.WINDOW_SERVICE);
        createWebView();
    }

    /** Builds (or rebuilds after a renderer crash) the panel WebView. Main thread only. */
    private void createWebView() {
        webView = new WebView(service);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                main.post(OverlayPanelController.this::destroy);
                return true;
            }
        });
        webView.addJavascriptInterface(new JsBridge(), "OverlayBridge");
        webView.setOnKeyListener((v, keyCode, event) -> {
            if (keyCode == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                eval("window.__overlayBack && window.__overlayBack();");
                return true;
            }
            return false;
        });
        String base = bridge.getAppUrl().replaceAll("/+$", "");
        // The bundle must be built with `--mode capacitor` (Vite base `/`) — use
        // `npm run sync:android` — or neither the app nor `/overlay` resolves.
        webView.loadUrl(base + "/overlay");
    }

    /** Bubble tap: capture BEFORE any window changes so the frame is clean. */
    public void onBubbleTap() {
        // Recreate the panel WebView if a prior renderer crash destroyed it. State
        // stays "hidden"; the web layer drives the window state after it loads.
        if (webView == null) createWebView();
        if (attached) {
            // The docked strip is inside the mirrored display: its sprite tiles can
            // pollute team-preview detection. Blink it away for the tap capture.
            main.post(() -> { if (webView != null) webView.setVisibility(View.INVISIBLE); });
            new Thread(() -> {
                try { Thread.sleep(280); } catch (InterruptedException ignored) {}
                pendingFrame = service.captureLatestPng();
                main.post(() -> { if (webView != null) webView.setVisibility(View.VISIBLE); });
                eval("window.__overlayBubbleTap && window.__overlayBubbleTap();");
            }).start();
            return;
        }
        pendingFrame = service.captureLatestPng();
        // evaluateJavascript on a just-rebuilt, still-loading page can drop this
        // call — acceptable: the overlay's mount effect restores window/tag state
        // and the next tap works.
        eval("window.__overlayBubbleTap && window.__overlayBubbleTap();");
    }

    private void eval(String js) {
        main.post(() -> { if (webView != null) webView.evaluateJavascript(js, null); });
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v,
                service.getResources().getDisplayMetrics());
    }

    private WindowManager.LayoutParams paramsFor(String s) {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        if ("panel".equals(s)) {
            // No FLAG_LAYOUT_IN_SCREEN: the window fits inside the status/nav
            // insets so the chrome bar is never buried under the phone's top bar.
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    type,
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                    PixelFormat.TRANSLUCENT);
            lp.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
            return lp;
        }
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                dp(64),
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.BOTTOM;
        return lp;
    }

    private void applyWindowState(String s) {
        if (webView == null) return;
        if (attached) { try { wm.removeView(webView); } catch (Exception ignored) {} attached = false; }
        if (!"hidden".equals(s)) {
            wm.addView(webView, paramsFor(s));
            attached = true;
        }
        service.setBubbleVisible(!"panel".equals(s));
    }

    public void destroy() {
        if (attached) { try { wm.removeView(webView); } catch (Exception ignored) {} attached = false; }
        if (webView != null) { webView.destroy(); webView = null; }
        // A renderer crash in panel state leaves the bubble hidden; restore it
        // so the next tap can rebuild the WebView (teardown removes it anyway).
        service.setBubbleVisible(true);
    }

    private class JsBridge {
        @JavascriptInterface
        public String captureFrame() { return pendingFrame; }

        @JavascriptInterface
        public String blinkAndCapture() {
            // Runs on the WebView's JS-bridge thread, never the UI thread.
            main.post(() -> { if (webView != null) webView.setVisibility(View.INVISIBLE); });
            try { Thread.sleep(300); } catch (InterruptedException ignored) {}
            String png = service.captureLatestPng();
            main.post(() -> { if (webView != null) webView.setVisibility(View.VISIBLE); });
            pendingFrame = png;
            return png;
        }

        @JavascriptInterface
        public void setWindowState(String s) { main.post(() -> applyWindowState(s)); }

        @JavascriptInterface
        public void setBubbleTag(String tag) { main.post(() -> service.setBubbleTag(tag)); }
    }
}
