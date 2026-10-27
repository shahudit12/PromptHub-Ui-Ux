import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface ThemeToggleProps {
  variant?: 'compact' | 'segmented' | 'icon-only';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { resolvedTheme, toggleTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 1. Segmented 2-Option Radio-Group (Light / Dark) for Settings
  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme mode selection"
        className={`inline-flex items-center p-1 rounded-xl bg-bg-tertiary border border-border-default gap-1 select-none ${className}`}
      >
        <button
          type="button"
          role="radio"
          aria-checked={!isDark}
          tabIndex={!isDark ? 0 : -1}
          onClick={() => setTheme('light')}
          className={`min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            !isDark
              ? 'bg-white text-brand-primary shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Light</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={isDark}
          tabIndex={isDark ? 0 : -1}
          onClick={() => setTheme('dark')}
          className={`min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isDark
              ? 'bg-bg-secondary text-text-primary shadow-xs border border-border-default'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Moon className="w-4 h-4 text-blue-400" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  // 2. Default Compact / Icon-Only 1-Click Toggle
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const hasCustomSize = className.includes('min-h-') || className.includes('h-') || className.includes('w-');
  const sizeClasses = hasCustomSize ? '' : 'min-h-[44px] min-w-[44px]';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`${sizeClasses} flex items-center justify-center rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:scale-95 select-none ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center pointer-events-none overflow-hidden">
        <Sun
          className={`w-4 h-4 text-amber-400 absolute transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isDark
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-90 scale-0 opacity-0'
          }`}
        />
        <Moon
          className={`w-4 h-4 text-slate-800 dark:text-slate-200 absolute transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isDark
              ? '-rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100'
          }`}
        />
      </div>
      <span className="sr-only">{label}</span>
    </button>
  );
};

export default ThemeToggle;
