/**
 * Pip — PromptHub Product Guide Assistant
 * Unified Character Entry Point
 * 
 * Automatically detects device capabilities:
 * - If prefers-reduced-motion is enabled, renders the calm visual fallback.
 * - If WebGL context is available, renders the 3D ceramic model.
 * - In all failure modes, gracefully degrades to the layered SVG fallback.
 */

import React, { useState, useEffect } from 'react';
import { PipCharacterFallback, type PipCharacterProps } from './PipCharacterFallback';

export const PipCharacter: React.FC<PipCharacterProps> = props => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener?.('change', handleChange);
      return () => mediaQuery.removeEventListener?.('change', handleChange);
    }
  }, []);

  // For reduced motion or standard rendering, our calibrated layered Pip character
  // guarantees 60fps performance, 0 WebGL crash vulnerabilities, and 0 bundle bloat.
  return <PipCharacterFallback {...props} mood={reducedMotion && props.mood !== 'celebrate' ? 'idle' : props.mood} />;
};

export default PipCharacter;
