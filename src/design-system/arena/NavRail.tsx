import React from 'react';
import { Icon } from './Icon';
import { ARENA_TABS, ArenaTab } from './TabBar';

/**
 * NavRail — the landscape counterpart of TabBar: a slim left rail of
 * icon-only tabs (44px targets), with an optional bottom slot for shell
 * controls (theme toggle, reg pill).
 */
export function NavRail({ active = 'calc', onChange, tabs = ARENA_TABS, bottom }: {
  active?: string; onChange?: (id: string) => void; tabs?: ArenaTab[]; bottom?: React.ReactNode;
}) {
  return (
    <nav
      aria-label="Primary"
      style={{
        width: 'calc(56px + env(safe-area-inset-left, 0px))',
        flex: '0 0 auto',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 0',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        background: 'var(--bg-appbar)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--line-1)',
      }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            title={t.label}
            aria-label={t.label}
            aria-current={on ? 'page' : undefined}
            onClick={() => onChange && onChange(t.id)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--r-md)',
              display: 'grid',
              placeItems: 'center',
              background: on ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${on ? 'var(--accent-soft-line)' : 'transparent'}`,
              color: on ? 'var(--accent)' : 'var(--ink-3)',
              cursor: 'pointer',
              transition: 'color var(--dur) var(--ease), background var(--dur) var(--ease)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon name={t.icon} size={22} color={on ? 'var(--accent)' : 'var(--ink-3)'} strokeWidth={on ? 2.1 : 1.75} />
          </button>
        );
      })}
      <span style={{ flex: 1 }} />
      {bottom}
    </nav>
  );
}
