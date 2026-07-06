// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { resolveTheme, setTheme, useTheme } from './theme';

function stubMatchMedia(prefersLight: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: prefersLight,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('follows the OS preference when nothing is stored', () => {
    stubMatchMedia(true);
    expect(resolveTheme()).toBe('light');
    stubMatchMedia(false);
    expect(resolveTheme()).toBe('dark');
  });

  it('stored override beats the OS preference', () => {
    stubMatchMedia(true);
    localStorage.setItem('theme', 'dark');
    expect(resolveTheme()).toBe('dark');
  });

  it('ignores garbage stored values', () => {
    stubMatchMedia(false);
    localStorage.setItem('theme', 'blurple');
    expect(resolveTheme()).toBe('dark');
  });

  it('setTheme applies the attribute and persists', () => {
    stubMatchMedia(false);
    setTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('useTheme follows live OS changes when only a garbage value is stored', () => {
    const mql = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
    localStorage.setItem('theme', 'blurple');

    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('dark');

    mql.matches = true; // OS flips to light
    const onChange = mql.addEventListener.mock.calls[0][1];
    act(() => onChange());

    expect(result.current[0]).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
