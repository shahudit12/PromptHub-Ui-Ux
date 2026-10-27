/**
 * PromptHub — Central Animation Primitives
 * Single source of truth for all Framer Motion variants, easing, and motion hooks.
 *
 * GPU-only rule: all variants animate only `transform` (y, scale) and `opacity`.
 * Never animate color, background-color, height, width, margin, or padding here.
 */

import { useEffect, useRef, useState } from 'react';

// ─── Core Easing ─────────────────────────────────────────────────────────────
/** Quartic ease-out — matches cubic-bezier(0.16, 1, 0.3, 1) in CSS */
export const EASE = [0.16, 1, 0.3, 1] as const;

// ─── Duration Map (seconds — Framer Motion uses seconds) ─────────────────────
export const DURATION = {
  micro:       0.15,  // hover, focus, button states
  microMax:    0.20,  // slower micro interactions
  reveal:      0.35,  // scroll-triggered entrance (min)
  revealMax:   0.50,  // scroll-triggered entrance (max)
  page:        0.30,  // route transitions
  stagger:     0.06,  // per-card stagger delay (60ms)
  listStagger: 0.04,  // per-list-item stagger (40ms)
  wordStagger: 0.08,  // per-word stagger in hero H1 (80ms)
} as const;

// ─── Shared Framer Motion Variants ───────────────────────────────────────────

/** Single element fade-up — used for scroll-triggered reveals */
export const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.reveal, ease: EASE },
  },
} as const;

/** Container that staggers card-grid children at 60ms each */
export const cardGrid = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: DURATION.stagger,
    },
  },
} as const;

/** Card item inside a cardGrid container — y:20→0 */
export const cardItem = {
  hidden:  { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE },
  },
} as const;

/** Container that staggers list items at 40ms each */
export const listStagger = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: DURATION.listStagger,
    },
  },
} as const;

/** List item inside a listStagger container — y:12→0 */
export const listItem = {
  hidden:  { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE },
  },
} as const;

/** Hero section container — word-by-word stagger at 80ms */
export const heroSequence = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: DURATION.wordStagger,
    },
  },
} as const;

/** Individual hero word/element inside heroSequence — y:16→0 */
export const heroWord = {
  hidden:  { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE },
  },
} as const;

/**
 * Hero element with explicit delay — for the timed hero sequence.
 * Each section (eyebrow, subtitle, CTAs, social proof) gets its own delay.
 */
export const heroElement = (delaySeconds: number) => ({
  hidden:  { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE, delay: delaySeconds },
  },
});

/**
 * Hero element with scale-in — for CTA buttons at t=800ms.
 */
export const heroScaleIn = (delaySeconds: number) => ({
  hidden:  { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EASE, delay: delaySeconds },
  },
});

/**
 * Page-level transition object.
 * Exit: slide up 8px + fade. Enter: come from 8px below + fade in.
 */
export const pageTransition = {
  initial:    { opacity: 0, y: 8 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -8 },
  transition: { duration: DURATION.page, ease: EASE },
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Returns `true` if the user prefers reduced motion.
 * Reactive — updates when the OS setting changes.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

/**
 * Animates a number from 0 to `target` over `duration` ms using
 * quartic ease-out. Only starts when `start` is true.
 */
export function useCountUp(
  target: number,
  duration = 600,
  start = false,
): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!start) return;
    if (reduced) { setValue(target); return; }

    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Quartic ease-out: 1 - (1-t)^4
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, start, reduced]);

  useEffect(() => {
    if (!start) setValue(0);
  }, [start]);

  return value;
}

/**
 * Returns motion-safe Framer Motion variants.
 * Collapses all transitions to instant when reduced motion is preferred.
 */
export function useMotionVariants<
  T extends Record<string, { opacity?: number; y?: number; scale?: number; transition?: object }>,
>(variants: T): T {
  const reduced = useReducedMotion();
  if (!reduced) return variants;

  const safe: Record<string, any> = {};
  for (const key of Object.keys(variants)) {
    const v = variants[key] as any;
    safe[key] = {
      opacity: v.opacity ?? 1,
      y: 0,
      scale: 1,
      transition: { duration: 0 },
    };
  }
  return safe as T;
}
