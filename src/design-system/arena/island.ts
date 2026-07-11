/**
 * island — tags <html data-island="left|right|none"> with the physical side
 * of the Dynamic Island / notch in landscape.
 *
 * Why: iOS reports SYMMETRIC left/right safe-area insets in landscape, so CSS
 * env() alone can't tell which short edge actually holds the island — the
 * island-less side would reserve a dead 59px gutter. tokens.css collapses the
 * --safe-left / --safe-right var on the side away from the island.
 *
 * window.orientation is deprecated but iOS-only and Apple-documented
 * (90 = home button right → island LEFT; -90 = home button left → island
 * RIGHT), which exactly matches the scope of this quirk. Non-iOS browsers
 * lack it → 'none' → symmetric insets (today's safe default).
 */
export function islandSide(orientation: unknown): 'left' | 'right' | 'none' {
  if (orientation === 90) return 'left';
  if (orientation === -90) return 'right';
  return 'none';
}

export function watchIslandSide() {
  const apply = () => {
    document.documentElement.dataset.island = islandSide(window.orientation);
  };
  apply();
  window.addEventListener('orientationchange', apply);
}
