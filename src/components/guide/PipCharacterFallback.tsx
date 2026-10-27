/**
 * PromptHub Assistant Icon (Pip)
 * 
 * Clean, high-craft developer studio assistant mark.
 * Replaces cartoonish robot visors with a precision-crafted geometric sapphire
 * AI spark emblem with micro-interactions for idle, hover, thinking, and celebrate states.
 * 
 * Zero external asset dependencies, 60fps vector rendering, full high-contrast theme support.
 */

import React from 'react';

export type PipMood = 'idle' | 'hover' | 'wave' | 'thinking' | 'celebrate' | 'attentive';

export interface PipCharacterProps {
  /** Current expressive state */
  mood?: PipMood;
  /** Size dimension in pixels (default 48) */
  size?: number;
  /** Custom class name */
  className?: string;
  /** Click action */
  onClick?: () => void;
  /** Accessible label */
  ariaLabel?: string;
}

export const PipCharacterFallback: React.FC<PipCharacterProps> = ({
  mood = 'idle',
  size = 48,
  className = '',
  onClick,
  ariaLabel = 'PromptHub Assistant',
}) => {
  const isThinking = mood === 'thinking';
  const isCelebrate = mood === 'celebrate';
  const isHover = mood === 'hover';

  return (
    <div
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full overflow-visible transition-all duration-300 ${
          isThinking ? 'animate-pulse' : ''
        }`}
      >
        <defs>
          {/* Jewel Body Gradient */}
          <linearGradient id="ph-assist-gem" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Internal Glow Gradient */}
          <radialGradient id="ph-assist-core" cx="32" cy="32" r="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </radialGradient>

          {/* Specular Edge Highlight */}
          <linearGradient id="ph-assist-rim" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#93C5FD" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.1" />
          </linearGradient>

          {/* Shadow Filter */}
          <filter id="ph-assist-shadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1E3A8A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Outer Hex-Shield Container */}
        <g filter="url(#ph-assist-shadow)">
          <rect
            x="8"
            y="8"
            width="48"
            height="48"
            rx="16"
            fill="url(#ph-assist-gem)"
            stroke="url(#ph-assist-rim)"
            strokeWidth="1.5"
            className="transition-all duration-200"
          />

          {/* Ambient Core Lighting */}
          <circle cx="32" cy="32" r="20" fill="url(#ph-assist-core)" />

          {/* Top Edge Light Reflection */}
          <path
            d="M 18 13 C 26 11, 38 11, 46 13"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Central Luminous AI Sparkle */}
        <g
          transform={`translate(32 32) scale(${isHover ? 1.1 : isCelebrate ? 1.15 : 1}) translate(-32 -32)`}
          className="transition-transform duration-200"
        >
          {/* Radiant 4-Point Star */}
          <path
            d="M 32 18 C 32 26 38 32 46 32 C 38 32 32 38 32 46 C 32 38 26 32 18 32 C 26 32 32 26 32 18 Z"
            fill="#FFFFFF"
            className="drop-shadow-sm"
          />

          {/* Core Star Highlight */}
          <circle cx="32" cy="32" r="2.5" fill="#BFDBFE" />

          {/* Satellite Sparkle 1 (Top-Right) */}
          <circle
            cx="44"
            cy="20"
            r={isCelebrate ? 2 : 1.5}
            fill={isCelebrate ? "#FDE047" : "#FFFFFF"}
            opacity={isCelebrate ? 1 : 0.85}
          />

          {/* Satellite Sparkle 2 (Bottom-Left) */}
          <circle
            cx="20"
            cy="44"
            r={isCelebrate ? 2 : 1.5}
            fill={isCelebrate ? "#A7F3D0" : "#93C5FD"}
            opacity={isCelebrate ? 1 : 0.75}
          />
        </g>
      </svg>
    </div>
  );
};

export default PipCharacterFallback;
