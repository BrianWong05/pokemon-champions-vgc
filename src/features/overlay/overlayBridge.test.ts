// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { overlayBridge } from './overlayBridge';

// 1x1 transparent PNG
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

declare global {
  interface Window { OverlayBridge?: any }
}

describe('overlayBridge', () => {
  beforeEach(() => { delete window.OverlayBridge; delete (window as any).__overlayBubbleTap; });

  it('is unavailable and inert without the native interface', () => {
    expect(overlayBridge.isAvailable()).toBe(false);
    expect(overlayBridge.blinkAndCapture()).toBeNull();
    expect(() => overlayBridge.setWindowState('strip')).not.toThrow();
  });

  it('converts captured base64 to a png Blob', () => {
    window.OverlayBridge = { blinkAndCapture: () => PNG_B64 };
    const blob = overlayBridge.blinkAndCapture();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe('image/png');
    expect(blob!.size).toBeGreaterThan(0);
  });

  it('forwards window state and bubble tag', () => {
    const setWindowState = vi.fn();
    const setBubbleTag = vi.fn();
    window.OverlayBridge = { setWindowState, setBubbleTag };
    overlayBridge.setWindowState('panel');
    overlayBridge.setBubbleTag('calc');
    expect(setWindowState).toHaveBeenCalledWith('panel');
    expect(setBubbleTag).toHaveBeenCalledWith('calc');
  });

  it('registers and unregisters the bubble-tap callback', () => {
    const cb = vi.fn();
    const off = overlayBridge.onBubbleTap(cb);
    (window as any).__overlayBubbleTap();
    expect(cb).toHaveBeenCalledOnce();
    off();
    expect((window as any).__overlayBubbleTap).toBeUndefined();
  });
});
