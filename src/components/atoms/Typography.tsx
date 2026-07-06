import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'body' | 'label';
  className?: string;
}

const Typography: React.FC<TypographyProps> = ({ children, variant = 'body', className = '' }) => {
  const baseClasses = {
    h1: 'text-3xl font-bold text-ink-1 font-display tracking-tight',
    h2: 'text-xl font-semibold text-ink-1 font-display',
    body: 'text-ink-2',
    label: 'text-xs font-bold text-ink-3 uppercase tracking-wider',
  };

  const Component = variant === 'h1' ? 'h1' : variant === 'h2' ? 'h2' : 'span';

  return (
    <Component className={`${baseClasses[variant]} ${className}`}>
      {children}
    </Component>
  );
};

export default Typography;
