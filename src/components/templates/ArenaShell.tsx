import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppBar, RegPill, TabBar, ARENA_TABS, Sheet, Chip, ChipGroup, ThemeToggle } from '@/design-system/arena';
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
 * bottom TabBar, framing a single <Outlet/>. The RegPill opens a format-picker Sheet.
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
      <Sheet open={regOpen} onClose={() => setRegOpen(false)} title="Regulation">
        <ChipGroup wrap>
          {formats.map((f) => (
            <Chip key={f} active={f === format} onClick={() => { setFormat(f); setRegOpen(false); }}>{f}</Chip>
          ))}
        </ChipGroup>
      </Sheet>
    </div>
  );
};

export default ArenaShell;
