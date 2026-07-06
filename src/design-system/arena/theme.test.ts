// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveTheme, setTheme } from './theme';

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
});
