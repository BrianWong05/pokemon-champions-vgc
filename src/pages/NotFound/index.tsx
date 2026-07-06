import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="font-display text-6xl font-bold text-ink-1 mb-4">404</h2>
      <p className="text-xl text-ink-2 mb-8">Page Not Found</p>
      <Link
        to="/"
        className="bg-accent text-accent-ink px-6 py-3 rounded-lg hover:bg-accent-hover transition-colors"
      >
        Return to home
      </Link>
    </div>
  );
};

export default NotFound;