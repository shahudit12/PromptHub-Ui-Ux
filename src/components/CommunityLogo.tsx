import React, { useId } from 'react';
import { useSafeResolvedTheme } from './PromptHubLogo';

export interface CommunityLogoProps {
  /**
   * 'icon'   -> Pure network topology vector (no tile or text)
   * 'tile'   -> Network symbol inside an authentic Obsidian/Slate squircle tile
   * 'full'   -> Network symbol (with tile) + "Community Hub" branded wordmark
   * 'badge'  -> Compact status pill with network symbol and "Community" label
   */
  variant?: 'icon' | 'tile' | 'full' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  theme?: 'light' | 'dark' | 'auto';
  palette?: 'brand' | 'emerald';
  showTile?: boolean;
  animated?: boolean;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
  subtitle?: string;
}

export interface CommunitySymbolProps {
  size?: number;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  palette?: 'brand' | 'emerald';
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
 * High-Precision Vector SVG of the Official PromptHub Community Brand Symbol.
 *
 * Grounded in:
 * - Brand Prototype Network Graph (media_1792441020670_9459606e.png)
 * - Hub-and-spoke community topology: 1 central coordinator hub + 7 radiating satellite nodes
 * - Anti-slop craftsmanship strictly adhering to DESIGN.md tokens:
 *   - Primary Blue: #6A89A7
 *   - Light Blue: #BDDDFC
 *   - Bright Blue: #88BDF2
 *   - Deep Navy: #384959
 *   - Light Canvas: #F8FBFE
 *   - Dark Canvas: #1F2A34
 * - Safe squircle padding ensures satellite nodes never overflow or collide with squircle tile boundaries.
 */
export const CommunityVectorSymbol: React.FC<CommunitySymbolProps> = ({
  size = 40,
  className = '',
  theme = 'auto',
  palette = 'brand',
  showTile = true,
  animated = true,
  ariaLabel = 'PromptHub Community Logo',
}) => {
  const rawId = useId();
  const uid = `ph-comm-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
        {/* ─── Ambient Glow Filter (Dark Mode) adhering to PromptHub Blue tokens ─── */}
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.0" result="b2" />
          <feMerge>
            <feMergeNode in="b2" opacity="0.35" />
            <feMergeNode in="b1" opacity="0.65" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ─── Soft Ambient Drop Shadow (Light Mode) ─── */}
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" floodColor="#384959" floodOpacity="0.12" />
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#1F2A34" floodOpacity="0.04" />
        </filter>

        {/* ─── Squircle Tile Gradients (Dark Canvas #1F2A34 / Light Canvas #F8FBFE) ─── */}
        <linearGradient id={`${uid}-tile-dark`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#253340" />
          <stop offset="50%" stopColor="#1F2A34" />
          <stop offset="100%" stopColor="#172028" />
        </linearGradient>

        <linearGradient id={`${uid}-tile-light`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F8FBFE" />
          <stop offset="100%" stopColor="#EDF4FA" />
        </linearGradient>

        {/* ─── Node & Spoke Gradients adhering to PromptHub Palette ─── */}
        {/* Dark Mode Brand: Light Blue #BDDDFC -> Bright Blue #88BDF2 -> Primary Blue #6A89A7 */}
        <linearGradient id={`${uid}-node-dark-brand`} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#BDDDFC" />
          <stop offset="45%" stopColor="#88BDF2" />
          <stop offset="100%" stopColor="#6A89A7" />
        </linearGradient>

        {/* Dark Mode Emerald */}
        <linearGradient id={`${uid}-node-dark-emerald`} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Light Mode Brand: Primary Blue #6A89A7 -> Deep Navy #384959 */}
        <linearGradient id={`${uid}-node-light-brand`} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#6A89A7" />
          <stop offset="55%" stopColor="#4D6882" />
          <stop offset="100%" stopColor="#384959" />
        </linearGradient>

        {/* Light Mode Emerald */}
        <linearGradient id={`${uid}-node-light-emerald`} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="60%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>

        {/* Subtle breathing animation */}
        <style>{`
          @keyframes ph-comm-pulse-${uid} {
            0%, 100% {
              filter: drop-shadow(0 0 2px rgba(136, 189, 242, 0.35)) drop-shadow(0 0 5px rgba(106, 137, 167, 0.2));
            }
            50% {
              filter: drop-shadow(0 0 4px rgba(189, 221, 252, 0.55)) drop-shadow(0 0 9px rgba(136, 189, 242, 0.35));
            }
          }
          .${uid}-pulse {
            animation: ${animated && isDark ? `ph-comm-pulse-${uid} 4s cubic-bezier(0.16, 1, 0.3, 1) infinite` : 'none'};
          }
        `}</style>
      </defs>

      {/* ─── Squircle Tile Container (if showTile) ─── */}
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
            stroke={isDark ? '#384959' : '#BDDDFC'}
            strokeWidth="2"
            filter={isDark ? undefined : `url(#${uid}-shadow)`}
          />

          {/* Inner bezel highlight ring */}
          <rect
            x="8.5"
            y="8.5"
            width="103"
            height="103"
            rx="23.5"
            fill="none"
            stroke={isDark ? 'rgba(136, 189, 242, 0.25)' : 'rgba(106, 137, 167, 0.18)'}
            strokeWidth="1.2"
          />
        </g>
      )}

      {/* ─── Community Topology Vector Network ─── */}
      {/* Precision coordinates carefully inset so all 7 satellites fit safely inside the squircle tile */}
      <g
        className={isDark ? `${uid}-pulse` : undefined}
        filter={isDark && animated ? `url(#${uid}-glow)` : undefined}
      >
        {/* Connector Spokes */}
        <g
          stroke={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
          strokeWidth="7"
          strokeLinecap="round"
        >
          {/* Central Hub (60,60) to 7 Inset Satellite Spokes */}
          <line x1="60" y1="60" x2="88" y2="28" />
          <line x1="60" y1="60" x2="44" y2="34" />
          <line x1="60" y1="60" x2="28" y2="62" />
          <line x1="60" y1="60" x2="94" y2="60" />
          <line x1="60" y1="60" x2="62" y2="88" />
          <line x1="60" y1="60" x2="32" y2="94" />
          <line x1="60" y1="60" x2="90" y2="90" />
        </g>

        {/* Central Hub Node */}
        <circle
          cx="60"
          cy="60"
          r="11"
          fill={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
        />

        {/* 7 Satellite Nodes (all cleanly inset within squircle padding) */}
        <circle
          cx="88"
          cy="28"
          r="7.5"
          fill={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
        />
        <circle
          cx="44"
          cy="34"
          r="7"
          fill={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
        />
        <circle
          cx="28"
          cy="62"
          r="7"
          fill={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
        />
        <circle
          cx="94"
          cy="60"
          r="7"
          fill={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
        />
        <circle
          cx="62"
          cy="88"
          r="7"
          fill={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
        />
        <circle
          cx="32"
          cy="94"
          r="7.5"
          fill={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
        />
        <circle
          cx="90"
          cy="90"
          r="7.5"
          fill={
            isDark
              ? palette === 'emerald'
                ? `url(#${uid}-node-dark-emerald)`
                : `url(#${uid}-node-dark-brand)`
              : palette === 'emerald'
                ? `url(#${uid}-node-light-emerald)`
                : `url(#${uid}-node-light-brand)`
          }
        />
      </g>
    </svg>
  );
};

export const CommunityLogo: React.FC<CommunityLogoProps> = ({
  variant = 'tile',
  size = 'md',
  theme = 'auto',
  palette = 'brand',
  showTile = true,
  animated = true,
  className = '',
  ariaLabel = 'PromptHub Community',
  onClick,
  subtitle = 'Global Prompt Network',
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40;

  if (variant === 'icon') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <CommunityVectorSymbol
          size={pixelSize}
          theme={theme}
          palette={palette}
          showTile={false}
          animated={animated}
          ariaLabel={ariaLabel}
        />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border border-border-default bg-bg-secondary text-text-primary shadow-xs transition-colors hover:border-brand-primary/40 shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <CommunityVectorSymbol
          size={Math.max(16, Math.round(pixelSize * 0.55))}
          theme={theme}
          palette={palette}
          showTile={false}
          animated={false}
          ariaLabel={ariaLabel}
        />
        <span className="font-semibold tracking-tight">Community</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-3.5 select-none shrink-0 ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      >
        <CommunityVectorSymbol
          size={pixelSize}
          theme={theme}
          palette={palette}
          showTile={showTile}
          animated={animated}
          ariaLabel={ariaLabel}
        />
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-extrabold tracking-tight text-text-primary leading-tight text-base sm:text-lg">
              Community
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-brand-primary/10 text-brand-primary dark:text-brand-accent dark:bg-brand-primary/25 border border-brand-primary/25">
              Hub
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] font-sans text-text-secondary leading-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default: 'tile'
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <CommunityVectorSymbol
        size={pixelSize}
        theme={theme}
        palette={palette}
        showTile={showTile}
        animated={animated}
        ariaLabel={ariaLabel}
      />
    </div>
  );
};
