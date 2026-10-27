import React, { useId } from 'react';
import { useSafeResolvedTheme } from './PromptHubLogo';

export interface ByokLogoProps {
  /**
   * 'icon'   -> Pure key vector (no tile or text)
   * 'tile'   -> Key symbol inside an authentic Obsidian/Slate squircle tile
   * 'full'   -> Key symbol (with tile) + "BYOK Vault" branded wordmark
   * 'badge'  -> Compact status pill with key symbol and "BYOK Direct" label
   */
  variant?: 'icon' | 'tile' | 'full' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  theme?: 'light' | 'dark' | 'auto';
  showTile?: boolean;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
  subtitle?: string;
}

export interface ByokSymbolProps {
  size?: number;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  showTile?: boolean;
  animated?: boolean;
  ariaLabel?: string;
}

const SIZE_MAP: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 44,
  lg: 58,
  xl: 78,
};

/**
 * High-Precision Vector SVG of the Official PromptHub BYOK (Bring Your Own Key) Brand Symbol.
 *
 * Grounded in:
 * - Brand Prototype Key Silhouette (media_1792440926258_e79c01df.png)
 * - 45-degree angled precision key with concentric bow ring, dual rounded bit wards, and chamfered tip.
 * - Anti-slop craftsmanship adhering to DESIGN.md tokens:
 *   - Dark Canvas / Obsidian: Electric Cyan (#00F0FF) to Sapphire (#0066FF) with ambient neon bloom.
 *   - Light Canvas / Slate: Oceanic Azure (#38B6FF) to Royal Blue (#0047BA) with soft dimensional drop shadow.
 */
export const ByokVectorSymbol: React.FC<ByokSymbolProps> = ({
  size = 40,
  className = '',
  theme = 'auto',
  showTile = true,
  animated = true,
  ariaLabel = 'PromptHub BYOK Key Logo',
}) => {
  const rawId = useId();
  const uid = `ph-byok-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
        {/* ─── Glowing Neon Bloom Filter (Dark Mode) ─── */}
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.8" result="b2" />
          <feMerge>
            <feMergeNode in="b2" opacity="0.45" />
            <feMergeNode in="b1" opacity="0.75" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ─── Soft Ambient Drop Shadow (Light Mode) ─── */}
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="4.5" floodColor="#0066FF" floodOpacity="0.14" />
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.05" />
        </filter>

        {/* ─── Tile Gradients ─── */}
        <linearGradient id={`${uid}-tile-dark`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F1722" />
          <stop offset="50%" stopColor="#090E15" />
          <stop offset="100%" stopColor="#040609" />
        </linearGradient>

        <linearGradient id={`${uid}-tile-light`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#EDF2F7" />
        </linearGradient>

        {/* ─── Key Gradients ─── */}
        {/* Dark Mode: Electric Cyan -> Azure -> Deep Sapphire */}
        <linearGradient id={`${uid}-key-dark`} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="30%" stopColor="#38B6FF" />
          <stop offset="70%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0038A8" />
        </linearGradient>

        {/* Light Mode: Oceanic Azure -> Royal Blue -> Deep Indigo */}
        <linearGradient id={`${uid}-key-light`} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#38B6FF" />
          <stop offset="35%" stopColor="#0066FF" />
          <stop offset="75%" stopColor="#0047BA" />
          <stop offset="100%" stopColor="#002B7A" />
        </linearGradient>

        {/* ─── Inner Sheen Chamfer Highlight ─── */}
        <linearGradient id={`${uid}-sheen`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Subtle breathing animation */}
        <style>{`
          @keyframes ph-byok-pulse-${uid} {
            0%, 100% {
              filter: drop-shadow(0 0 2px rgba(56, 182, 255, 0.35)) drop-shadow(0 0 6px rgba(0, 102, 255, 0.2));
            }
            50% {
              filter: drop-shadow(0 0 4.5px rgba(0, 240, 255, 0.6)) drop-shadow(0 0 12px rgba(0, 102, 255, 0.38));
            }
          }
          .${uid}-pulse {
            animation: ${animated && isDark ? `ph-byok-pulse-${uid} 4s cubic-bezier(0.16, 1, 0.3, 1) infinite` : 'none'};
          }
        `}</style>
      </defs>

      {/* ── Optional Squircle Tile Base ── */}
      {showTile && (
        <g>
          {/* Base squircle with authoritative theme border */}
          <rect
            x="6"
            y="6"
            width="108"
            height="108"
            rx="26"
            fill={isDark ? `url(#${uid}-tile-dark)` : `url(#${uid}-tile-light)`}
            stroke={isDark ? '#2C4258' : '#D6D1A8'}
            strokeWidth="2.5"
            filter={!isDark ? `url(#${uid}-shadow)` : undefined}
          />
          {/* Subtle interior rim reflection */}
          <rect
            x="8.5"
            y="8.5"
            width="103"
            height="103"
            rx="23.5"
            fill="none"
            stroke={isDark ? 'rgba(56, 182, 255, 0.35)' : 'rgba(0, 71, 186, 0.18)'}
            strokeWidth="1.2"
          />
        </g>
      )}

      {/* ── Key Silhouette Angled at 45° ── */}
      <g
        transform="translate(60, 60) rotate(45) translate(-60, -60)"
        filter={isDark ? `url(#${uid}-glow)` : `url(#${uid}-shadow)`}
        className={`${uid}-pulse`}
      >
        {/* Main Solid Compound Key Path with Circular Eyelet Hole */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fill={isDark ? `url(#${uid}-key-dark)` : `url(#${uid}-key-light)`}
          d="
            M 40 36
            A 24 24 0 1 0 63.36 65.5
            L 74 65.5
            L 74 72
            A 2.5 2.5 0 0 0 76.5 74.5
            L 79.5 74.5
            A 2.5 2.5 0 0 0 82 72
            L 82 65.5
            L 86.5 65.5
            L 86.5 74
            A 2.5 2.5 0 0 0 89 76.5
            L 93 76.5
            A 2.5 2.5 0 0 0 95.5 74
            L 95.5 65.5
            L 101 65.5
            A 3 3 0 0 0 104 62.5
            L 104 57.5
            A 3 3 0 0 0 101 54.5
            L 63.36 54.5
            A 24 24 0 0 0 40 36
            Z
            M 40 48
            A 12 12 0 1 1 40 72
            A 12 12 0 1 1 40 48
            Z
          "
        />

        {/* Precision Chamfer Highlight Stroke on the Key Edge */}
        <path
          fill="none"
          stroke={`url(#${uid}-sheen)`}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={isDark ? 0.7 : 0.4}
          d="
            M 20 48
            A 24 24 0 0 1 56 40
            L 101 54.5
            A 3 3 0 0 1 104 57.5
            L 104 62.5
          "
        />
      </g>
    </svg>
  );
};

/**
 * Universal PromptHub BYOK Logo Component.
 * Supports icon, tile, full (with wordmark), and badge variants.
 */
export const ByokLogo: React.FC<ByokLogoProps> = ({
  variant = 'icon',
  size = 'md',
  theme = 'auto',
  showTile,
  animated = true,
  className = '',
  ariaLabel = 'PromptHub BYOK Key Logo',
  onClick,
  subtitle = 'Direct Provider Keys',
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40;
  const isTileExplicit = showTile !== undefined ? showTile : (variant === 'tile' || variant === 'full');

  if (variant === 'badge') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-primary-light border border-brand-primary/25 text-brand-primary text-xs font-mono font-semibold select-none ${
          onClick ? 'cursor-pointer hover:bg-brand-primary/20 transition-colors' : ''
        } ${className}`}
        aria-label={ariaLabel}
      >
        <ByokVectorSymbol
          size={16}
          theme={theme}
          showTile={false}
          animated={false}
        />
        <span>BYOK Vault</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-3 select-none ${
          onClick ? 'cursor-pointer group' : ''
        } ${className}`}
        aria-label={ariaLabel}
      >
        <ByokVectorSymbol
          size={pixelSize}
          theme={theme}
          showTile={isTileExplicit}
          animated={animated}
        />
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold font-display text-text-primary tracking-tight">
              BYOK
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.2 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              Vault
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] font-mono text-text-secondary leading-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
      aria-label={ariaLabel}
    >
      <ByokVectorSymbol
        size={pixelSize}
        theme={theme}
        showTile={isTileExplicit}
        animated={animated}
      />
    </div>
  );
};

export default ByokLogo;
