// Thin typed wrapper over the native OverlayBridge JavascriptInterface
// (OverlayPanelController.java). Everything no-ops outside the Android
// overlay WebView so the /overlay route is harmless in a normal browser.
import { base64ToBlob } from '../scan/mediaProjectionSource';

export type WindowState = 'hidden' | 'strip' | 'panel';
export type BubbleTag = 'scan' | 'calc';

interface NativeOverlayBridge {
  captureFrame(): string | null;
  blinkAndCapture(): string | null;
  setWindowState(state: string): void;
  setBubbleTag(tag: string): void;
}

declare global {
  interface Window {
    OverlayBridge?: NativeOverlayBridge;
    __overlayBubbleTap?: () => void;
    __overlayBack?: () => void;
  }
}

const native = () => (typeof window !== 'undefined' ? window.OverlayBridge : undefined);
const toBlob = (b64: string | null | undefined) => (b64 ? base64ToBlob(b64) : null);

export const overlayBridge = {
  isAvailable: (): boolean => !!native(),
  captureFrame: (): Blob | null => toBlob(native()?.captureFrame()),
  blinkAndCapture: (): Blob | null => toBlob(native()?.blinkAndCapture()),
  setWindowState(state: WindowState): void { native()?.setWindowState(state); },
  setBubbleTag(tag: BubbleTag): void { native()?.setBubbleTag(tag); },
  onBubbleTap(cb: () => void): () => void {
    window.__overlayBubbleTap = cb;
    return () => { if (window.__overlayBubbleTap === cb) delete window.__overlayBubbleTap; };
  },
  onBack(cb: () => void): () => void {
    window.__overlayBack = cb;
    return () => { if (window.__overlayBack === cb) delete window.__overlayBack; };
  },
};
