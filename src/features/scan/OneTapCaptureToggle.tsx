import React from 'react';
import { useOneTapCapture } from './useOneTapCapture';

// Enable/disable the floating overlay session (scan-page entry point; the
// app chrome's CaptureToggleButton is the primary one). Bubble taps are
// handled entirely by the native overlay panel (#/overlay route).
const OneTapCaptureToggle: React.FC = () => {
  const { supported, active, toggle } = useOneTapCapture();

  if (!supported) return null;

  return (
    <button
      onClick={() => void toggle()}
      className="px-4 py-2 rounded bg-safe-soft text-safe border border-safe-line text-sm font-semibold hover:bg-safe-soft-hover transition-colors"
    >
      {active ? 'Stop one-tap capture' : 'Enable one-tap capture'}
    </button>
  );
};

export default OneTapCaptureToggle;
