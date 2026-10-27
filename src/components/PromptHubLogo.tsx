import React, { useId, useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export interface PromptHubLogoProps {
  /**
   * 'compact' | 'icon' -> SYMBOL ONLY (Strictly no text beside the symbol)
   * 'full' -> SYMBOL + 'PromptHub' Wordmark
   * 'auto' -> Responsive (Symbol only on mobile/compact viewports, Symbol + Wordmark on desktop)
   */
  variant?: 'full' | 'compact' | 'auto' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  inverted?: boolean;
  showBadge?: boolean;
  subtitle?: string;
  showTagline?: boolean;
  className?: string;
  alt?: string;
  ariaLabel?: string;
  role?: string;
  useImage?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  showTile?: boolean;
  useVector?: boolean;
  outline?: boolean;
  animated?: boolean;
  onClick?: () => void;
}

export interface PromptHubSymbolProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
  theme?: 'light' | 'dark' | 'auto';
  showTile?: boolean;
  useVector?: boolean;
  outline?: boolean;
  animated?: boolean;
}

/**
 * Robust hook determining the active theme:
 * 1. Explicit 'light' or 'dark' prop override.
 * 2. ThemeContext if mounted.
 * 3. <html> class (.dark) via MutationObserver fallback.
 */
export function useSafeResolvedTheme(preferredTheme?: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  const [domTheme, setDomTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  let contextTheme: 'light' | 'dark' | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useTheme();
    if (ctx?.resolvedTheme) {
      contextTheme = ctx.resolvedTheme;
    }
  } catch {
    // ThemeContext not mounted
  }

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sync = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setDomTheme(isDark ? 'dark' : 'light');
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  if (preferredTheme === 'light' || preferredTheme === 'dark') {
    return preferredTheme;
  }

  return contextTheme || domTheme;
}

/**
 * High-Precision Vector SVG of the Official PromptHub Brand Ribbon Loop:
 * 3D luminous Möbius ribbon ring with electric cyan, vibrant azure, and champagne gold sheen.
 *
 * Grounded in:
 * - Official Brand Sheet (media_1792427407709_6c2e30fa.jpg)
 * - Anti-slop craftsmanship: Zero elastic bounce, smooth quartic easing, infinite vector fidelity
 */
export const PromptHubVectorSymbol: React.FC<PromptHubSymbolProps> = ({
  size = 34,
  className = '',
  ariaLabel = 'PromptHub Ribbon Symbol',
  theme = 'auto',
  showTile = true,
  outline: _outline = false,
  animated = true,
}) => {
  const rawId = useId();
  const uid = `ph-ribbon-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const activeTheme = useSafeResolvedTheme(theme);
  const isDark = activeTheme === 'dark';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none transition-transform duration-200 group-hover:scale-[1.03] ${className}`}
      aria-label={ariaLabel}
      role="img"
    >
      <defs>
        {/* ─── Glowing Neon Filters ─── */}
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" opacity="0.45" />
            <feMergeNode in="blur1" opacity="0.8" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`${uid}-l-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0066FF" floodOpacity="0.10" />
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.04" />
        </filter>

        {/* ─── Tile Background Gradients ─── */}
        <linearGradient id={`${uid}-d-tile`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B1118" />
          <stop offset="60%" stopColor="#080B10" />
          <stop offset="100%" stopColor="#040609" />
        </linearGradient>

        <linearGradient id={`${uid}-l-tile`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#FAFBFD" />
          <stop offset="100%" stopColor="#F2F5F9" />
        </linearGradient>

        {/* ─── Ribbon Band Gradients ─── */}
        {/* Band 1: Electric Cyan to Royal Azure */}
        <linearGradient id={`${uid}-g-cyan`} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="30%" stopColor="#38B6FF" />
          <stop offset="70%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0038A8" />
        </linearGradient>

        {/* Band 2: Deep Sapphire to Vibrant Blue */}
        <linearGradient id={`${uid}-g-blue`} x1="85%" y1="20%" x2="15%" y2="85%">
          <stop offset="0%" stopColor="#38B6FF" />
          <stop offset="40%" stopColor="#0066FF" />
          <stop offset="85%" stopColor="#0040C0" />
          <stop offset="100%" stopColor="#002060" />
        </linearGradient>

        {/* Band 3: Luminous Champagne Pearl & Gold Sheen */}
        <linearGradient id={`${uid}-g-champagne`} x1="20%" y1="85%" x2="75%" y2="25%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#FFF9E8" />
          <stop offset="60%" stopColor="#F5E7CA" />
          <stop offset="85%" stopColor="#BDDDFC" />
          <stop offset="100%" stopColor="#38B6FF" />
        </linearGradient>

        {/* Inner Luminous Core Glow */}
        <radialGradient id={`${uid}-core-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#0066FF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
        </radialGradient>

        <style>{`
          @keyframes ph-ribbon-breathe-${uid} {
            0%, 100% {
              filter: drop-shadow(0 0 2px rgba(56, 182, 255, 0.35)) drop-shadow(0 0 8px rgba(0, 102, 255, 0.2));
            }
            50% {
              filter: drop-shadow(0 0 5px rgba(0, 240, 255, 0.65)) drop-shadow(0 0 16px rgba(0, 102, 255, 0.4));
            }
          }
          .${uid}-anim {
            animation: ${animated && isDark ? `ph-ribbon-breathe-${uid} 4s cubic-bezier(0.16, 1, 0.3, 1) infinite` : 'none'};
            transform-origin: 60px 60px;
          }
        `}</style>
      </defs>

      {/* ── Optional Squircle Tile Base ── */}
      {showTile && (
        <rect
          x="6"
          y="6"
          width="108"
          height="108"
          rx="26"
          fill={isDark ? `url(#${uid}-d-tile)` : `url(#${uid}-l-tile)`}
          stroke={isDark ? '#38B6FF' : '#0066FF'}
          strokeOpacity={isDark ? 0.25 : 0.12}
          strokeWidth="1.5"
          filter={!isDark ? `url(#${uid}-l-shadow)` : undefined}
        />
      )}

      {/* ── Internal Ambient Radial Halo (Dark Mode) ── */}
      {isDark && (
        <circle cx="60" cy="60" r="38" fill={`url(#${uid}-core-glow)`} />
      )}

      {/* ── Topological Möbius Ribbon Structure ── */}
      <g className={`${uid}-anim`} filter={isDark ? `url(#${uid}-glow)` : undefined}>
        {/* Layer 1: Back Under-Loop (Deep Royal Azure) */}
        <path
          d="M 40 46 C 44 32, 58 24, 74 28 C 88 32, 96 46, 94 60 C 92 72, 82 84, 68 88 C 54 92, 42 86, 36 78 C 42 74, 52 70, 62 66 C 72 62, 78 52, 74 44 C 70 36, 58 36, 50 42 Z"
          fill={`url(#${uid}-g-blue)`}
          opacity="0.95"
        />

        {/* Layer 2: Main Cyan Forward Sweeping Arch */}
        <path
          d="M 28 58 C 24 44, 32 30, 48 24 C 62 18, 78 22, 86 34 C 84 38, 78 40, 70 38 C 58 36, 46 42, 40 52 C 34 62, 36 74, 46 80 C 40 84, 32 80, 28 72 C 26 68, 26 62, 28 58 Z"
          fill={`url(#${uid}-g-cyan)`}
        />

        {/* Layer 3: Champagne & Luminous Light Refraction Ribbon Fold */}
        <path
          d="M 34 76 C 44 88, 62 92, 76 86 C 88 80, 94 68, 92 56 C 88 64, 80 72, 68 76 C 56 80, 46 76, 40 68 C 36 62, 38 52, 44 46 C 40 48, 36 54, 34 62 C 32 68, 32 72, 34 76 Z"
          fill={`url(#${uid}-g-champagne)`}
        />

        {/* Layer 4: Razor Crest Highlight (White-Hot Optical Reflection) */}
        <path
          d="M 46 25 C 60 19, 74 23, 82 32"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity={isDark ? "0.85" : "0.6"}
        />
        <path
          d="M 35 77 C 46 87, 62 91, 74 85"
          stroke="#FFF6E0"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity={isDark ? "0.9" : "0.5"}
        />
      </g>
    </svg>
  );
};

/**
 * Authoritative Canonical PromptHub Brand Symbol.
 * Dynamically switches between the official high-resolution squircle app icon
 * (crisp, transparent corners, calibrated for dark & light canvas) and the pure vector fallback.
 */
export const PromptHubSymbol: React.FC<PromptHubSymbolProps> = ({
  size = 34,
  className = '',
  ariaLabel = 'PromptHub Symbol',
  theme = 'auto',
  showTile = false,
  useVector = false,
  outline = false,
  animated = true,
}) => {
  const activeTheme = useSafeResolvedTheme(theme);
  const isDark = activeTheme === 'dark';
  const [imgError, setImgError] = useState(false);

  // If pure vector is explicitly requested or image failed to load, render vector fallback
  if (useVector || imgError) {
    return (
      <PromptHubVectorSymbol
        size={size}
        className={className}
        ariaLabel={ariaLabel}
        theme={theme}
        showTile={showTile}
        outline={outline}
        animated={animated}
      />
    );
  }

  // When showTile is true, render official App Icon squircle (app icon tile)
  // When showTile is false, render official transparent symbol ribbon mark (borderless, no tile)
  const darkSrc = showTile 
    ? '/branding/prompthub-icon-dark.png' 
    : '/branding/prompthub-symbol-dark.png';
  const darkSrcSet = showTile
    ? '/branding/prompthub-icon-dark.png 1x, /branding/prompthub-icon-dark-512.png 2x'
    : '/branding/prompthub-symbol-dark.png 1x, /branding/prompthub-symbol-dark-512.png 2x';

  const lightSrc = showTile 
    ? '/branding/prompthub-icon-light.png' 
    : '/branding/prompthub-symbol-light.png';
  const lightSrcSet = showTile
    ? '/branding/prompthub-icon-light.png 1x, /branding/prompthub-icon-light-512.png 2x'
    : '/branding/prompthub-symbol-light.png 1x, /branding/prompthub-symbol-light-512.png 2x';

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-200 group-hover:scale-[1.03] ${className}`}
    >
      <img
        src={isDark ? darkSrc : lightSrc}
        srcSet={isDark ? darkSrcSet : lightSrcSet}
        alt={ariaLabel}
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        onError={() => setImgError(true)}
        className={`w-full h-full object-contain pointer-events-none ${
          showTile ? 'rounded-[22%] drop-shadow-xs' : ''
        }`}
      />
    </div>
  );
};

/**
 * Authoritative Canonical PromptHub Brand Logo
 * Intelligently switches between Full (Symbol + Wordmark) and Compact/Icon (Symbol Only).
 * High-precision official brand assets calibrated for both Pitch Dark and Light Canvas themes.
 */
export const PromptHubLogo: React.FC<PromptHubLogoProps> = ({
  variant = 'auto',
  size = 'md',
  inverted = false,
  showBadge = false,
  subtitle,
  showTagline = false,
  className = '',
  alt = 'PromptHub',
  ariaLabel = 'PromptHub home',
  theme = 'auto',
  showTile = false,
  useVector = false,
  outline = false,
  animated = true,
  useImage = false,
  onClick,
}) => {
  const getIconDimensions = () => {
    if (typeof size === 'number') {
      return { width: size, height: size, textClass: 'text-base', subClass: 'text-[9px]' };
    }
    switch (size) {
      case 'xs':
        return { width: 22, height: 22, textClass: 'text-xs', subClass: 'text-[8px]' };
      case 'sm':
        return { width: 28, height: 28, textClass: 'text-sm', subClass: 'text-[9px]' };
      case 'lg':
        return { width: 44, height: 44, textClass: 'text-xl', subClass: 'text-[11px]' };
      case 'xl':
        return { width: 56, height: 56, textClass: 'text-2xl', subClass: 'text-xs' };
      case 'md':
      default:
        return { width: 34, height: 34, textClass: 'text-base', subClass: 'text-[9px]' };
    }
  };

  const dim = getIconDimensions();
  const effectiveTheme: 'light' | 'dark' | 'auto' = inverted ? 'dark' : theme;
  const activeTheme = useSafeResolvedTheme(effectiveTheme);
  const isDark = activeTheme === 'dark';
  const isTileMode = showTile ?? false;
  const resolvedSubtitle = subtitle ?? (showTagline ? "AI WORKSPACE FOR WHAT'S NEXT" : undefined);

  const renderSymbol = () => (
    <PromptHubSymbol
      size={dim.width}
      ariaLabel={alt}
      theme={effectiveTheme}
      showTile={isTileMode}
      useVector={useVector}
      outline={outline}
      animated={animated}
    />
  );

  // Optional Direct Full Logo Image Asset
  if (useImage) {
    return (
      <div
        onClick={onClick}
        className={`group inline-flex items-center select-none shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ height: dim.height }}
        role={onClick ? 'button' : 'img'}
        aria-label={ariaLabel || alt}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      >
        <img
          src={isDark ? '/branding/prompthub-logo-dark.png' : '/branding/prompthub-logo-light.png'}
          alt={alt}
          className="h-full w-auto object-contain select-none"
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  // 1. Compact / Icon Variant: SYMBOL ONLY — Strictly NO wordmark text beside it
  if (variant === 'compact' || variant === 'icon') {
    return (
      <div
        onClick={onClick}
        className={`group inline-flex items-center justify-center select-none shrink-0 transition-transform duration-150 ${onClick ? 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]' : ''} ${className}`}
        style={{ width: dim.width, height: dim.height }}
        role={onClick ? 'button' : 'img'}
        aria-label={ariaLabel || alt}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      >
        {renderSymbol()}
      </div>
    );
  }

  // 2. Full Variant: Symbol + Wordmark
  if (variant === 'full') {
    return (
      <div
        onClick={onClick}
        className={`group inline-flex items-center gap-2.5 select-none shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        role={onClick ? 'button' : 'img'}
        aria-label={ariaLabel || alt}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      >
        <div 
          className="shrink-0 flex items-center justify-center"
          style={{ width: dim.width, height: dim.height }}
        >
          {renderSymbol()}
        </div>
        <div className="flex flex-col text-left leading-none justify-center">
          <div className="flex items-center gap-1.5">
            <span className={`font-black font-display tracking-tight transition-colors duration-150 ${isDark ? 'text-white' : 'text-[#0B1118] dark:text-white'} ${dim.textClass || 'text-base'}`}>
              Prompt<span className={`transition-colors duration-150 ${isDark ? 'text-[#38B6FF]' : 'text-[#0066FF] dark:text-[#38B6FF]'}`}>Hub</span>
            </span>
            {showBadge && (
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors duration-150 ${isDark ? 'text-[#38B6FF] bg-[#38B6FF]/15 border-[#38B6FF]/30' : 'text-[#0066FF] bg-[#0066FF]/10 border-[#0066FF]/25 dark:text-[#38B6FF] dark:bg-[#38B6FF]/15 dark:border-[#38B6FF]/30'}`}>
                Studio
              </span>
            )}
          </div>
          {resolvedSubtitle && (
            <span className={`font-sans font-semibold mt-1 tracking-[0.22em] uppercase transition-colors duration-150 ${isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'} ${dim.subClass || 'text-[9px]'}`}>
              {resolvedSubtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. Auto (Responsive) Variant: Symbol always visible; Wordmark hidden on small screens, visible on md+
  return (
    <div
      onClick={onClick}
      className={`group inline-flex items-center gap-2.5 select-none shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      role={onClick ? 'button' : 'img'}
      aria-label={ariaLabel || alt}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div 
        className="shrink-0 flex items-center justify-center"
        style={{ width: dim.width, height: dim.height }}
      >
        {renderSymbol()}
      </div>
      <div className="hidden md:flex flex-col text-left leading-none justify-center">
        <div className="flex items-center gap-1.5">
          <span className={`font-black font-display tracking-tight transition-colors duration-150 ${isDark ? 'text-white' : 'text-[#0B1118] dark:text-white'} ${dim.textClass || 'text-base'}`}>
            Prompt<span className={`transition-colors duration-150 ${isDark ? 'text-[#38B6FF]' : 'text-[#0066FF] dark:text-[#38B6FF]'}`}>Hub</span>
          </span>
          {showBadge && (
            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors duration-150 ${isDark ? 'text-[#38B6FF] bg-[#38B6FF]/15 border-[#38B6FF]/30' : 'text-[#0066FF] bg-[#0066FF]/10 border-[#0066FF]/25 dark:text-[#38B6FF] dark:bg-[#38B6FF]/15 dark:border-[#38B6FF]/30'}`}>
              Studio
            </span>
          )}
        </div>
        {resolvedSubtitle && (
          <span className={`font-sans font-semibold mt-1 tracking-[0.22em] uppercase transition-colors duration-150 ${isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'} ${dim.subClass || 'text-[9px]'}`}>
            {resolvedSubtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default PromptHubLogo;
