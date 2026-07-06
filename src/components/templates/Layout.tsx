import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useFormat } from '@/features/formats/FormatContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import ArenaShell from '@/components/templates/ArenaShell';

const Layout: React.FC = () => {
  const location = useLocation();
  const { format, setFormat, availableFormats } = useFormat();
  const isMobile = useIsMobile();
  const formatOptions = availableFormats.length ? availableFormats : [format];

  const getLinkClass = (path: string, exact: boolean = true) => {
    const baseClass = "px-4 py-2 rounded-lg transition-colors";
    const isActive = exact
      ? location.pathname === path
      : location.pathname.startsWith(path);

    return isActive
      ? `${baseClass} bg-accent-soft text-accent border border-accent-soft-line font-semibold`
      : `${baseClass} text-ink-2 border border-transparent hover:bg-inset hover:text-ink-1`;
  };

  if (isMobile) return <ArenaShell />;

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <header className="bg-[var(--bg-appbar)] backdrop-blur border-b border-line sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold font-display text-ink-1 tracking-tight">Pokemon Champions VGC</h1>
          <nav className="flex gap-2 items-center">
            <Link to="/" className={getLinkClass('/')}>
              Damage calculator
            </Link>
            <Link to="/teams" className={getLinkClass('/teams', false)}>
              Teams
            </Link>
            <Link to="/ev-converter" className={getLinkClass('/ev-converter')}>
              EV/SP converter
            </Link>
            <Link to="/speed-tiers" className={getLinkClass('/speed-tiers')}>
              Speed tiers
            </Link>
            <label className="flex items-center gap-2 ml-2 text-sm text-ink-3">
              Regulation
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="rounded-lg px-2 py-1 bg-inset text-ink-1 border border-line-2"
              >
                {formatOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-ink-4 py-3 px-4">
        Not affiliated with Nintendo, Game Freak, or The Pokémon Company.
      </footer>
    </div>
  );
};

export default Layout;