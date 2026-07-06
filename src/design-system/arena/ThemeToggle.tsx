import React from 'react';
import { Icon } from './Icon';
import { useTheme } from './theme';

/** ThemeToggle — round icon button showing the theme you'll switch to. */
export function ThemeToggle({ style = {} }: { style?: React.CSSProperties }) {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 'var(--r-pill)',
        background: 'transparent',
        border: '1px solid var(--line-2)',
        color: 'var(--ink-2)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <Icon name={next === 'light' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
