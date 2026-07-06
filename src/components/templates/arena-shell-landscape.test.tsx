// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ArenaShell from './ArenaShell';

vi.mock('@/features/formats/FormatContext', () => ({
  useFormat: () => ({ format: 'Reg M-B', setFormat: vi.fn(), availableFormats: ['Reg M-B'] }),
}));

describe('ArenaShell landscape', () => {
  afterEach(cleanup);

  // ponytail: jsdom has no matchMedia; ThemeToggle (rendered by ArenaShell) needs it.
  // Same stub pattern as src/design-system/arena/theme-toggle.test.tsx.
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  it('portrait (default) renders app bar title and bottom tab labels', () => {
    render(<MemoryRouter initialEntries={['/']}><ArenaShell /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeTruthy(); // AppBar title
    expect(screen.getByText('Teams')).toBeTruthy(); // TabBar label
  });

  it('landscape renders the nav rail instead of app bar + tab bar', () => {
    render(<MemoryRouter initialEntries={['/']}><ArenaShell landscape /></MemoryRouter>);
    expect(screen.getByLabelText('Primary')).toBeTruthy(); // NavRail
    expect(screen.getByLabelText('Teams')).toBeTruthy(); // rail icon button
    expect(screen.queryByText('Teams')).toBeNull(); // no TabBar text label
    expect(screen.queryByRole('heading', { name: 'Calculator' })).toBeNull(); // no AppBar title
    expect(screen.getByText('M-B')).toBeTruthy(); // compact RegPill in rail
  });
});
