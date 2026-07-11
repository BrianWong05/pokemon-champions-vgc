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
import android.view.Display;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.widget.ImageView;
import android.content.res.ColorStateList;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.graphics.Bitmap;
import android.media.Image;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

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
    private View floatingButton;
    private DisplayManager displayManager;
    private DisplayManager.DisplayListener displayListener;

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

        displayManager = (DisplayManager) getSystemService(Context.DISPLAY_SERVICE);
        readDisplaySize();

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
        virtualDisplay = projection.createVirtualDisplay(
                "champvgc-capture", width, height, densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(), null, null);
        registerDisplayListener();

        addFloatingButton();
        instance = this;
        return START_NOT_STICKY;
    }

    /** Reads the current physical display size (accounts for rotation). */
    private void readDisplaySize() {
        Display d = displayManager.getDisplay(Display.DEFAULT_DISPLAY);
        DisplayMetrics m = new DisplayMetrics();
        d.getRealMetrics(m);
        width = m.widthPixels;
        height = m.heightPixels;
        densityDpi = m.densityDpi;
    }

    /** Resize the capture surface when the display rotates so captures match the live screen. */
    private void registerDisplayListener() {
        displayListener = new DisplayManager.DisplayListener() {
            @Override public void onDisplayAdded(int displayId) {}
            @Override public void onDisplayRemoved(int displayId) {}
            @Override public void onDisplayChanged(int displayId) {
                if (displayId != Display.DEFAULT_DISPLAY || virtualDisplay == null) return;
                int oldW = width, oldH = height;
                readDisplaySize();
                if (width == oldW && height == oldH) return;
                if (imageReader != null) imageReader.close();
                imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
                virtualDisplay.resize(width, height, densityDpi);
                virtualDisplay.setSurface(imageReader.getSurface());
            }
        };
        displayManager.registerDisplayListener(displayListener, new Handler(Looper.getMainLooper()));
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
        float density = getResources().getDisplayMetrics().density;
        int size = (int) (52 * density);

        // Arena-styled FAB: --accent circle, white scan-line glyph, ripple on press.
        ImageView btn = new ImageView(this);
        btn.setImageResource(R.drawable.ic_scan_line);
        int pad = (int) (14 * density);
        btn.setPadding(pad, pad, pad, pad);
        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        circle.setColor(0xFF4F7DFF);
        circle.setStroke((int) (1.5f * density), 0x59FFFFFF);
        btn.setBackground(new RippleDrawable(ColorStateList.valueOf(0x40FFFFFF), circle, null));
        btn.setAlpha(0.92f);
        btn.setContentDescription("Scan");
        floatingButton = btn;

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                size,
                size,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = 24;
        lp.y = 240;

        // Drag to reposition; a near-stationary press still counts as a tap.
        int touchSlop = ViewConfiguration.get(this).getScaledTouchSlop();
        btn.setOnTouchListener(new View.OnTouchListener() {
            int startX, startY;
            float rawX, rawY;
            boolean dragging;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        startX = lp.x; startY = lp.y;
                        rawX = e.getRawX(); rawY = e.getRawY();
                        dragging = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (e.getRawX() - rawX);
                        int dy = (int) (e.getRawY() - rawY);
                        if (!dragging && Math.hypot(dx, dy) > touchSlop) dragging = true;
                        if (dragging) {
                            lp.x = startX + dx;
                            lp.y = startY + dy;
                            windowManager.updateViewLayout(v, lp);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!dragging) v.performClick();
                        return true;
                }
                return false;
            }
        });
        btn.setOnClickListener(v -> { if (tapListener != null) tapListener.onTap(); });
        windowManager.addView(floatingButton, lp);
    }

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

    private void teardown() {
        if (displayManager != null && displayListener != null) {
            displayManager.unregisterDisplayListener(displayListener);
            displayListener = null;
        }
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
