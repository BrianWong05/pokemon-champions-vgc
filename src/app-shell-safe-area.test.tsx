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

  it('keeps the landscape rail control column after the left inset', () => {
    const markup = renderToStaticMarkup(<NavRail active="calc" />);
    expect(markup).toContain('width:calc(56px + env(safe-area-inset-left, 0px))');
    expect(markup).toContain('padding-left:env(safe-area-inset-left, 0px)');
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
