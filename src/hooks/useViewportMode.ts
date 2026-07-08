import { useEffect, useState } from 'react';

export type ViewportMode = 'desktop' | 'arena' | 'arena-landscape';

const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 767px)';
const TABLET_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 1024px) and (pointer: coarse)';
const PORTRAIT_QUERY = '(max-width: 767px)';
const QUERIES = [LANDSCAPE_QUERY, TABLET_LANDSCAPE_QUERY, PORTRAIT_QUERY];

function compute(): ViewportMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
  if (window.matchMedia(LANDSCAPE_QUERY).matches || window.matchMedia(TABLET_LANDSCAPE_QUERY).matches) {
    return 'arena-landscape';
  }
  if (window.matchMedia(PORTRAIT_QUERY).matches) return 'arena';
  return 'desktop';
}

/**
 * useViewportMode — which of the three app frames to render.
 * - 'arena-landscape': landscape orientation, height <= 767px (phones and
 *   iPad-mini-sized tablets held sideways) → the battle HUD. Wins over 'arena'.
 *   Also fires for touch tablets up to iPad-Pro height (<= 1024px) held
 *   sideways, gated on `pointer: coarse` so laptops in a landscape-ish
 *   window don't get routed to the touch HUD.
 * - 'arena': portrait mobile width (<= 767px, below Tailwind `md`).
 * - 'desktop': everything else. SSR / no-matchMedia safe.
 * Supersedes useIsMobile.
 */
export function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>(compute);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const queries = QUERIES.map((q) => window.matchMedia(q));
    const onChange = () => setMode(compute());
    onChange();
    queries.forEach((mql) => mql.addEventListener('change', onChange));
    return () => queries.forEach((mql) => mql.removeEventListener('change', onChange));
  }, []);

  return mode;
}
