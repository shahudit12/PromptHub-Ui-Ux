import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ResolvedTheme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AppearanceMode = 'light' | 'dark' | 'dark-glass' | 'dark-solid';

export interface ThemeContextProps {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  appearanceMode: AppearanceMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setAppearanceMode: (mode: AppearanceMode) => void;
}

const STORAGE_KEY = 'prompthub-theme';
const LEGACY_STORAGE_KEY = 'prompthub-appearance-mode';

/**
 * Resolves the initial theme using the canonical algorithm:
 * 1. Check prompthub-theme or legacy prompthub-appearance-mode.
 * 2. Migrate dark-glass/dark-solid to 'dark', light to 'light'.
 * 3. Default to 'light' for all new visitors with no stored preference.
 */
export function resolveInitialTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const params = new URLSearchParams(window.location.search);
    const queryTheme = params.get('theme');
    if (queryTheme === 'dark' || queryTheme === 'light') {
      return queryTheme;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (
      stored === 'dark' ||
      stored === 'dark-glass' ||
      stored === 'dark-solid' ||
      legacy === 'dark' ||
      legacy === 'dark-glass' ||
      legacy === 'dark-solid'
    ) {
      // Migrate legacy key
      try {
        localStorage.setItem(STORAGE_KEY, 'dark');
        if (legacy) localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {}
      return 'dark';
    }

    if (stored === 'light' || legacy === 'light') {
      try {
        localStorage.setItem(STORAGE_KEY, 'light');
        if (legacy) localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {}
      return 'light';
    }
  } catch (e) {
    console.warn('[ThemeContext] LocalStorage read failed:', e);
  }

  // Requirement: For new users without a preference, default to light
  return 'light';
}

/**
 * Temporarily disables all CSS transitions across all DOM elements during a theme change.
 * This completely eliminates the massive main-thread lag, style recalculations, and visual
 * tearing caused by hundreds of elements with transition-colors / transition-all fighting each other.
 */
function disableElementTransitions(): () => void {
  if (typeof document === 'undefined') return () => {};
  const css = document.createElement('style');
  css.setAttribute('type', 'text/css');
  css.setAttribute('data-ph-theme-lock', 'true');
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  // Force reflow so the style is applied before DOM theme attributes change
  if (document.body) {
    void document.body.offsetHeight;
  }

  return () => {
    // Re-enable transitions cleanly on the next animation frame
    requestAnimationFrame(() => {
      try {
        if (document.head.contains(css)) {
          document.head.removeChild(css);
        }
      } catch {}
    });
  };
}

/**
 * Synchronously applies the active theme to the document root and meta tags.
 */
export function applyThemeToDOM(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = theme === 'dark';

  root.setAttribute('data-theme', theme);
  root.setAttribute('data-appearance', isDark ? 'dark' : 'light');

  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    if (document.body) {
      document.body.style.colorScheme = 'dark';
    }
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    if (document.body) {
      document.body.style.colorScheme = 'light';
    }
  }

  const metaThemeColors = document.querySelectorAll('meta[name="theme-color"]');
  const targetColor = isDark ? '#000000' : '#F0EDCE';
  metaThemeColors.forEach((meta) => {
    meta.setAttribute('content', targetColor);
  });
}

/**
 * Executes the theme transition smoothly using the View Transitions API where supported,
 * or immediate transition-suppressed swap for 0ms lag in other browsers.
 */
function executeThemeTransition(nextTheme: ResolvedTheme, applyState: () => void) {
  if (typeof document === 'undefined') {
    applyState();
    return;
  }

  // 1. If document.startViewTransition is supported and reduced motion is not requested:
  // Use GPU-composited raster cross-fade (100% 60fps/120fps hardware acceleration, zero main-thread lag).
  if (
    'startViewTransition' in document &&
    typeof (document as any).startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    const cleanupTransitions = disableElementTransitions();
    try {
      const transition = (document as any).startViewTransition(() => {
        applyThemeToDOM(nextTheme);
        applyState();
      });
      transition.finished.finally(() => {
        cleanupTransitions();
      });
      return;
    } catch {
      cleanupTransitions();
      applyThemeToDOM(nextTheme);
      applyState();
      return;
    }
  }

  // 2. High-performance fallback:
  // Suppress element-level transitions so all elements swap tokens in a single 16ms frame without lag or tearing.
  const cleanupTransitions = disableElementTransitions();
  applyThemeToDOM(nextTheme);
  applyState();
  cleanupTransitions();
}

export const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(resolveInitialTheme);

  // Core transition dispatcher with storage persistence
  const changeTheme = useCallback((targetTheme: ResolvedTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, targetTheme);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.warn('[ThemeContext] LocalStorage write failed:', e);
    }

    executeThemeTransition(targetTheme, () => {
      setResolvedTheme(targetTheme);
    });
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    if (mode === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      changeTheme(prefersDark ? 'dark' : 'light');
    } else {
      changeTheme(mode === 'dark' ? 'dark' : 'light');
    }
  }, [changeTheme]);

  const toggleTheme = useCallback(() => {
    const next: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    changeTheme(next);
  }, [resolvedTheme, changeTheme]);

  // Backward compatibility alias for setAppearanceMode
  const setAppearanceMode = useCallback((mode: AppearanceMode) => {
    const target: ResolvedTheme = mode === 'light' ? 'light' : 'dark';
    changeTheme(target);
  }, [changeTheme]);

  // Initial synchronization on client mount (once only)
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, []);

  // Multi-tab synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const next: ResolvedTheme = e.newValue === 'dark' ? 'dark' : 'light';
        executeThemeTransition(next, () => {
          setResolvedTheme(next);
        });
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        resolvedTheme,
        appearanceMode: resolvedTheme,
        setTheme,
        toggleTheme,
        setAppearanceMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
