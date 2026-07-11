import React from 'react';
import { Icon, IconName } from './Icon';

export interface ArenaTab { id: string; label: string; icon: IconName }

export const ARENA_TABS: ArenaTab[] = [
  { id: 'calc', label: 'Calculator', icon: 'calculator' },
  { id: 'teams', label: 'Teams', icon: 'users' },
  { id: 'sp', label: 'EV/SP', icon: 'sliders-horizontal' },
  { id: 'speed', label: 'Speed tiers', icon: 'gauge' },
];

/**
 * TabBar — persistent bottom navigation, 4 tabs, outline icons.
 * Active tab uses the accent color. Each tab is a >=44px tap target (64px bar).
 */
export function TabBar({ active = 'calc', onChange, tabs = ARENA_TABS, style = {} }: {
  active?: string; onChange?: (id: string) => void; tabs?: ArenaTab[]; style?: React.CSSProperties;
}) {
  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 30,
        height: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))',
        display: 'grid',
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        background: 'var(--bg-appbar)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--line-1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        ...style,
      }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange && onChange(t.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: on ? 'var(--accent)' : 'var(--ink-3)',
              transition: 'color var(--dur) var(--ease)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon name={t.icon} size={22} color={on ? 'var(--accent)' : 'var(--ink-3)'} strokeWidth={on ? 2.1 : 1.75} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: on ? 'var(--fw-bold)' : 'var(--fw-semibold)', letterSpacing: '0.01em' }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
