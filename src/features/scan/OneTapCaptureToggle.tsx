import React from 'react';
import { ScreenCapture, isAndroidNative } from './mediaProjectionSource';

// Enable/disable the floating overlay session. Bubble taps are handled
// entirely by the native overlay panel (#/overlay route), not this app view.
const OneTapCaptureToggle: React.FC = () => {
  const [active, setActive] = React.useState(false);

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
