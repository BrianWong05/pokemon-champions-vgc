import { useEffect, useState } from 'react';

export type ViewportMode = 'desktop' | 'arena' | 'arena-landscape';

const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 767px)';
const PORTRAIT_QUERY = '(max-width: 767px)';

function compute(): ViewportMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
  if (window.matchMedia(LANDSCAPE_QUERY).matches) return 'arena-landscape';
  if (window.matchMedia(PORTRAIT_QUERY).matches) return 'arena';
  return 'desktop';
}

/**
 * useViewportMode — which of the three app frames to render.
 * - 'arena-landscape': landscape orientation, height <= 767px (phones and
 *   iPad-mini-sized tablets held sideways) → the battle HUD. Wins over 'arena'.
 * - 'arena': portrait mobile width (<= 767px, below Tailwind `md`).
 * - 'desktop': everything else. SSR / no-matchMedia safe.
 * Supersedes useIsMobile.
 */
export function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>(compute);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const queries = [LANDSCAPE_QUERY, PORTRAIT_QUERY].map((q) => window.matchMedia(q));
    const onChange = () => setMode(compute());
    onChange();
    queries.forEach((mql) => mql.addEventListener('change', onChange));
    return () => queries.forEach((mql) => mql.removeEventListener('change', onChange));
  }, []);

  return mode;
}
