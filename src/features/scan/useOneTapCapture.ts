// Shared enable/disable state for the floating one-tap capture bubble.
// Queries the native session on mount (and on app resume) so every toggle
// surface reflects reality, not stale component state.
import { useCallback, useEffect, useState } from 'react';
import { ScreenCapture, isAndroidNative } from './mediaProjectionSource';

export function useOneTapCapture() {
  const supported = isAndroidNative();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const refresh = () => {
      void ScreenCapture.isSessionActive()
        .then((r) => { if (!cancelled) setActive(r.active); })
        .catch(() => { /* older native build without the method */ });
    };
    refresh();
    // Re-check when returning from the overlay-permission settings screen.
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [supported]);

  const toggle = useCallback(async () => {
    if (!supported) return;
    if (active) {
      await ScreenCapture.stopSession();
      setActive(false);
      return;
    }
    if (!(await ScreenCapture.hasOverlayPermission()).granted) {
      await ScreenCapture.requestOverlayPermission();
      return; // user grants in settings, comes back, taps again
    }
    await ScreenCapture.startSession();
    const { active: nowActive } = await ScreenCapture.isSessionActive();
    setActive(nowActive);
  }, [supported, active]);

  return { supported, active, toggle };
}
