// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const pluginMock = vi.hoisted(() => ({
  hasOverlayPermission: vi.fn(),
  requestOverlayPermission: vi.fn(async () => {}),
  startSession: vi.fn(async () => ({ started: true })),
  isSessionActive: vi.fn(async () => ({ active: false })),
  stopSession: vi.fn(async () => {}),
}));
const isAndroidNativeMock = vi.hoisted(() => vi.fn(() => true));

vi.mock('./mediaProjectionSource', () => ({
  ScreenCapture: pluginMock,
  isAndroidNative: isAndroidNativeMock,
}));

import { useOneTapCapture } from './useOneTapCapture';

describe('useOneTapCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAndroidNativeMock.mockReturnValue(true);
    pluginMock.isSessionActive.mockResolvedValue({ active: false });
    pluginMock.hasOverlayPermission.mockResolvedValue({ granted: true });
  });

  it('is unsupported (and inert) off Android', async () => {
    isAndroidNativeMock.mockReturnValue(false);
    const { result } = renderHook(() => useOneTapCapture());
    expect(result.current.supported).toBe(false);
    await act(async () => { await result.current.toggle(); });
    expect(pluginMock.startSession).not.toHaveBeenCalled();
  });

  it('reflects an already-running session on mount', async () => {
    pluginMock.isSessionActive.mockResolvedValue({ active: true });
    const { result } = renderHook(() => useOneTapCapture());
    await waitFor(() => expect(result.current.active).toBe(true));
  });

  it('toggle enables when permission is granted', async () => {
    const { result } = renderHook(() => useOneTapCapture());
    pluginMock.isSessionActive.mockResolvedValue({ active: true }); // post-start state
    await act(async () => { await result.current.toggle(); });
    expect(pluginMock.startSession).toHaveBeenCalled();
    expect(result.current.active).toBe(true);
  });

  it('toggle without overlay permission opens settings and does not start', async () => {
    pluginMock.hasOverlayPermission.mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useOneTapCapture());
    await act(async () => { await result.current.toggle(); });
    expect(pluginMock.requestOverlayPermission).toHaveBeenCalled();
    expect(pluginMock.startSession).not.toHaveBeenCalled();
  });

  it('toggle while active stops the session', async () => {
    pluginMock.isSessionActive.mockResolvedValue({ active: true });
    const { result } = renderHook(() => useOneTapCapture());
    await waitFor(() => expect(result.current.active).toBe(true));
    await act(async () => { await result.current.toggle(); });
    expect(pluginMock.stopSession).toHaveBeenCalled();
    expect(result.current.active).toBe(false);
  });
});
