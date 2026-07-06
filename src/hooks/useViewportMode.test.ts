// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useViewportMode } from './useViewportMode';

/**
 * Mock matchMedia keyed by query: the landscape query contains 'orientation',
 * the portrait query is the plain max-width one.
 */
function mockViewport(initial: { landscape: boolean; portrait: boolean }) {
  const listeners = new Set<() => void>();
  const state = { ...initial };
  // @ts-expect-error test shim
  window.matchMedia = (query: string) => ({
    get matches() {
      return query.includes('orientation') ? state.landscape : state.portrait;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  });
  return {
    set(next: { landscape: boolean; portrait: boolean }) {
      Object.assign(state, next);
      listeners.forEach((cb) => cb());
    },
  };
}

describe('useViewportMode', () => {
  it('375x812 portrait phone → arena', () => {
    mockViewport({ landscape: false, portrait: true });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena');
  });

  it('800x360 landscape phone → arena-landscape', () => {
    mockViewport({ landscape: true, portrait: false });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena-landscape');
  });

  it('landscape wins when both queries match (small landscape phone)', () => {
    mockViewport({ landscape: true, portrait: true });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena-landscape');
  });

  it('1280x800 desktop → desktop', () => {
    mockViewport({ landscape: false, portrait: false });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('desktop');
  });

  it('updates when the device rotates', () => {
    const vp = mockViewport({ landscape: false, portrait: true });
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena');
    act(() => vp.set({ landscape: true, portrait: false }));
    expect(result.current).toBe('arena-landscape');
  });
});
