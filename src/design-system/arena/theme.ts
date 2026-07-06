import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'theme';
const query = () => window.matchMedia('(prefers-color-scheme: light)');

/** localStorage override if set, else the OS preference. */
export function resolveTheme(): Theme {
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return query().matches ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

/** Resolved theme + setter. Follows live OS changes until the user overrides. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setState] = useState<Theme>(resolveTheme);
  useEffect(() => {
    const mql = query();
    const onChange = () => {
      if (localStorage.getItem(KEY)) return; // user override wins
      const next = resolveTheme();
      applyTheme(next);
      setState(next);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  const set = useCallback((t: Theme) => { setTheme(t); setState(t); }, []);
  return [theme, set];
}
