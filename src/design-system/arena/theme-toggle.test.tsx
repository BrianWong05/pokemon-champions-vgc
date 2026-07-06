// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false, // OS prefers dark
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it('offers the opposite theme and applies it on click', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    // label flips to offer dark again
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeTruthy();
  });
});
