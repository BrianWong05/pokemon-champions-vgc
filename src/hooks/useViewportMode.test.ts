// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useViewportMode } from './useViewportMode';

/**
 * Mock matchMedia keyed by exact query string, so a broken query in the hook
 * fails the test instead of silently matching via a loose substring check.
 */
const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 767px)';
const TABLET_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 1024px) and (pointer: coarse)';
const PORTRAIT_QUERY = '(max-width: 767px)';

function mockViewport(initial: { landscape: boolean; portrait: boolean; tablet?: boolean }) {
  const listeners = new Set<() => void>();
  const state = { tablet: false, ...initial };
  // @ts-expect-error test shim
  window.matchMedia = (query: string) => ({
    get matches() {
      if (query === LANDSCAPE_QUERY) return state.landscape;
      if (query === TABLET_LANDSCAPE_QUERY) return state.tablet;
      if (query === PORTRAIT_QUERY) return state.portrait;
      throw new Error('unexpected query: ' + query);
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  });
  return {
    set(next: { landscape: boolean; portrait: boolean; tablet?: boolean }) {
      Object.assign(state, { tablet: false, ...next });
      listeners.forEach((cb) => cb());
    },
  };
}

/**
 * Mock matchMedia answering queries by inspecting substrings of the query
 * string, used for the tablet-tier cases where the exact query text
 * (pointer/max-height) is the thing under test.
 */
function mockMatchMedia(matcher: (q: string) => boolean) {
  window.matchMedia = ((q: string) => ({
    matches: matcher(q),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
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

  it('iPad Air landscape (1180x820, coarse) → arena-landscape', () => {
    mockMatchMedia((q) =>
      q.includes('landscape') && q.includes('max-height: 1024px') && q.includes('pointer: coarse'));
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena-landscape');
  });

  it('iPad Pro landscape (1366x1024, coarse) → arena-landscape', () => {
    mockMatchMedia((q) =>
      q.includes('landscape') && q.includes('max-height: 1024px') && q.includes('pointer: coarse'));
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('arena-landscape');
  });

  it('laptop landscape (1280x800, fine pointer) → desktop', () => {
    // matches neither phone (max-height 767) nor tablet (needs pointer: coarse) nor portrait width
    mockMatchMedia(() => false);
    const { result } = renderHook(() => useViewportMode());
    expect(result.current).toBe('desktop');
  });
});
