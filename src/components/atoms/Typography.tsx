import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'body' | 'label';
  className?: string;
}

const Typography: React.FC<TypographyProps> = ({ children, variant = 'body', className = '' }) => {
  const baseClasses = {
    h1: 'text-3xl font-bold text-gray-900',
    h2: 'text-xl font-semibold text-gray-800',
    body: 'text-gray-700',
    label: 'text-xs font-bold text-gray-500 uppercase tracking-wider',
  };

  const Component = variant === 'h1' ? 'h1' : variant === 'h2' ? 'h2' : 'span';

  return (
    <Component className={`${baseClasses[variant]} ${className}`}>
      {children}
    </Component>
  );
};

export default Typography;
