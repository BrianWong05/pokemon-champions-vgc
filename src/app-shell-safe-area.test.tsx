import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppBar } from './design-system/arena/AppBar';
import { NavRail } from './design-system/arena/NavRail';
import { TabBar } from './design-system/arena/TabBar';

describe('app shell safe areas', () => {
  it('opts the viewport into iOS edge-to-edge safe-area insets', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
    );
  });

  it('keeps the landscape rail control column after the island-aware left inset', () => {
    const markup = renderToStaticMarkup(<NavRail active="calc" />);
    expect(markup).toContain('width:calc(56px + var(--safe-left))');
    expect(markup).toContain('padding-left:var(--safe-left)');
  });

  it('collapses the safe-area var on the side away from the island', () => {
    const tokens = readFileSync(
      resolve(process.cwd(), 'src/design-system/arena/tokens.css'),
      'utf8',
    );
    expect(tokens).toContain('--safe-left: env(safe-area-inset-left, 0px)');
    expect(tokens).toContain('--safe-right: env(safe-area-inset-right, 0px)');
    expect(tokens).toContain(":root[data-island='left'] { --safe-right: 0px; }");
    expect(tokens).toContain(":root[data-island='right'] { --safe-left: 0px; }");
  });

  it('keeps the landscape rail bottom controls above the bottom inset', () => {
    const markup = renderToStaticMarkup(<NavRail active="calc" />);
    expect(markup).toContain(
      'padding-bottom:calc(10px + env(safe-area-inset-bottom, 0px))',
    );
  });

  it('keeps the portrait app-bar control row below the top inset', () => {
    const markup = renderToStaticMarkup(<AppBar title="Calculator" />);
    expect(markup).toContain(
      'height:calc(var(--appbar-h) + env(safe-area-inset-top, 0px))',
    );
    expect(markup).toContain('padding-top:env(safe-area-inset-top, 0px)');
  });

  it('keeps the portrait tab-bar control row above the bottom inset', () => {
    const markup = renderToStaticMarkup(<TabBar active="calc" />);
    expect(markup).toContain(
      'height:calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))',
    );
    expect(markup).toContain('padding-bottom:env(safe-area-inset-bottom, 0px)');
  });

  it('bleeds the landscape defender surface under the right inset, content stays clear', () => {
    const calc = readFileSync(
      resolve(process.cwd(), 'src/features/damage-calculator/components/mobile/ArenaCalculatorLandscape.tsx'),
      'utf8',
    );
    // surface extends under the island (negative margin into the shell's inset padding)…
    expect(calc).toContain("marginRight: 'calc(-1 * var(--safe-right, 0px))'");
    // …the panel widens by the same inset so only the surface bleeds, not the content…
    expect(calc).toContain("width: 'calc(clamp(224px, 30%, 280px) + var(--safe-right, 0px))'");
    // …and the defender content stays inset via right padding that includes the inset
    expect(calc).toContain('calc(10px + var(--safe-right, 0px))');
  });

  it('adds the top inset to the portrait regulation-menu anchor', () => {
    const shell = readFileSync(
      resolve(process.cwd(), 'src/components/templates/ArenaShell.tsx'),
      'utf8',
    );
    expect(shell).toContain(
      "top: 'calc(env(safe-area-inset-top, 0px) + (var(--appbar-h) + 34px) / 2 + 2px)'",
    );
  });
});
