# Android Floating Capture (Spec 5, Task 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Verification is manual on the Pixel_6_Pro emulator, not vitest** — each task ends by building/installing the APK and driving the emulator with `adb`.

**Goal:** A floating button that sits over other apps; tapping it screen-captures the current screen (via MediaProjection), runs the existing scan, and brings the calc to the front populated.

**Architecture:** A native **Java** Capacitor plugin `ScreenCapturePlugin` + a foreground `ScreenCaptureService` that holds the MediaProjection, shows the floating overlay button, and captures frames via `VirtualDisplay`+`ImageReader`. The JS `mediaProjectionSource` implements Task 1's `CaptureSource`; on the `overlayTap` event the app captures → `ingestFrame` → feeds the existing `ScanTeamModal`. Built on branch `feat/android-overlay-capture` (Task 1 already present).

**Tech Stack:** Java (Android), Capacitor 8, MediaProjection API, WindowManager overlay, TypeScript/React.

## Global Constraints

- **Android only.** iOS out of scope (companion mode = slice 6).
- **Package/namespace:** `com.brianwong.championsvgc`. Plugin JS name: `ScreenCapture`.
- **SDK:** minSdk 24, compile/target 36. So: `startForeground` with `FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION` (API 29+ 3-arg overload, version-guarded), a **registered `MediaProjection.Callback`** (required Android 14+), and the foreground service **started before** `getMediaProjection`.
- **Java, not Kotlin** — the app module has no Kotlin plugin applied; matching `MainActivity.java` avoids Gradle changes. (Deviation from the spec's "Kotlin"; behavior identical.)
- **Manual-tap only** — no continuous/automatic capture. Feature is Android-native-only (hidden elsewhere).
- **Build recipe (every task's verification):** `npm run build:mobile && npx cap sync android && JAVA_HOME=/Users/brianwong/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ANDROID_HOME=~/Library/Android/sdk ./android/gradlew -p android assembleDebug && ~/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. Use **JDK 21** (not 25).
- **Reuse, don't rebuild:** capture flows into the existing `ingestFrame` (Task 1) + `ScanTeamModal` — no new scan/vision code.
- **FLAG_SECURE viability against the real Champions game is UNVERIFIED** (Task 0 spike deferred). This plan is validated on the emulator against an on-screen screenshot.

---

## File Structure

- **Modify** `android/app/src/main/AndroidManifest.xml` — overlay/foreground/notification permissions + the `<service>` declaration.
- **Create** `android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java` — the Capacitor bridge.
- **Create** `android/app/src/main/java/com/brianwong/championsvgc/ScreenCaptureService.java` — foreground service: MediaProjection + overlay button + frame capture.
- **Modify** `android/app/src/main/java/com/brianwong/championsvgc/MainActivity.java` — register the plugin.
- **Create** `src/features/scan/mediaProjectionSource.ts` — JS `CaptureSource` + typed plugin handle + base64→Blob.
- **Create** `src/features/scan/OneTapCaptureToggle.tsx` — the feature-flagged enable/disable control + overlayTap wiring.
- **Modify** `src/features/scan/ScanTeamModal.tsx` — accept an externally-supplied capture blob.
- **Modify** `src/pages/DamageCalculator/index.tsx` — mount the toggle; feed captured frames to the modal.

---

## Task 1: Plugin skeleton + permissions + registration (bridge works)

Get a callable native plugin with the overlay-permission methods. No capture yet.

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java`
- Modify: `android/app/src/main/java/com/brianwong/championsvgc/MainActivity.java`
- Create: `src/features/scan/mediaProjectionSource.ts`

**Interfaces:**
- Produces (native, callable from JS as plugin `ScreenCapture`):
  - `hasOverlayPermission() -> { granted: boolean }`
  - `requestOverlayPermission() -> {}` (opens the system overlay-permission screen)
  - (stubs, filled in later tasks) `startSession() -> { started: boolean }`, `stopSession() -> {}`, `capture() -> { pngBase64: string, width: number, height: number }`, event `overlayTap`
- Produces (JS): `mediaProjectionSource: CaptureSource` (kind `'mediaProjection'`), `ScreenCapture` typed plugin handle.

- [ ] **Step 1: Add permissions + service to the manifest**

In `android/app/src/main/AndroidManifest.xml`, add these inside `<manifest>` next to the existing `<uses-permission android:name="android.permission.INTERNET" />`:
```xml
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```
And add this `<service>` inside `<application>` (after the `<provider>`):
```xml
        <service
            android:name=".ScreenCaptureService"
            android:exported="false"
            android:foregroundServiceType="mediaProjection" />
```

- [ ] **Step 2: Create the plugin with the overlay-permission methods (stubs for the rest)**

Create `android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java`:
```java
package com.brianwong.championsvgc;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenCapture")
public class ScreenCapturePlugin extends Plugin {

    @PluginMethod
    public void hasOverlayPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", Settings.canDrawOverlays(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void startSession(PluginCall call) {
        call.reject("not implemented yet");
    }

    @PluginMethod
    public void stopSession(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void capture(PluginCall call) {
        call.reject("not implemented yet");
    }
}
```

- [ ] **Step 3: Register the plugin in MainActivity**

Replace `android/app/src/main/java/com/brianwong/championsvgc/MainActivity.java` with:
```java
package com.brianwong.championsvgc;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] **Step 4: Create the JS CaptureSource + typed plugin handle**

Create `src/features/scan/mediaProjectionSource.ts`:
```ts
import { registerPlugin, Capacitor } from '@capacitor/core';
import type { CaptureSource, CapturedFrame } from './captureSource';

export interface ScreenCapturePlugin {
  hasOverlayPermission(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<void>;
  startSession(): Promise<{ started: boolean }>;
  stopSession(): Promise<void>;
  capture(): Promise<{ pngBase64: string; width: number; height: number }>;
  addListener(eventName: 'overlayTap', cb: () => void): Promise<{ remove: () => Promise<void> }>;
}

export const ScreenCapture = registerPlugin<ScreenCapturePlugin>('ScreenCapture');

export function isAndroidNative(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
}

function base64ToBlob(b64: string, type = 'image/png'): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export const mediaProjectionSource: CaptureSource = {
  kind: 'mediaProjection',
  async isAvailable() {
    if (!isAndroidNative()) return false;
    return (await ScreenCapture.hasOverlayPermission()).granted;
  },
  async capture(): Promise<CapturedFrame | null> {
    const { pngBase64 } = await ScreenCapture.capture();
    if (!pngBase64) return null;
    return { blob: base64ToBlob(pngBase64), sourceKind: 'mediaProjection', capturedAt: Date.now() };
  },
};
```

- [ ] **Step 5: Build, install, verify the bridge on the emulator**

Ensure the Pixel_6_Pro emulator is running (`~/Library/Android/sdk/emulator/emulator -avd Pixel_6_Pro &`), then run the Global-Constraints build recipe, launch, and drive:
```bash
ADB=~/Library/Android/sdk/platform-tools/adb
$ADB shell am start -n com.brianwong.championsvgc/.MainActivity
# From the WebView console (via chrome devtools or a temporary call), calling
# ScreenCapture.hasOverlayPermission() resolves to { granted: false }.
```
Verification: the APK builds and installs with no manifest/plugin errors, and `adb logcat` shows no "Plugin ScreenCapture not found" when the JS calls it. (The toggle in Task 4 gives a UI trigger; for now confirm the build is clean and the plugin class is packaged.)
Expected: `BUILD SUCCESSFUL`, install `Success`, app launches.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/AndroidManifest.xml \
  android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java \
  android/app/src/main/java/com/brianwong/championsvgc/MainActivity.java \
  src/features/scan/mediaProjectionSource.ts
git commit -m "feat(scan): ScreenCapture plugin skeleton + overlay permission + JS source"
```

---

## Task 2: Foreground service + MediaProjection consent + floating button

Enabling a session shows the system screen-capture consent dialog, starts the foreground service, and puts a floating button over other apps. Tapping it fires `overlayTap`.

**Files:**
- Create: `android/app/src/main/java/com/brianwong/championsvgc/ScreenCaptureService.java`
- Modify: `android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java`

**Interfaces:**
- Consumes: `hasOverlayPermission` (Task 1).
- Produces: working `startSession()` / `stopSession()`; `overlayTap` event; `ScreenCaptureService.instance` holding the live `MediaProjection`.

- [ ] **Step 1: Create the foreground service (projection + overlay button; capture stub)**

Create `android/app/src/main/java/com/brianwong/championsvgc/ScreenCaptureService.java`:
```java
package com.brianwong.championsvgc;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;

public class ScreenCaptureService extends Service {
    public static ScreenCaptureService instance;
    public interface TapListener { void onTap(); }
    public static TapListener tapListener;

    static final String EXTRA_RESULT_CODE = "resultCode";
    static final String EXTRA_DATA = "data";
    private static final String CHANNEL_ID = "screen_capture";
    private static final int NOTIF_ID = 4201;

    private MediaProjection projection;
    private VirtualDisplay virtualDisplay;
    ImageReader imageReader;
    int width, height, densityDpi;
    private WindowManager windowManager;
    private Button floatingButton;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
        Intent data = intent.getParcelableExtra(EXTRA_DATA);

        startAsForeground();

        MediaProjectionManager mpm =
                (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        projection = mpm.getMediaProjection(resultCode, data);
        // Android 14+ requires a registered callback before creating the virtual display.
        projection.registerCallback(new MediaProjection.Callback() {
            @Override public void onStop() { teardown(); }
        }, new Handler(Looper.getMainLooper()));

        DisplayMetrics m = getResources().getDisplayMetrics();
        width = m.widthPixels;
        height = m.heightPixels;
        densityDpi = m.densityDpi;

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
        virtualDisplay = projection.createVirtualDisplay(
                "champvgc-capture", width, height, densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(), null, null);

        addFloatingButton();
        instance = this;
        return START_NOT_STICKY;
    }

    private void startAsForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Screen capture", NotificationManager.IMPORTANCE_LOW);
            nm.createNotificationChannel(ch);
        }
        Notification n = new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Champions VGC capture active")
                .setContentText("Tap the floating button to scan the screen.")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        } else {
            startForeground(NOTIF_ID, n);
        }
    }

    private void addFloatingButton() {
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        floatingButton = new Button(this);
        floatingButton.setText("Scan");
        floatingButton.setOnClickListener(v -> { if (tapListener != null) tapListener.onTap(); });

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = 24;
        lp.y = 240;
        windowManager.addView(floatingButton, lp);
    }

    private void teardown() {
        if (floatingButton != null && windowManager != null) {
            try { windowManager.removeView(floatingButton); } catch (Exception ignored) {}
            floatingButton = null;
        }
        if (virtualDisplay != null) { virtualDisplay.release(); virtualDisplay = null; }
        if (imageReader != null) { imageReader.close(); imageReader = null; }
        if (projection != null) { projection.stop(); projection = null; }
        instance = null;
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() { teardown(); super.onDestroy(); }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
```

- [ ] **Step 2: Wire startSession/stopSession in the plugin (MediaProjection consent via activity result)**

Edit `android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java`. Add imports at the top (below the existing ones):
```java
import android.content.Context;
import android.media.projection.MediaProjectionManager;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
```
Replace the `startSession` and `stopSession` stub methods with:
```java
    @PluginMethod
    public void startSession(PluginCall call) {
        if (!Settings.canDrawOverlays(getContext())) {
            call.reject("overlay permission not granted");
            return;
        }
        MediaProjectionManager mpm = (MediaProjectionManager)
                getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        Intent intent = mpm.createScreenCaptureIntent();
        startActivityForResult(call, intent, "projectionResult");
    }

    @ActivityCallback
    private void projectionResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) {
            call.reject("screen capture consent denied");
            return;
        }
        ScreenCaptureService.tapListener = () -> notifyListeners("overlayTap", new JSObject());
        Intent svc = new Intent(getContext(), ScreenCaptureService.class);
        svc.putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.getResultCode());
        svc.putExtra(ScreenCaptureService.EXTRA_DATA, result.getData());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(svc);
        } else {
            getContext().startService(svc);
        }
        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopSession(PluginCall call) {
        ScreenCaptureService.tapListener = null;
        getContext().stopService(new Intent(getContext(), ScreenCaptureService.class));
        call.resolve();
    }
```

- [ ] **Step 3: Build, install, and verify the session + floating button on the emulator**

Run the build recipe, then:
```bash
ADB=~/Library/Android/sdk/platform-tools/adb
# Grant overlay permission up-front for the test (avoids the settings dance):
$ADB shell appops set com.brianwong.championsvgc SYSTEM_ALERT_WINDOW allow
$ADB shell am start -n com.brianwong.championsvgc/.MainActivity
```
Then (after Task 4 gives a UI toggle, or via a temporary devtools call) invoke `ScreenCapture.startSession()`. A **system "Start recording / casting" consent dialog** appears; accept it. A **"Scan" floating button** then appears at the top-left, staying visible when you press Home. Screenshot to confirm:
```bash
$ADB exec-out screencap -p > /tmp/floating.png
```
Expected: consent dialog shown, then the floating button visible over the launcher.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/brianwong/championsvgc/ScreenCaptureService.java \
  android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java
git commit -m "feat(scan): foreground service, MediaProjection consent, floating overlay button"
```

---

## Task 3: Capture a frame (PNG base64)

`capture()` grabs the current screen from the ImageReader and returns a PNG.

**Files:**
- Modify: `android/app/src/main/java/com/brianwong/championsvgc/ScreenCaptureService.java`
- Modify: `android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java`

**Interfaces:**
- Consumes: `ScreenCaptureService.instance`, `.imageReader`, `.width/.height`.
- Produces: `ScreenCaptureService.captureLatestPng() -> String` (base64 PNG, or null); plugin `capture()` resolving `{ pngBase64, width, height }`.

- [ ] **Step 1: Add the capture method to the service**

In `ScreenCaptureService.java`, add these imports:
```java
import android.graphics.Bitmap;
import android.media.Image;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
```
Add this method to the class (e.g. above `teardown()`):
```java
    /** Grab the latest mirrored frame as a base64 PNG. Runs on the caller's thread. */
    public String captureLatestPng() {
        if (imageReader == null) return null;
        Image image = imageReader.acquireLatestImage();
        if (image == null) return null;
        try {
            Image.Plane plane = image.getPlanes()[0];
            ByteBuffer buffer = plane.getBuffer();
            int pixelStride = plane.getPixelStride();
            int rowStride = plane.getRowStride();
            int rowPadding = rowStride - pixelStride * width;
            Bitmap bitmap = Bitmap.createBitmap(
                    width + rowPadding / pixelStride, height, Bitmap.Config.ARGB_8888);
            bitmap.copyPixelsFromBuffer(buffer);
            Bitmap cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height);
            bitmap.recycle();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            cropped.compress(Bitmap.CompressFormat.PNG, 100, out);
            cropped.recycle();
            return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } finally {
            image.close();
        }
    }
```

- [ ] **Step 2: Implement plugin capture()**

In `ScreenCapturePlugin.java`, replace the `capture` stub with:
```java
    @PluginMethod
    public void capture(PluginCall call) {
        ScreenCaptureService svc = ScreenCaptureService.instance;
        if (svc == null) {
            call.reject("no active capture session");
            return;
        }
        getActivity().runOnUiThread(() -> {
            String png = svc.captureLatestPng();
            if (png == null) {
                call.reject("no frame available");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("pngBase64", png);
            ret.put("width", svc.width);
            ret.put("height", svc.height);
            call.resolve(ret);
        });
    }
```

- [ ] **Step 3: Build, install, verify a non-empty PNG comes back**

Run the build recipe + install. Start a session (Task 4 toggle), then trigger `ScreenCapture.capture()` and confirm the returned `pngBase64` is a long non-empty string (thousands of chars). Via logcat: add a temporary `console.log` in the toggle wiring, or inspect the returned Blob size in Task 4.
Expected: `capture()` resolves with a base64 string whose decoded length is a valid PNG (starts with the PNG magic once decoded).

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/brianwong/championsvgc/ScreenCaptureService.java \
  android/app/src/main/java/com/brianwong/championsvgc/ScreenCapturePlugin.java
git commit -m "feat(scan): capture screen frame from ImageReader as PNG base64"
```

---

## Task 4: Wire capture → scan → populate + the enable toggle (end-to-end)

The floating button's tap captures, scans, and shows results in the existing modal; add the user-facing enable/disable toggle.

**Files:**
- Create: `src/features/scan/OneTapCaptureToggle.tsx`
- Modify: `src/features/scan/ScanTeamModal.tsx`
- Modify: `src/pages/DamageCalculator/index.tsx`

**Interfaces:**
- Consumes: `mediaProjectionSource`, `ScreenCapture`, `isAndroidNative` (Task 1); `ScanTeamModal`.
- Produces: an Android-only capture toggle; captured frames routed into `ScanTeamModal` via a new `externalBlob` prop.

- [ ] **Step 1: Let ScanTeamModal accept an externally-supplied capture blob**

In `src/features/scan/ScanTeamModal.tsx`, add `externalBlob?: Blob | null` to `ScanTeamModalProps`, destructure it in the component signature, and add this effect next to the existing "seed roster" effect (after the `startPick` function):
```tsx
  React.useEffect(() => {
    if (isOpen && externalBlob) {
      setPendingBlob(externalBlob);
      void scan(externalBlob);
    }
    // Only re-run when a new blob arrives while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, externalBlob]);
```

- [ ] **Step 2: Create the capture toggle component**

Create `src/features/scan/OneTapCaptureToggle.tsx`:
```tsx
import React from 'react';
import { ScreenCapture, mediaProjectionSource, isAndroidNative } from './mediaProjectionSource';
import type { CapturedFrame } from './captureSource';

interface Props {
  onCaptured: (frame: CapturedFrame) => void;
}

const OneTapCaptureToggle: React.FC<Props> = ({ onCaptured }) => {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    let removeFn: (() => Promise<void>) | null = null;
    let cancelled = false;
    void ScreenCapture.addListener('overlayTap', async () => {
      const frame = await mediaProjectionSource.capture();
      if (frame) onCaptured(frame);
    }).then((h) => {
      if (cancelled) void h.remove();
      else removeFn = h.remove;
    });
    return () => { cancelled = true; if (removeFn) void removeFn(); };
  }, [active, onCaptured]);

  if (!isAndroidNative()) return null;

  const enable = async () => {
    if (!(await ScreenCapture.hasOverlayPermission()).granted) {
      await ScreenCapture.requestOverlayPermission();
      return; // user returns from settings, taps again
    }
    await ScreenCapture.startSession();
    setActive(true);
  };
  const disable = async () => { await ScreenCapture.stopSession(); setActive(false); };

  return (
    <button
      onClick={active ? disable : enable}
      className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
    >
      {active ? 'Stop one-tap capture' : 'Enable one-tap capture'}
    </button>
  );
};

export default OneTapCaptureToggle;
```

- [ ] **Step 3: Mount the toggle + route captures into the modal**

In `src/pages/DamageCalculator/index.tsx`: add imports:
```tsx
import OneTapCaptureToggle from '@/features/scan/OneTapCaptureToggle';
import type { CapturedFrame } from '@/features/scan/captureSource';
```
Add state next to `isScanModalOpen`:
```tsx
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
```
Add a handler:
```tsx
  const handleCaptured = React.useCallback((frame: CapturedFrame) => {
    setCapturedBlob(frame.blob);
    setIsScanModalOpen(true);
  }, []);
```
Render the toggle next to the "Scan opponent" button (inside the `flex justify-end` div in `defenderPanel`, before the existing `<button>`):
```tsx
            <OneTapCaptureToggle onCaptured={handleCaptured} />
```
Pass the blob to the modal and clear it on close:
```tsx
    <ScanTeamModal
      isOpen={isScanModalOpen}
      onClose={() => { setIsScanModalOpen(false); setCapturedBlob(null); }}
      pokemonList={pokemonList}
      onLoadPokemon={handleLoadDefender}
      onLoadAttacker={handleLoadAttacker}
      onSaveTeam={handleSaveOppTeam}
      externalBlob={capturedBlob}
    />
```

- [ ] **Step 4: Type-check + build + install**

```bash
npx tsc --noEmit    # expect: no errors
```
Then the Android build recipe + install.
Expected: `tsc` clean, `BUILD SUCCESSFUL`, install `Success`.

- [ ] **Step 5: End-to-end emulator verification**

```bash
ADB=~/Library/Android/sdk/platform-tools/adb
$ADB shell appops set com.brianwong.championsvgc SYSTEM_ALERT_WINDOW allow
$ADB shell am start -n com.brianwong.championsvgc/.MainActivity
```
In the app: on the Damage Calculator, tap **"Enable one-tap capture"** → accept the consent dialog → the floating **"Scan"** button appears. Open the **Photos/Files app** showing a seeded Champions battle screenshot (e.g. `04-24-33`). Tap the floating **"Scan"** button → the app returns to the foreground and the **Scan modal opens showing the detected opponent + HP** (from the captured screen), offering "Set as defender".
Expected screenshot: the calc app foregrounded with a populated scan result.

- [ ] **Step 6: Commit**

```bash
git add src/features/scan/OneTapCaptureToggle.tsx src/features/scan/ScanTeamModal.tsx src/pages/DamageCalculator/index.tsx
git commit -m "feat(scan): one-tap capture toggle wires overlay tap -> capture -> scan modal"
```

---

## Deferred / not verified

- **Real-game FLAG_SECURE viability (Task 0 spike).** If Champions sets `FLAG_SECURE`, `captureLatestPng()` returns a black frame on the game screen. The emulator demo (against a Photos screenshot) does not exercise this. Runbook is Appendix A of the spec.
- **iOS** — no equivalent; companion mode is slice 6.
- **Overlay drag / positioning polish, capture debounce, downscale-before-encode** — YAGNI for the demo; add only if measured.

---

## Self-Review

**1. Spec coverage (Task 2 scope):** ScreenCapturePlugin methods + `overlayTap` (Tasks 1-3) ✓; manifest permissions + mediaProjection service (Task 1) ✓; foreground service + persistent notification (Task 2) ✓; SYSTEM_ALERT_WINDOW floating button (Task 2) ✓; VirtualDisplay+ImageReader RGBA_8888 → PNG → base64 (Task 3) ✓; bring app to front (Task 4 — `startActivityForResult`/consent returns focus to the app, and the modal open re-foregrounds; explicit note below) ✓; JS `mediaProjectionSource` implementing `CaptureSource` kind `'mediaProjection'` (Task 1) ✓; overlayTap → capture → ingestFrame via the modal's `scan()` which calls the Task-1 pipeline (Task 4) ✓; feature-flagged Android-only toggle (Task 4) ✓; manual-tap only ✓.
  - **KNOWN RISK — the backgrounded-capture flow (resolve during execution).** The core use case
    is tapping the floating button *while in another app*, so our Activity/WebView is backgrounded.
    Option (a) as coded (tap → JS calls `capture()`) assumes the WebView JS still runs while
    backgrounded — **Android may pause the WebView**, so the tap listener might not fire until the
    app is foregrounded. If Task 2/3 verification shows the tap does nothing while backgrounded,
    switch to **option (b)** (more robust): on tap, the **service** captures the frame itself
    (`captureLatestPng()` — it works regardless of app state since the service holds the
    MediaProjection), then brings `MainActivity` to front (`getActivity().moveTaskToFront` / a
    launch `Intent` with `FLAG_ACTIVITY_REORDER_TO_FRONT`) and delivers the base64 to JS via the
    `overlayTap` event payload. JS then converts base64→Blob and opens the modal on resume. This is
    a small change (move the capture into `TapListener.onTap`, add the png to the event `JSObject`,
    add a `bringToFront`), and it is the expected outcome — plan to apply it unless (a) demonstrably
    works backgrounded on the emulator.

**2. Placeholder scan:** No TBD/TODO; every native/JS step shows complete code; verification steps are manual-but-concrete (emulator + adb).

**3. Type consistency:** `CapturedFrame { blob, sourceKind, capturedAt }` matches Task 1; `mediaProjectionSource.capture()` returns `CapturedFrame | null` like `filePickerSource`; plugin method names (`hasOverlayPermission`/`requestOverlayPermission`/`startSession`/`stopSession`/`capture`) and the `overlayTap` event match between the Java `@PluginMethod`s, the `ScreenCapturePlugin` TS interface, and the toggle. Service field names (`instance`, `imageReader`, `width`, `height`, `tapListener`, `EXTRA_RESULT_CODE`, `EXTRA_DATA`, `captureLatestPng`) are consistent across Tasks 2-3.
