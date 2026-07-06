import React from 'react';

export interface ArenaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  icon?: React.ReactNode;
}

const SIZES = {
  sm: { height: 36, padding: '0 12px', fontSize: 13, radius: 'var(--r-sm)', gap: 6 },
  md: { height: 44, padding: '0 16px', fontSize: 14, radius: 'var(--r-md)', gap: 8 },
  lg: { height: 50, padding: '0 20px', fontSize: 15, radius: 'var(--r-md)', gap: 8 },
} as const;

const VARIANTS = {
  primary: { background: 'var(--accent)', color: 'var(--accent-ink)', border: '1px solid transparent' },
  secondary: { background: 'var(--surface-inset)', color: 'var(--ink-1)', border: '1px solid var(--line-2)' },
  ghost: { background: 'transparent', color: 'var(--ink-2)', border: '1px solid transparent' },
  danger: { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-line)' },
} as const;

export const Button: React.FC<ArenaButtonProps> = ({
  children, variant = 'primary', size = 'md', block = false, disabled = false, icon = null, style, ...rest
}) => {
  const s = SIZES[size];
  return (
    <button
      disabled={disabled}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : 'auto',
        alignItems: 'center', justifyContent: 'center',
        gap: s.gap, height: s.height, padding: s.padding,
        fontFamily: 'var(--font-ui)', fontSize: s.fontSize, fontWeight: 700,
        letterSpacing: '0.005em', lineHeight: 1, borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'filter var(--dur) var(--ease), transform var(--dur-fast) var(--ease)',
        WebkitTapHighlightColor: 'transparent',
        ...VARIANTS[variant], ...style,
      }}
      onPointerDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};
