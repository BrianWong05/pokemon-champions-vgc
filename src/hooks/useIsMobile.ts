import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)';

/**
 * useIsMobile — true when the viewport is at mobile width (<= 767px, below Tailwind `md`).
 * Drives the Arena mobile UI vs. the desktop layout. SSR / no-matchMedia safe.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
