// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from './useToast';
import { renderHook, act } from '@testing-library/react';

describe('useToast hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates toast state when showdown-imported event is dispatched', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toast).toBeNull();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('showdown-imported', {
          detail: { corrections: ['Amoongus ➔ Amoonguss'] }
        })
      );
    });

    expect(result.current.toast).toBe("Auto-corrected:\nAmoongus ➔ Amoonguss");

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.toast).toBeNull();
  });

  it('ignores showdown-imported event if corrections list is empty', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      window.dispatchEvent(
        new CustomEvent('showdown-imported', {
          detail: { corrections: [] }
        })
      );
    });

    expect(result.current.toast).toBeNull();
  });
});
