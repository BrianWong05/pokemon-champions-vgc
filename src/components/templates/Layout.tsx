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
    const baseClass = "px-4 py-2 rounded-md transition-colors";
    const isActive = exact 
      ? location.pathname === path 
      : location.pathname.startsWith(path);
      
    return isActive 
      ? `${baseClass} bg-blue-700 text-white font-semibold`
      : `${baseClass} text-blue-100 hover:bg-blue-600`;
  };

  if (isMobile) return <ArenaShell />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Pokemon Champions VGC</h1>
          <nav className="flex gap-2">
            <Link to="/" className={getLinkClass('/')}>
              Damage Calculator
            </Link>
            <Link to="/teams" className={getLinkClass('/teams', false)}>
              Teams
            </Link>
            <Link to="/ev-converter" className={getLinkClass('/ev-converter')}>
              EV/SP Converter
            </Link>
            <Link to="/speed-tiers" className={getLinkClass('/speed-tiers')}>
              Speed Tiers
            </Link>
            <label className="flex items-center gap-2 ml-2 text-sm text-blue-100">
              Regulation
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="rounded-md px-2 py-1 text-gray-800 bg-white"
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
      <footer className="text-center text-xs text-gray-400 py-3 px-4">
        Not affiliated with Nintendo, Game Freak, or The Pokémon Company.
      </footer>
    </div>
  );
};

export default Layout;