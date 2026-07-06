import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppBar, RegPill, TabBar, ARENA_TABS, ThemeToggle } from '@/design-system/arena';
import { useFormat } from '@/features/formats/FormatContext';

const ROUTE_BY_TAB: Record<string, string> = {
  calc: '/', teams: '/teams', sp: '/ev-converter', speed: '/speed-tiers',
};
const tabByPath = (path: string): string => {
  if (path.startsWith('/teams')) return 'teams';
  if (path.startsWith('/ev-converter')) return 'sp';
  if (path.startsWith('/speed-tiers')) return 'speed';
  return 'calc';
};
const TITLE_BY_TAB: Record<string, string> = {
  calc: 'Calculator', teams: 'Teams', sp: 'EV / SP', speed: 'Speed tiers',
};

/**
 * ArenaShell — the dark mobile frame: sticky AppBar + scrolling content + sticky
 * bottom TabBar, framing a single <Outlet/>. The RegPill opens an anchored
 * format-picker menu under the app bar.
 * Height-bounded (100dvh) so <main> is the scroll container and the calculator's
 * result HUD can pin to its top.
 */
const ArenaShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { format, setFormat, availableFormats } = useFormat();
  const [regOpen, setRegOpen] = useState(false);
  const active = tabByPath(location.pathname);
  const formats = availableFormats.length ? availableFormats : [format];

  return (
    <div style={{
      position: 'relative',
      height: '100dvh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-page)',
      fontFamily: 'var(--font-ui)',
      color: 'var(--text-body)',
    }}>
      <AppBar
        title={TITLE_BY_TAB[active]}
        right={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />
            <RegPill value={format} onClick={() => setRegOpen(true)} />
          </div>
        }
      />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </main>
      <TabBar active={active} tabs={ARENA_TABS} onChange={(id) => navigate(ROUTE_BY_TAB[id] ?? '/')} />
      {regOpen && (
        <>
          <div onClick={() => setRegOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 35 }} />
          <div role="menu" aria-label="Regulation" style={{
            position: 'absolute',
            top: 'calc(var(--appbar-h) + 4px)',
            right: 'var(--gutter)',
            zIndex: 40,
            minWidth: 180,
            padding: 4,
            background: 'var(--surface-card)',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-pop)',
          }}>
            {formats.map((f) => (
              <button
                key={f}
                type="button"
                role="menuitemradio"
                aria-checked={f === format}
                onClick={() => { setFormat(f); setRegOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  width: '100%',
                  minHeight: 'var(--tap-min)',
                  padding: '0 12px',
                  background: f === format ? 'var(--accent-soft)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--r-sm)',
                  color: f === format ? 'var(--accent)' : 'var(--ink-1)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--fs-body)',
                  fontWeight: f === format ? 'var(--fw-bold)' : 'var(--fw-medium)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {f}
                {f === format && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 auto' }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ArenaShell;
