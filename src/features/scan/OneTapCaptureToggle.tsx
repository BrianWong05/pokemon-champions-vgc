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
      try {
        const frame = await mediaProjectionSource.capture();
        if (frame) {
          await ScreenCapture.bringToFront();
          onCaptured(frame);
        }
      } catch (e) {
        console.error('[capture] failed', e);
      }
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
      className="px-4 py-2 rounded bg-safe-soft text-safe border border-safe-line text-sm font-semibold hover:bg-safe-soft-hover transition-colors"
    >
      {active ? 'Stop one-tap capture' : 'Enable one-tap capture'}
    </button>
  );
};

export default OneTapCaptureToggle;
