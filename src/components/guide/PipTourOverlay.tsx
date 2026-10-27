/**
 * Pip — PromptHub Tour Spotlight Overlay
 * 
 * Interactive spotlight overlay:
 * - Computes dynamic bounding rect of target identified by data-tour attribute
 * - Smoothly scrolls target into view
 * - Viewport-bounded callout card with Pip miniature avatar
 * - Step progress indicator (Step X of Y)
 * - Back, Next, Skip, and Exit controls
 * - Zero automatic credit spend, zero API calls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGuide } from '../../context/GuideContext';
import { useApp } from '../../context/AppContext';
import { PipCharacter } from './PipCharacter';
import { X, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export const PipTourOverlay: React.FC = () => {
  const {
    activeTour,
    currentStepIndex,
    currentStep,
    nextTourStep,
    prevTourStep,
    exitTour,
  } = useGuide();

  const { activeTab: currentAppTab, setActiveTab: setAppTab } = useApp();

  const cardRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTargetMissing, setIsTargetMissing] = useState(false);
  const [calloutCoords, setCalloutCoords] = useState<{ top: number; left: number; width?: number }>({ top: 14, left: 14 });

  // Measure target element position
  const updateTargetPosition = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      setIsTargetMissing(false);
      return;
    }

    const targetEl = document.querySelector(currentStep.targetSelector);
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);
      setIsTargetMissing(false);
      // Auto-scroll target into view if outside viewport
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetRect(null);
      setIsTargetMissing(true);
    }
  }, [currentStep]);

  // Recalculate callout position relative to target rect with strict viewport boundary clamping
  const updateCalloutPosition = useCallback(() => {
    if (!targetRect || isTargetMissing || !currentStep) return;

    const margin = 14;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardEl = cardRef.current;
    const cardWidth = Math.min(360, viewportWidth - 2 * margin);
    const cardHeight = cardEl && cardEl.offsetHeight > 0 ? cardEl.offsetHeight : 340;

    let top: number;
    let left = targetRect.left + (targetRect.width - cardWidth) / 2;

    const placement = currentStep.placement || 'auto';
    const spaceBelow = viewportHeight - targetRect.bottom - margin;
    const spaceAbove = targetRect.top - margin;

    if (placement === 'top') {
      top = spaceAbove >= cardHeight || spaceAbove > spaceBelow
        ? targetRect.top - cardHeight - margin
        : targetRect.bottom + margin;
    } else if (placement === 'bottom') {
      top = spaceBelow >= cardHeight || spaceBelow > spaceAbove
        ? targetRect.bottom + margin
        : targetRect.top - cardHeight - margin;
    } else {
      // Auto: prefer below if room, otherwise above
      if (spaceBelow >= cardHeight) {
        top = targetRect.bottom + margin;
      } else if (spaceAbove >= cardHeight) {
        top = targetRect.top - cardHeight - margin;
      } else {
        top = spaceBelow >= spaceAbove ? targetRect.bottom + margin : targetRect.top - cardHeight - margin;
      }
    }

    // Clamp coordinates strictly within viewport so the callout NEVER clips off-screen
    const maxTop = Math.max(margin, viewportHeight - cardHeight - margin);
    const maxLeft = Math.max(margin, viewportWidth - cardWidth - margin);
    top = Math.max(margin, Math.min(top, maxTop));
    left = Math.max(margin, Math.min(left, maxLeft));

    setCalloutCoords({ top, left, width: cardWidth });
  }, [targetRect, isTargetMissing, currentStep]);

  // Recalculate on step change, resize, and scroll
  useEffect(() => {
    updateTargetPosition();
    const handleScrollOrResize = () => {
      updateTargetPosition();
      updateCalloutPosition();
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });

    const timeout = setTimeout(() => {
      updateTargetPosition();
      updateCalloutPosition();
    }, 150);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
      clearTimeout(timeout);
    };
  }, [updateTargetPosition, updateCalloutPosition, currentStepIndex]);

  // Update callout coords when targetRect changes
  useEffect(() => {
    updateCalloutPosition();
  }, [targetRect, updateCalloutPosition]);

  // Keyboard navigation for tour: ArrowRight = Next, ArrowLeft = Back, Escape = Exit
  useEffect(() => {
    if (!activeTour) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitTour();
      if (e.key === 'ArrowRight') nextTourStep();
      if (e.key === 'ArrowLeft') prevTourStep();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, nextTourStep, prevTourStep, exitTour]);

  // Automatically navigate to required route if tour step requires another page
  useEffect(() => {
    if (!activeTour || !currentStep) return;
    if (currentStep.requiredRoute && currentStep.requiredRoute !== currentAppTab) {
      setAppTab(currentStep.requiredRoute);
    }
  }, [activeTour, currentStep, currentAppTab, setAppTab]);

  if (!activeTour || !currentStep) return null;

  const totalSteps = activeTour.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;
  const isCentered = !targetRect || isTargetMissing;

  const renderCardContent = () => (
    <>
      {/* Header: Step Count & Exit */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-[#1C2B3A]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
            <PipCharacter size={24} mood="attentive" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary dark:text-[#41A2D9] block truncate">
              {activeTour.title}
            </span>
            <div className="text-[11px] font-medium text-slate-400 dark:text-[#7E97AD]">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={exitTour}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#131D27] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          title="Exit tour"
          aria-label="Exit tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step Body */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          {currentStep.title}
        </h4>

        <p className="text-xs text-slate-600 dark:text-[#C5D7E8] leading-relaxed font-normal">
          {currentStep.instruction}
        </p>

        {currentStep.actionHint && (
          <div className="p-2 rounded-lg bg-blue-50/70 dark:bg-[#131D27] text-[11px] text-brand-primary dark:text-[#41A2D9] font-medium flex items-center gap-1.5">
            <span>💡</span>
            <span>{currentStep.actionHint}</span>
          </div>
        )}

        {/* Missing Target Fallback Notice */}
        {isTargetMissing && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
            <p>This control is located on the {currentStep.requiredRoute.toUpperCase()} page.</p>
            {currentAppTab !== currentStep.requiredRoute && (
              <button
                type="button"
                onClick={() => setAppTab(currentStep.requiredRoute)}
                className="mt-2 min-h-[44px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Go to {currentStep.requiredRoute}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Step Progress Dots & Action Buttons */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-[#1C2B3A]">
        {/* Progress Dots */}
        <div className="flex items-center gap-1.5">
          {activeTour.steps.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 rounded-full transition-all duration-200 ${
                idx === currentStepIndex
                  ? 'w-5 bg-brand-primary dark:bg-[#41A2D9]'
                  : idx < currentStepIndex
                  ? 'w-2 bg-blue-300 dark:bg-[#0B60B0]'
                  : 'w-2 bg-slate-200 dark:bg-[#1A242E]'
              }`}
            />
          ))}
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              type="button"
              onClick={prevTourStep}
              className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#C5D7E8] hover:bg-slate-100 dark:hover:bg-[#131D27] transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={nextTourStep}
            className="min-h-[44px] px-4 py-1.5 rounded-xl bg-brand-primary hover:bg-blue-700 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <span>{isLastStep ? 'Complete' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tour: ${activeTour.title}`}
      className="fixed inset-0 z-[100] pointer-events-none select-none"
    >
      {/* ─── Dark Cutout Backdrop ─── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="pip-spotlight-mask">
            {/* White covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout reveals target */}
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Shaded backdrop */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#pip-spotlight-mask)"
        />
      </svg>

      {/* Target Highlight Ring */}
      {targetRect && (
        <div
          className="absolute pointer-events-none rounded-2xl ring-4 ring-brand-primary/50 shadow-2xl transition-all duration-300 animate-pulse"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* ─── Tour Callout Bubble: Either Centered or Viewport-Clamped Target Bubble ─── */}
      {isCentered ? (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[360px] max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] shadow-2xl p-4 sm:p-5 text-left font-sans pointer-events-auto select-text"
          >
            {renderCardContent()}
          </motion.div>
        </div>
      ) : (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            top: `${calloutCoords.top}px`,
            left: `${calloutCoords.left}px`,
            width: calloutCoords.width ? `${calloutCoords.width}px` : undefined,
          }}
          className="fixed w-[calc(100vw-2rem)] sm:w-[360px] max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] shadow-2xl p-4 sm:p-5 text-left font-sans pointer-events-auto select-text z-[101]"
        >
          {renderCardContent()}
        </motion.div>
      )}
    </div>
  );
};

export default PipTourOverlay;
