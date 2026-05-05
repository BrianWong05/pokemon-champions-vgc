import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Layout: React.FC = () => {
  const location = useLocation();

  const getLinkClass = (path: string) => {
    const baseClass = "px-4 py-2 rounded-md transition-colors";
    return location.pathname === path 
      ? `${baseClass} bg-blue-700 text-white font-semibold`
      : `${baseClass} text-blue-100 hover:bg-blue-600`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Pokemon Champions VGC</h1>
          <nav className="flex gap-2">
            <Link to="/" className={getLinkClass('/')}>
              Damage Calculator
            </Link>
            <Link to="/ev-converter" className={getLinkClass('/ev-converter')}>
              EV/SP Converter
            </Link>
            <Link to="/speed-tiers" className={getLinkClass('/speed-tiers')}>
              Speed Tiers
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;